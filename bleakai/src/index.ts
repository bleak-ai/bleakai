import {BaseMessage, type MessageType} from "@langchain/core/messages";

// Single graph update from astream()
interface GraphUpdate {
  [nodeKey: string]: {
    messages?: BaseMessage[];
  };
}

// Array of updates from the backend
type StreamResponse = GraphUpdate[];

export interface BleakaiConfig<TTool> {
  tools?: Record<string, TTool>;
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
}

export class Bleakai<TTool> {
  private tools: Record<string, TTool>;

  constructor(config: BleakaiConfig<TTool>) {
    this.tools = config.tools || {};
  }

  createThread(threadId: string): Thread<TTool> {
    return new Thread(this, threadId);
  }

  
  async handleCustomRequest(
    responsePromise: Promise<Response>
  ): Promise<ProcessedResponse<TTool>[]> {
    try {
      const response = await responsePromise;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const text = await response.text();
      return this.processChunk(text);
    } catch (error) {
      console.error("Error handling custom request:", error);
      return [
        {
          type: "error",
          error: error instanceof Error ? error.message : String(error)
        }
      ];
    }
  }

  private processChunk(chunk: string): ProcessedResponse<TTool>[] {
    let data: StreamResponse | GraphUpdate;
    try {
      data = JSON.parse(chunk);
    } catch {
      console.warn("Skipping invalid JSON chunk:", chunk);
      return [];
    }

    // Handle both array format (multiple updates) and single update
    const items = Array.isArray(data) ? data : [data];
    return items
      .flatMap((item) => this.parseUpdate(item))
      .filter(Boolean) as ProcessedResponse<TTool>[];
  }

  private parseUpdate(update: GraphUpdate): ProcessedResponse<TTool>[] {
    const responses: ProcessedResponse<TTool>[] = [];

    for (const [nodeKey, nodeOutput] of Object.entries(update)) {
      if (!nodeOutput || !nodeOutput.messages) {
        continue;
      }
      const messages = nodeOutput.messages;

      if (!Array.isArray(messages)) {
        continue;
      }

      for (const message of messages) {
        const messageRaw = message as any; // Access raw JSON object for kwargs
        const toolCalls = this.getToolCalls(messageRaw);

        if (toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            responses.push({
              type: "tool_call",
              message,
              toolName: toolCall.name,
              args: toolCall.args,
              tool: this.tools?.[toolCall.name]
            });
          }
        } else if (
          typeof message.content === "string" &&
          message.content.trim()
        ) {
          responses.push({
            type: "message",
            message,
            content: message.content.trim()
          });
        } else {
          responses.push({
            type: "other",
            message,
            content: messageRaw.kwargs.content
          });
        }
      }
    }

    return responses.length > 0 ? responses : [];
  }

  private getToolCalls(
    message: any // Raw JSON object
  ): Array<{name: string; args: Record<string, any>}> {
    const toolCalls = message.kwargs?.tool_calls || [];

    return toolCalls
      .filter((tc: any) => tc.name && tc.args)
      .map((tc: any) => ({
        name: tc.name,
        args: tc.args as Record<string, any>
      }));
  }
}
