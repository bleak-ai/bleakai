import {BaseMessage, type MessageType} from "@langchain/core/messages";

export interface StreamEvent {
  type: "content" | "tool_call" | "done" | "error";
  content?: string;
  toolName?: string;
  toolArgs?: any;
  error?: string;
}

export interface BleakaiConfig<TTool> {
  tools?: Record<string, TTool>;
  apiUrl?: string;
}

export interface CustomToolProps {
  args: unknown;
  onResume: (resumeData: string) => Promise<void>;
}

export interface ProcessedResponse<TTool> {
  type: MessageType;
  message?: BaseMessage;
  toolName?: string;
  args?: Record<string, any>;
  content?: string | any;
  tool?: TTool;
  error?: unknown;
}

function* processMessagesData(messages: any[]): Generator<StreamEvent> {
  for (const item of messages) {
    if (item.lc === 1 && item.type === "constructor" && item.kwargs) {
      console.log("Processing item:", item);
      const kwargs = item.kwargs;

      // Handle tool calls
      const toolCalls = kwargs.tool_calls || [];
      for (const toolCall of toolCalls) {
        if (toolCall.name && toolCall.args) {
          yield {
            type: "tool_call",
            toolName: toolCall.name,
            toolArgs: toolCall.args
          };
        }
      }

      // Handle regular content
      if (
        kwargs.content &&
        typeof kwargs.content === "string" &&
        kwargs.content.trim()
      ) {
        yield {
          type: "content",
          content: kwargs.content.trim()
        };
      }
    }
  }
}

export class Thread<TTool> {
  private bleakai: Bleakai<TTool>;
  private threadId: string;

  constructor(bleakai: Bleakai<TTool>, threadId: string) {
    this.bleakai = bleakai;
    this.threadId = threadId;
  }

  getId(): string {
    return this.threadId;
  }

  async *sendMessage(
    input: string,
    requestBody?: any
  ): AsyncGenerator<StreamEvent> {
    const apiUrl = this.bleakai.getApiUrl();
    const url = `${apiUrl}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(requestBody || {input})
    });

    if (!response.ok) {
      yield {type: "error", error: `HTTP error! status: ${response.status}`};
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      yield {type: "error", error: "Response body is not readable"};
      return;
    }

    let accumulatedContent = "";

    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, {stream: true});
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.trim()) {
            try {
              // Skip SSE comments and empty lines
              if (line.startsWith(":")) continue;

              // Parse SSE data lines (remove "data: " prefix)
              let jsonResponse = line;
              if (line.startsWith("data: ")) {
                jsonResponse = line.substring(6);
              }

              const response = JSON.parse(jsonResponse);

              if (response.type === "done") {
                if (accumulatedContent.trim()) {
                  yield {type: "content", content: accumulatedContent.trim()};
                }
                yield {type: "done"};
                return;
              } else if (response.type === "error") {
                yield {
                  type: "error",
                  error: response.error || "An unknown error occurred"
                };
                return;
              } else if (Array.isArray(response)) {
                const [type, data] = response;
                console.log("Received data:", data);
                console.log("Received type:", type);

                switch (type) {
                  case "messages":
                    accumulatedContent = "";
                    yield* processMessagesData(data);
                    break;
                  case "updates":
                    const innerMessages = Object.values(data)[0]?.messages;
                    console.log("update!", innerMessages);
                    yield* processMessagesData(innerMessages);
                }
              }
            } catch (parseError) {
              console.error("Failed to parse stream data:", parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export class Bleakai<TTool> {
  private tools: Record<string, TTool>;
  private apiUrl: string;

  constructor(config: BleakaiConfig<TTool> = {}) {
    this.tools = config.tools || {};
    this.apiUrl = config.apiUrl || "http://localhost:8000";
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  createThread(threadId: string): Thread<TTool> {
    return new Thread(this, threadId);
  }

  getTools(): Record<string, TTool> {
    return this.tools;
  }
}
