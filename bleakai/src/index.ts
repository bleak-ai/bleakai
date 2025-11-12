import {BaseMessage, type MessageType} from "@langchain/core/messages";

export interface ConversationEvent {
  type: "input" | "tool_call" | "error";
  content?: string;
  toolName?: string;
  toolArgs?: any;
  tool?: any;
  error?: string;
}

export interface BleakAIConfig {
  tools?: Record<string, any>;
  apiUrl?: string;
}

export interface ToolExecutionProps {
  args: any;
  onResume: (resumeData: string) => Promise<void>;
}

export interface EventHandlers {
  onInput?: (content: string) => void | Promise<void>;
  onToolCall?: (toolName: string, toolArgs: any) => void | Promise<void>;
  onError?: (error: string) => void | Promise<void>;
}

export interface ConversationResponse {
  type: MessageType;
  message?: BaseMessage;
  toolName?: string;
  args?: Record<string, any>;
  content?: string | any;
  tool?: any;
  error?: unknown;
}

function* parseLangChainEvents(messages: any[]): Generator<ConversationEvent> {
  for (const item of messages) {
    if (item.lc === 1 && item.type === "constructor" && item.kwargs) {
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
          type: "input",
          content: kwargs.content.trim()
        };
      }
    }
  }
}

export class Conversation {
  private bleakAI: BleakAI;
  private conversationId: string;

  constructor(bleakAI: BleakAI, conversationId: string) {
    this.bleakAI = bleakAI;
    this.conversationId = conversationId;
  }

  getId(): string {
    return this.conversationId;
  }

  async *sendInput(
    input: string,
    url: string,
    requestBody?: any
  ): AsyncGenerator<ConversationEvent> {
    const apiUrl = this.bleakAI.getApiUrl();

    const response = await fetch(`${apiUrl}/${url}`, {
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
                // DO NOTHING

                // if (accumulatedContent.trim()) {
                //   yield {type: "message", content: accumulatedContent.trim()};
                // }
                // yield {type: "done"};
                return;
              } else if (response.type === "error") {
                yield {
                  type: "error",
                  error: response.error || "An unknown error occurred"
                };
                return;
              } else if (Array.isArray(response)) {
                const [type, data] = response;

                switch (type) {
                  case "messages":
                    accumulatedContent = "";
                    yield* parseLangChainEvents(data);
                    break;
                  case "updates":
                    const nodeName = Object.values(data)[0];
                    const innerMessages =
                      nodeName &&
                      typeof nodeName === "object" &&
                      "messages" in nodeName
                        ? nodeName.messages
                        : undefined;
                    if (innerMessages && Array.isArray(innerMessages)) {
                      yield* parseLangChainEvents(innerMessages);
                    }
                    break;
                }
              } else {
                // Handle raw LangChain messages (for resume endpoints)
                yield* parseLangChainEvents([response]);
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

  async processEvents(
    input: string,
    url: string,
    requestBody?: any
  ): Promise<ConversationResponse[]> {
    const responses: ConversationResponse[] = [];

    for await (const event of this.sendInput(input, url, requestBody)) {
      switch (event.type) {
        case "input":
          if (event.content && event.content.trim()) {
            responses.push({
              type: "ai",
              content: event.content
            });
          }
          break;
        case "tool_call":
          if (event.toolName && event.toolArgs) {
            const tool = this.bleakAI.getTools()[event.toolName];
            responses.push({
              type: "tool_call",
              toolName: event.toolName,
              args: event.toolArgs,
              tool
            });
          }
          break;
        case "error":
          responses.push({
            type: "error",
            error: event.error
          });
          break;
      }
    }

    return responses;
  }
}

export class EventHandler {
  private handlers: EventHandlers = {};

  onInput(callback: (content: string) => void | Promise<void>): this {
    this.handlers.onInput = callback;
    return this;
  }

  onToolCall(
    callback: (toolName: string, toolArgs: any) => void | Promise<void>
  ): this {
    this.handlers.onToolCall = callback;
    return this;
  }

  onError(callback: (error: string) => void | Promise<void>): this {
    this.handlers.onError = callback;
    return this;
  }

  getHandlers(): EventHandlers {
    return {...this.handlers};
  }
}

export class BleakAI {
  private tools: Record<string, any>;
  private apiUrl: string;

  constructor(config: BleakAIConfig = {}) {
    this.tools = config.tools || {};
    this.apiUrl = config.apiUrl || "http://localhost:8000";
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  createConversation(conversationId: string): Conversation {
    return new Conversation(this, conversationId);
  }

  getTools(): Record<string, any> {
    return this.tools;
  }
}
