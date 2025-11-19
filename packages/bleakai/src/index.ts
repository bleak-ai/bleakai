
export interface BleakEvent {
  // Wire protocol events from streaming API
  type: "input" | "tool_call" | "error" | "output" | "interrupt";
  content?: string;
  toolName?: string;
  toolArgs?: any;
  error?: string;
  // Optional: helpful for debugging origin
  id?: string;
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

export type BleakMessage =
  | { type: "text"; role: "user" | "ai"; content: string }
  | { type: "tool"; toolName: string; args: any; toolComponent: any; id: string }
  | { type: "error"; message: string }
  | { type: "interrupt"; content: string };

/**
 * Helper function to create a user message for the UI.
 *
 * @param content - The text content of the user message
 * @returns A BleakMessage representing user input
 */
export function createUserMessage(content: string): BleakMessage {
  return {
    type: "text",
    role: "user",
    content
  };
}

function* extractLangChainEventsFromMessage(
  messages: any[]
): Generator<BleakEvent> {
  console.log("extractLangChainEventsFromMessage messages", messages);

  if (!messages || messages.length === 0) {
    return;
  }

  // Outer loop (handles the top-level array)
  for (const rawItem of messages) {
    // 1. Normalization: Handle both nested arrays [[...]] and flat arrays [{...}]
    // If rawItem is an array, we process its children. If it's an object/string, we process it as a single item array.
    const itemsToProcess = Array.isArray(rawItem) ? rawItem : [rawItem];

    for (const messageItem of itemsToProcess) {
      // 2. Skip Booleans (Example 4: [true])
      if (typeof messageItem === "boolean") {
        continue;
      }

      // 3. Handle Raw Strings (Example 5: ["Based on..."])
      if (typeof messageItem === "string" && messageItem.trim()) {
        console.log("handle raw output", messageItem);
        yield {
          type: "output", // Using new type as requested
          content: messageItem.trim()
        };
        continue;
      }

      // 4. Handle Objects
      if (messageItem && typeof messageItem === "object") {
        // CASE: Interrupts (Example 2)
        if (
          messageItem.type === "not_implemented" &&
          messageItem.id &&
          messageItem.id.includes("Interrupt")
        ) {
          console.log("handle interrupt", messageItem);
          yield {
            type: "interrupt",
            // Returning the raw repr string.
            // Note: Parsing this into JSON is difficult as it is Python string representation.
            content: messageItem.repr
          };
          continue;
        }

        // CASE: Standard LangChain Message (Example 1 & 3)
        if (messageItem.kwargs) {
          const eventData = messageItem.kwargs;

          // A. Handle Tool Calls
          const toolCalls = eventData.tool_calls || [];
          for (const toolCall of toolCalls) {
            if (toolCall.name && toolCall.args) {
              console.log("handle tool call", toolCall);
              yield {
                type: "tool_call",
                toolName: toolCall.name,
                toolArgs: toolCall.args,
                id: toolCall.id
              };
            }
          }

          // B. Handle Content (Example 3)
          // We yield this even if tool calls exist, as some models output both thought-text and tool calls.
          if (
            eventData.content &&
            typeof eventData.content === "string" &&
            eventData.content.trim()
          ) {
            console.log("handle content output", eventData.content);
            yield {
              type: "output", // Using new type
              content: eventData.content // Returns raw string (e.g., "[\"Travel\"...]")
            };
          }
        }
      }
    }
  }
}

export class BleakConversation {
  private bleakAI: BleakAI;
  private conversationId: string;

  constructor(bleakAI: BleakAI, conversationId: string) {
    this.bleakAI = bleakAI;
    this.conversationId = conversationId;
  }

  /**
   * Gets the unique conversation identifier.
   *
   * @returns The conversation ID string
   */
  getId(): string {
    return this.conversationId;
  }

  /**
   * Makes a streaming HTTP request to the configured API endpoint.
   * Sets up the proper headers and handles HTTP-level errors.
   *
   * @param url - API endpoint path (will be appended to base API URL)
   * @param body - Request payload to send as JSON
   * @returns Response object ready for streaming
   * @throws Error if HTTP request fails
   */
  private async makeStreamingRequest(
    url: string,
    body: Record<string, unknown>
  ): Promise<Response> {
    const apiUrl = this.bleakAI.getApiUrl();

    const response = await fetch(`${apiUrl}/${url}`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  }

  /**
   * Parses a single Server-Sent Event (SSE) line into JSON.
   * Handles SSE protocol format and extracts the JSON data payload.
   *
   * @param line - Single line from SSE stream
   * @returns Parsed JSON object or null if line is invalid/comment/unparseable
   */
  private parseSSELineToJSON(line: string): any | null {
    // Skip SSE comments and empty lines
    if (line.startsWith(":") || !line.trim()) {
      return null;
    }

    // Parse SSE data lines (remove "data: " prefix)
    let jsonResponse = line;
    if (line.startsWith("data: ")) {
      jsonResponse = line.substring(6);
    }

    try {
      return JSON.parse(jsonResponse);
    } catch {
      return null;
    }
  }

  /**
   * Processes the parsed LangChain response data and yields conversation events.
   *
   * @param langChainResponse - The parsed JSON data from SSE
   * @returns Generator yielding BleakEvent objects
   */
  private *processLangChainResponse(
    langChainResponse: any
  ): Generator<BleakEvent> {
    if (Array.isArray(langChainResponse)) {
      const [type, langChainData] = langChainResponse;
      console.log("SSE response", type, langChainData);
      switch (type) {
        case "messages":
          yield* extractLangChainEventsFromMessage(langChainData);
          break;
        case "updates":
          const nodeContent = Object.values(langChainData)[0];
          console.log("updates nodeContent", nodeContent);
          if (nodeContent && typeof nodeContent === "object") {
            for (const [key, value] of Object.entries(nodeContent)) {
              console.log(`Processing update property: ${key}`, value);
              yield* extractLangChainEventsFromMessage([value]);
            }
          } else {
            console.warn("Invalid node data in updates:", nodeContent);
          }
          break;
      }
    } else {
      // Handle raw LangChain messages (for resume endpoints)
      yield* extractLangChainEventsFromMessage([langChainResponse]);
    }
  }

  /**
   * Processes a streaming HTTP response and yields conversation events.
   * Reads SSE data chunk by chunk, parses each line, and converts LangChain data to events.
   *
   * @param response - HTTP response object with streaming body
   * @returns AsyncGenerator yielding BleakEvent objects
   */
  private async *processStreamingResponse(
    response: Response
  ): AsyncGenerator<BleakEvent> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      yield {type: "error", error: "Response body is not readable"};
      return;
    }

    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, {stream: true});
        const lines = chunk.split("\n");

        for (const line of lines) {
          const sseData = this.parseSSELineToJSON(line);
          if (!sseData) continue;

          try {
            const langChainResponse = sseData;

            if (langChainResponse.type === "done") {
              // DO NOTHING
              return;
            } else if (langChainResponse.type === "error") {
              yield {
                type: "error",
                error: langChainResponse.error || "An unknown error occurred"
              };
              return;
            } else {
              yield* this.processLangChainResponse(langChainResponse);
            }
          } catch (parseError) {
            console.error("Failed to parse stream data:", parseError);
          }
        }
      }
    } catch (error) {
      console.error("Stream reading error:", error);
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Streams conversation events from a LangGraph endpoint.
   * This is the main public method for starting a conversation and receiving real-time events.
   *
   * @param url - API endpoint to call (e.g., "chat", "resume")
   * @param body - Request payload containing conversation data
   * @returns AsyncGenerator yielding conversation events (input, tool_call, error)
   */
  async *streamConversationEvents(
    url: string,
    body: Record<string, unknown>
  ): AsyncGenerator<BleakEvent> {
    try {
      const response = await this.makeStreamingRequest(url, body);
      yield* this.processStreamingResponse(response);
    } catch (error) {
      yield {
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Processes conversation events and returns them as UI messages.
   * Collects all events from the stream and converts them to BleakMessage format.
   *
   * @param url - API endpoint to call
   * @param body - Request payload
   * @returns Promise resolving to array of BleakMessage objects for UI consumption
   */
  async processEvents(
    url: string,
    body: Record<string, unknown>
  ): Promise<BleakMessage[]> {
    const messages: BleakMessage[] = [];

    for await (const event of this.streamConversationEvents(url, body)) {
      switch (event.type) {
        case "input":
          if (event.content && event.content.trim()) {
            messages.push({
              type: "text",
              role: "ai",
              content: event.content
            });
          }
          break;
        case "output":
          if (event.content && event.content.trim()) {
            messages.push({
              type: "text",
              role: "ai",
              content: event.content
            });
          }
          break;
        case "interrupt":
          if (event.content && event.content.trim()) {
            messages.push({
              type: "interrupt",
              content: event.content
            });
          }
          break;
        case "tool_call":
          if (event.toolName && event.toolArgs) {
            const toolComponent = this.bleakAI.getTools()[event.toolName];
            messages.push({
              type: "tool",
              toolName: event.toolName,
              args: event.toolArgs,
              toolComponent,
              id: event.id || ""
            });
          }
          break;
        case "error":
          if (event.error) {
            messages.push({
              type: "error",
              message: event.error
            });
          }
          break;
      }
    }

    return messages;
  }
}

/**
 * Builder class for setting up event handlers for conversation events.
 * Provides a fluent interface for configuring callbacks for different event types.
 */
export class EventHandler {
  private handlers: EventHandlers = {};

  /**
   * Sets a callback for handling input/text events from the AI.
   *
   * @param callback - Function to call when AI content is received
   * @returns This EventHandler instance for method chaining
   */
  onInput(callback: (content: string) => void | Promise<void>): this {
    this.handlers.onInput = callback;
    return this;
  }

  /**
   * Sets a callback for handling tool call events.
   *
   * @param callback - Function to call when a tool is invoked
   * @returns This EventHandler instance for method chaining
   */
  onToolCall(
    callback: (toolName: string, toolArgs: any) => void | Promise<void>
  ): this {
    this.handlers.onToolCall = callback;
    return this;
  }

  /**
   * Sets a callback for handling error events.
   *
   * @param callback - Function to call when an error occurs
   * @returns This EventHandler instance for method chaining
   */
  onError(callback: (error: string) => void | Promise<void>): this {
    this.handlers.onError = callback;
    return this;
  }

  /**
   * Gets a copy of all configured event handlers.
   *
   * @returns EventHandlers object with all configured callbacks
   */
  getHandlers(): EventHandlers {
    return {...this.handlers};
  }
}

/**
 * Main entry point for the BleakAI SDK.
 * Configures the client and creates conversation instances.
 */
export class BleakAI {
  private tools: Record<string, any>;
  private apiUrl: string;

  /**
   * Creates a new BleakAI client instance.
   *
   * @param config - Configuration object containing tools and API URL
   */
  constructor(config: BleakAIConfig = {}) {
    this.tools = config.tools || {};
    this.apiUrl = config.apiUrl || "";
  }

  /**
   * Gets the configured API base URL.
   *
   * @returns The base API URL string
   */
  getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * Creates a new conversation instance with the given ID.
   *
   * @param conversationId - Unique identifier for the conversation
   * @returns BleakConversation instance ready for streaming events
   */
  createConversation(conversationId: string): BleakConversation {
    return new BleakConversation(this, conversationId);
  }

  /**
   * Gets the configured tools dictionary.
   *
   * @returns Record mapping tool names to tool implementations
   */
  getTools(): Record<string, any> {
    return this.tools;
  }
}
