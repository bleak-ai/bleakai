export interface BleakaiConfig<TTool> {
  url: string;
  headers?: Record<string, string>;
  tools?: Record<string, TTool>;
  thread_id?: string;
}

export interface StreamRequest {
  input: string;
  command?: {
    resume?: string;
  };
  thread_id?: string;
  retry?: boolean;
}

export interface CustomToolProps {
  args: any;
  onCommand: (resumeData: string) => Promise<void>;
}

export type ResponseType = "tool_call" | "message" | "error" | "other";
export type MessageSender = "user" | "ai" | "system";

export interface ProcessedResponse<TTool> {
  type: ResponseType;
  toolName?: string;
  args?: any;
  data?: any;
  error?: any;
  rawResponse?: any;
  tool?: TTool;
  content?: string;
  sender?: MessageSender;
}
export class Bleakai<TTool> {
  private endpoint: string;
  private headers: Record<string, string>;
  private tools: Record<string, TTool>;
  private thread_id?: string;

  constructor(config: BleakaiConfig<TTool>) {
    this.endpoint = config.url;
    this.headers = config.headers || {};
    this.tools = config.tools || {};
    this.thread_id = config.thread_id;
  }

  /** Send a message with the given input text */
  async sendMessage(input: string): Promise<ProcessedResponse<TTool>[]> {
    return this._request({input});
  }

  /** Resume a previous session with the given resume data */
  async resume(resumeData: string): Promise<ProcessedResponse<TTool>[]> {
    return this._request({input: "", command: {resume: resumeData}});
  }

  /** Retry the last request */
  async retry(): Promise<ProcessedResponse<TTool>[]> {
    return this._request({input: "", retry: true});
  }

  /** Private method to handle all request types */
  private async _request(
    request: StreamRequest
  ): Promise<ProcessedResponse<TTool>[]> {
    return this.stream(request);
  }

  /** Non-streaming: waits for full response */
  async stream(request: StreamRequest): Promise<ProcessedResponse<TTool>[]> {
    // Include thread_id in the request if it exists
    const requestWithThreadId = {
      ...request,
      thread_id: request.thread_id || this.thread_id
    };

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {"Content-Type": "application/json", ...this.headers},
        body: JSON.stringify(requestWithThreadId)
      });

      // Check HTTP status
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const text = await response.text();
      return this.processChunk(text);
    } catch (error) {
      // Return error as ProcessedResponse for consistent handling
      return [
        {
          type: "error",
          error: error instanceof Error ? error.message : String(error),
          rawResponse: null
        }
      ];
    }
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
    // Handle direct error format {error: "...", type: "error"}
    if (response?.error) {
      return {
        type: "error",
        data: response,
        error: response.error,
        rawResponse: response
      };
    }

    // 1️⃣ Extract the top-level key and content safely
    const key = Object.keys(response ?? {})[0];
    const content = response?.[key];

    if (!content) {
      console.warn("parseResponse: Missing or invalid content:", response);
      return null;
    }

    try {
      // 2️⃣ Extract possible data
      const toolCalls = this.extractToolCalls(content);

      // 3️⃣ Handle tool call responses
      if (toolCalls.length > 0) {
        const {name, args} = toolCalls[0];
        const tool = this.tools?.[name];
        return this.createToolCallResponse(response, content, name, args, tool);
      }

      const messageContent = this.extractContent(content);

      // 4️⃣ Handle message responses
      if (messageContent) {
        return this.createMessageResponse(response, content, messageContent);
      }

      // 5️⃣ Handle unrecognized responses
      return this.createOtherResponse(response, content);
    } catch (error) {
      console.error("parseResponse: Error while processing response:", error);
      return this.createErrorResponse(response, error);
    }
  }

  /**
   * Extracts tool calls from response content
   * @param content - The response content containing messages
   * @returns Array of tool calls with name and args
   */
  private extractToolCalls(content: any): {name: string; args: any}[] {
    const messages = content?.messages ?? [];

    if (!Array.isArray(messages)) {
      return [];
    }

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

  /**
   * Extracts content from response messages
   * @param content - The response content containing messages
   * @returns Extracted content string or null if not found
   */
  private extractContent(content: any): string | null {
    const rawMessages = content?.messages;
    const messages = Array.isArray(rawMessages)
      ? rawMessages
      : Array.isArray(rawMessages?.value)
      ? rawMessages.value
      : [];

    if (!Array.isArray(messages)) return null;

    try {
      for (const msg of messages) {
        const extractedContent = msg?.kwargs?.content ?? msg?.content;
        if (typeof extractedContent === "string" && extractedContent.trim()) {
          return extractedContent.trim();
        }
      }
      return null;
    } catch (err) {
      console.error("Error extracting content:", err);
      return null;
    }
  }

  private createMessageResponse(
    raw: any,
    data: any,
    content: string
  ): ProcessedResponse<TTool> {
    return {type: "message", data, content, rawResponse: raw, sender: "ai"};
  }

  private createOtherResponse(raw: any, data: any): ProcessedResponse<TTool> {
    return {type: "other", data, rawResponse: raw};
  }

  private createErrorResponse(raw: any, error: any): ProcessedResponse<TTool> {
    return {type: "error", error, rawResponse: raw};
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
