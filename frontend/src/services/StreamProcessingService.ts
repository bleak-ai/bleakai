/**
 * StreamProcessingService - Minimal service for processing LangGraph stream responses
 *
 * This service handles:
 * - Response parsing and validation
 * - Basic error handling
 * - Response transformation
 */

export interface ProcessedResponse {
  type: "tool_call" | "message" | "error" | "unknown";
  toolName?: string;
  args?: any;
  data?: any;
  error?: ProcessedError;
  rawResponse?: any;
}

export interface ProcessedError {
  type: "parse_error" | "validation_error" | "network_error" | "unknown_error";
  message: string;
  originalError?: Error;
  recoverable: boolean;
}

/**
 * StreamProcessingService class
 */
export class StreamProcessingService {
  constructor() {}

  /**
   * Process a raw chunk from the stream and return processed responses
   */
  processResponse(chunk: string): ProcessedResponse[] {
    try {
      // Try to parse JSON
      const jsonData = JSON.parse(chunk);

      // Handle array of responses
      const responses = Array.isArray(jsonData) ? jsonData : [jsonData];
      const processedResponses: ProcessedResponse[] = [];

      for (const response of responses) {
        const processed = this.transformResponse(response);
        if (processed) {
          processedResponses.push(processed);
        }
      }

      return processedResponses;
    } catch (error) {
      const processedError = this.handleError(error as Error);
      return [{type: "error", error: processedError}];
    }
  }

  /**
   * Validate if a response is properly structured
   */
  validateResponse(response: any): boolean {
    if (!response || typeof response !== "object") {
      return false;
    }

    // Check if it has at least one key
    return Object.keys(response).length > 0;
  }

  /**
   * Handle and categorize errors
   */
  handleError(error: Error): ProcessedError {
    // Categorize error type
    let errorType: ProcessedError["type"] = "unknown_error";
    let recoverable = false;

    if (error instanceof SyntaxError) {
      errorType = "parse_error";
      recoverable = true; // Parse errors might be recoverable with retry
    } else if (
      error.message.includes("fetch") ||
      error.message.includes("network")
    ) {
      errorType = "network_error";
      recoverable = true;
    } else if (error.message.includes("validation")) {
      errorType = "validation_error";
      recoverable = false;
    }

    const processedError: ProcessedError = {
      type: errorType,
      message: error.message,
      originalError: error,
      recoverable
    };

    return processedError;
  }

  /**
   * Transform raw response into ProcessedResponse
   */
  transformResponse(response: any): ProcessedResponse | null {
    if (!this.validateResponse(response)) {
      const error = new Error("Invalid response structure");
      return {
        type: "error",
        error: this.handleError(error)
      };
    }

    try {
      const key = Object.keys(response)[0];

      // Extract tool calls from the response
      const toolCalls = this.extractToolCalls(response[key]);

      if (toolCalls.length > 0) {
        // Handle tool call responses
        const toolCall = toolCalls[0]; // For now, handle first tool call
        return {
          type: "tool_call",
          toolName: key,
          args: toolCall.args,
          data: response[key],
          rawResponse: response
        };
      } else {
        // Handle regular message responses
        return {
          type: "message",
          data: response[key],
          rawResponse: response
        };
      }
    } catch (error) {
      return {
        type: "error",
        error: this.handleError(error as Error)
      };
    }
  }

  /**
   * Extract tool calls from a response object
   */
  private extractToolCalls(responseData: any): any[] {
    try {
      const toolCalls: any[] = [];
      // Handle different message formats
      const messages = responseData?.messages || [];

      for (const message of messages) {
        // Check for tool calls in different possible locations
        const calls = message?.kwargs?.tool_calls || message?.tool_calls || [];

        for (const call of calls) {
          if (call?.args) {
            toolCalls.push({
              name: call.name || "unknown_tool",
              args: call.args
            });
          }
        }
      }

      return toolCalls;
    } catch (error) {
      console.error("Error extracting tool calls:", error);
      return [];
    }
  }
}

/**
 * Create a default instance of the stream processing service
 */
export const defaultStreamProcessor = new StreamProcessingService();

/**
 * Utility functions for common stream processing operations
 */
export const streamUtils = {
  /**
   * Check if a response represents a tool call
   */
  isToolCall(response: ProcessedResponse): response is ProcessedResponse & {
    type: "tool_call";
    toolName: string;
    args: any;
  } {
    return response.type === "tool_call" && !!response.toolName;
  },

  /**
   * Check if a response represents an error
   */
  isError(response: ProcessedResponse): response is ProcessedResponse & {
    type: "error";
    error: ProcessedError;
  } {
    return response.type === "error" && !!response.error;
  },

  /**
   * Check if an error is recoverable
   */
  isRecoverableError(error: ProcessedError): boolean {
    return error.recoverable;
  },

  /**
   * Get a human-readable error message
   */
  getErrorMessage(error: ProcessedError): string {
    switch (error.type) {
      case "parse_error":
        return `Failed to parse response: ${error.message}`;
      case "validation_error":
        return `Invalid response format: ${error.message}`;
      case "network_error":
        return `Network error: ${error.message}`;
      default:
        return `Unknown error: ${error.message}`;
    }
  }
};