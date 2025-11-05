export interface BleakaiConfig<TTool> {
  url: string;
  headers?: Record<string, string>;
  tools?: Record<string, TTool>;
}

export interface StreamRequest {
  input: string;
  command?: {
    resume?: string;
  };
  thread_id?: string;
}

export interface CustomToolProps {
  args: any;
  onCommand: (resumeData: string) => Promise<void>;
}

export interface ProcessedResponse<TTool> {
  type: "tool_call" | "message" | "error" | "unknown";
  toolName?: string;
  args?: any;
  data?: any;
  error?: any;
  rawResponse?: any;
  tool?: TTool;
}
export class Bleakai<TTool> {
  private endpoint: string;
  private headers: Record<string, string>;
  private tools: Record<string, TTool>;

  constructor(config: BleakaiConfig<TTool>) {
    this.endpoint = config.url;
    this.headers = config.headers || {};
    this.tools = config.tools || {};
  }

  /** Non-streaming: waits for full response */
  async stream(request: StreamRequest): Promise<ProcessedResponse<TTool>[]> {
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

  private processChunk(chunk: string): ProcessedResponse<TTool>[] {
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
      .filter(Boolean) as ProcessedResponse<TTool>[];
  }

  private parseResponse(response: any): ProcessedResponse<TTool> | null {
    const key = Object.keys(response)[0];
    const content = response[key];
    const toolCalls = this.extractToolCalls(content);

    if (toolCalls.length === 0) {
      return this.createMessageResponse(response, content);
    }

    const {name, args} = toolCalls[0];
    // Look up the generic tool from the registered tools
    const tool = this.tools[name];

    return this.createToolCallResponse(response, content, name, args, tool);
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
  private createMessageResponse(raw: any, data: any): ProcessedResponse<TTool> {
    // Note the explicit return type
    return {type: "message", data, rawResponse: raw};
  }

  private createToolCallResponse(
    raw: any,
    data: any,
    toolName: string,
    args: any,
    tool?: TTool // <-- Accepts the generic tool
  ): ProcessedResponse<TTool> {
    return {type: "tool_call", toolName, args, data, rawResponse: raw, tool};
  }
}
