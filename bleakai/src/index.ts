export interface BleakaiConfig {
  url: string;
  headers?: Record<string, string>;
  toolRegistry?: Record<string, any>;
}

export interface StreamRequest {
  input: string;
  command?: {
    resume?: string;
  };
  thread_id?: string;
}

export interface ProcessedResponse {
  type: "tool_call" | "message" | "error" | "unknown";
  toolName?: string;
  args?: any;
  data?: any;
  error?: any;
  rawResponse?: any;
}

export class Bleakai {
  private endpoint: string;
  private headers: Record<string, string>;
  private toolRegistry: Record<string, any>;

  constructor(config: BleakaiConfig) {
    this.endpoint = config.url;
    this.headers = config.headers || {};
    this.toolRegistry = config.toolRegistry || {};
  }

  /** Non-streaming: waits for full response */
  async stream(request: StreamRequest): Promise<ProcessedResponse[]> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {"Content-Type": "application/json", ...this.headers},
      body: JSON.stringify(request)
    });

    const text = await response.text();
    return this.processChunk(text);
  }

  // -------------------------------
  // Shared internal utilities
  // -------------------------------

  private processChunk(chunk: string): ProcessedResponse[] {
    let data;
    try {
      data = JSON.parse(chunk);
    } catch {
      console.warn("Skipping invalid JSON chunk:", chunk);
      return [];
    }

    const items = Array.isArray(data) ? data : [data];
    return items
      .map((item) => this.parseResponse(item))
      .filter(Boolean) as ProcessedResponse[];
  }

  private parseResponse(response: any): ProcessedResponse | null {
    const key = Object.keys(response)[0];
    const content = response[key];
    const toolCalls = this.extractToolCalls(content);

    if (toolCalls.length === 0) {
      return this.createMessageResponse(response, content);
    }

    const {name, args} = toolCalls[0];
    return this.createToolCallResponse(response, content, name, args);
  }

  private extractToolCalls(content: any): {name: string; args: any}[] {
    const messages = content?.messages ?? [];

    try {
      return messages.flatMap((msg: any) => {
        const calls = msg?.kwargs?.tool_calls ?? msg?.tool_calls ?? [];
        return calls
          .filter((c: any) => c?.args)
          .map((c: any) => ({
            name: c.name ?? "unknown_tool",
            args: c.args
          }));
      });
    } catch (err) {
      console.error("Error extracting tool calls:", err);
      return [];
    }
  }

  private createMessageResponse(raw: any, data: any): ProcessedResponse {
    return {type: "message", data, rawResponse: raw};
  }

  private createToolCallResponse(
    raw: any,
    data: any,
    toolName: string,
    args: any
  ): ProcessedResponse {
    return {type: "tool_call", toolName, args, data, rawResponse: raw};
  }
}
