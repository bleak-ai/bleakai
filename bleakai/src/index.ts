export interface BleakaiConfig<TTool> {
  tools?: Record<string, TTool>;
  requestHandlers: {
    handleMessage: (input: string, threadId?: string) => Promise<Response>;
    handleResume: (resumeData: string, threadId?: string) => Promise<Response>;
    handleRetry: (threadId?: string) => Promise<Response>;
  };
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
  args: unknown;
  onCommand: (resumeData: string) => Promise<void>;
}

export type ResponseType = "tool_call" | "message" | "error" | "other";
export type MessageSender = "user" | "ai" | "system";

// Define the exact shape of API responses
interface ToolCall {
  name: string;
  args: any; // Keep this as 'any' since tool args vary
}

interface ApiMessage {
  kwargs?: {
    content?: string;
    tool_calls?: ToolCall[];
  };
  content?: string;
  tool_calls?: ToolCall[];
}

interface ApiContent {
  messages?: ApiMessage[];
}

type ApiResponse = {
  error?: string;
} & {
  [key: string]: ApiContent;
};

export interface ProcessedResponse<TTool> {
  type: ResponseType;
  toolName?: string;
  args?: any;
  data?: ApiContent | unknown;
  error?: unknown;
  rawResponse?: ApiResponse | null;
  tool?: TTool;
  content?: string;
  sender?: MessageSender;
}

export class Thread<TTool> {
  private bleakai: Bleakai<TTool>;
  private threadId: string;

  constructor(bleakai: Bleakai<TTool>, threadId: string) {
    this.bleakai = bleakai;
    this.threadId = threadId;
  }

  /** Send a message with the given input text */
  async send(input: string): Promise<ProcessedResponse<TTool>[]> {
    return this.bleakai.handleCustomRequest(
      this.bleakai.getRequestHandlers().handleMessage(input, this.threadId)
    );
  }

  /** Resume a previous session with the given resume data */
  async resume(resumeData: string): Promise<ProcessedResponse<TTool>[]> {
    return this.bleakai.handleCustomRequest(
      this.bleakai.getRequestHandlers().handleResume(resumeData, this.threadId)
    );
  }

  /** Retry the last request */
  async retry(): Promise<ProcessedResponse<TTool>[]> {
    return this.bleakai.handleCustomRequest(
      this.bleakai.getRequestHandlers().handleRetry(this.threadId)
    );
  }

  /** Get the thread ID */
  getId(): string {
    return this.threadId;
  }
}
export class Bleakai<TTool> {
  // Response Type Constants
  private static readonly RESPONSE_TYPE_ERROR = "error";
  private static readonly RESPONSE_TYPE_TOOL_CALL = "tool_call";
  private static readonly RESPONSE_TYPE_MESSAGE = "message";
  private static readonly RESPONSE_TYPE_OTHER = "other";

  // Sender Constants
  private static readonly SENDER_AI = "ai";

  // Tool Constants
  private static readonly UNKNOWN_TOOL_NAME = "unknown_tool";

  // API Constants
  private static readonly ERROR_KEY = "error";

  private tools: Record<string, TTool>;
  private requestHandlers: BleakaiConfig<TTool>["requestHandlers"];

  constructor(config: BleakaiConfig<TTool>) {
    this.tools = config.tools || {};
    this.requestHandlers = config.requestHandlers;
  }

  /** Create a new thread with the given thread ID */
  createThread(threadId: string): Thread<TTool> {
    return new Thread(this, threadId);
  }

  /** Get request handlers (accessible to Thread class) */
  getRequestHandlers() {
    return this.requestHandlers;
  }

  /** Handle custom request (accessible to Thread class) */
  async handleCustomRequest(
    responsePromise: Promise<Response>
  ): Promise<ProcessedResponse<TTool>[]> {
    try {
      const response = await responsePromise;

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
          type: Bleakai.RESPONSE_TYPE_ERROR,
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
    let data: ApiResponse | ApiResponse[];
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

  private parseResponse(
    response: ApiResponse
  ): ProcessedResponse<TTool> | null {
    // Handle direct error format {error: "...", type: "error"}
    if (response?.[Bleakai.ERROR_KEY]) {
      return {
        type: Bleakai.RESPONSE_TYPE_ERROR,
        data: response,
        error: response[Bleakai.ERROR_KEY],
        rawResponse: response
      };
    }

    // 1️⃣ Extract the top-level key and content safely
    const keys = Object.keys(response ?? {}).filter(
      (key) => key !== Bleakai.ERROR_KEY
    );
    const key = keys[0];
    const content = key ? response[key] : undefined;

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
  private extractToolCalls(content: ApiContent): ToolCall[] {
    const messages = content?.messages ?? [];

    if (!Array.isArray(messages)) {
      return [];
    }

    try {
      return messages.flatMap((msg: ApiMessage) => {
        const calls = msg?.kwargs?.tool_calls ?? msg?.tool_calls ?? [];
        return calls
          .filter((c): c is ToolCall => !!c?.args) // Type guard
          .map((c) => ({
            name: c.name ?? Bleakai.UNKNOWN_TOOL_NAME,
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
  private extractContent(content: ApiContent): string | null {
    const messages = content?.messages;

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
    raw: ApiResponse,
    data: ApiContent,
    content: string
  ): ProcessedResponse<TTool> {
    return {
      type: Bleakai.RESPONSE_TYPE_MESSAGE,
      data,
      content,
      rawResponse: raw,
      sender: Bleakai.SENDER_AI
    };
  }

  private createOtherResponse(
    raw: ApiResponse,
    data: ApiContent
  ): ProcessedResponse<TTool> {
    return {type: Bleakai.RESPONSE_TYPE_OTHER, data, rawResponse: raw};
  }

  private createErrorResponse(
    raw: ApiResponse | null,
    error: unknown
  ): ProcessedResponse<TTool> {
    return {type: Bleakai.RESPONSE_TYPE_ERROR, error, rawResponse: raw};
  }

  private createToolCallResponse(
    raw: ApiResponse,
    data: ApiContent,
    toolName: string,
    args: any,
    tool?: TTool // <-- Accepts the generic tool
  ): ProcessedResponse<TTool> {
    return {
      type: Bleakai.RESPONSE_TYPE_TOOL_CALL,
      toolName,
      args,
      data,
      rawResponse: raw,
      tool
    };
  }
}
