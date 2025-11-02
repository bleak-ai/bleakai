import {threadService, threadUtils} from "../services/ThreadService";

// Minimal request interface
export interface StreamRequest {
  input: string;
  command?: {
    resume?: string;
  };
  thread_id?: string;
}

/**
 * Simple stream request - the main function most components should use
 */
export async function sendStreamRequest(
  request: StreamRequest
): Promise<string[]> {
  try {
    // Auto-include thread ID if not provided
    const requestWithThread = {
      ...request,
      thread_id: request.thread_id || threadUtils.ensureThread()
    };

    console.log(
      "Sending stream request with thread ID:",
      requestWithThread.thread_id
    );

    const res = await fetch("http://localhost:8000/stream", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(requestWithThread)
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    const chunks = [];
    if (reader) {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        chunks.push(chunk);
      }
    }
    return chunks;
  } catch (error) {
    console.error("Error sending stream request:", error);
    throw error;
  }
}

// Thread utilities - simplified exports
export const getCurrentThreadId = (): string | null =>
  threadService.getThreadId();
export const setCurrentThreadId = (threadId: string | null): void =>
  threadService.setThreadId(threadId);
export const createNewThread = (): string => threadService.createNewThread();

// Async streaming interfaces for the new async/await pattern
export interface StreamResponse {
  chunk: string;
  done: boolean;
}

export interface ProcessedResponse {
  type: "tool_call" | "message" | "error" | "unknown";
  toolName?: string;
  args?: any;
  data?: any;
  error?: any;
  rawResponse?: any;
}

export function processResponse(chunk: string): ProcessedResponse[] {
  // Try to parse JSON
  const jsonData = JSON.parse(chunk);

  // Handle array of responses
  const responses = Array.isArray(jsonData) ? jsonData : [jsonData];
  const processedResponses: ProcessedResponse[] = [];

  for (const response of responses) {
    const processed = transformResponse(response);
    if (processed) {
      processedResponses.push(processed);
    }
  }

  return processedResponses;
}

export function transformResponse(response: any): ProcessedResponse | null {
  const key = Object.keys(response)[0];

  // Extract tool calls from the response
  const toolCalls = extractToolCalls(response[key]);

  if (toolCalls.length > 0) {
    // Handle tool call responses
    const toolCall = toolCalls[0]; // For now, handle first tool call
    return {
      type: "tool_call",
      toolName: toolCall.name,
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
}

function extractToolCalls(responseData: any): any[] {
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
