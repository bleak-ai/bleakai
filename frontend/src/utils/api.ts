import {threadService, threadUtils} from "../services/ThreadService";

// Minimal request interface
export interface StreamRequest {
  input: string;
  command?: {
    resume?: string;
  };
  thread_id?: string;
}

// Simple callbacks for most use cases
export interface StreamCallbacks {
  onResponse: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
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

// Async/await streaming functions

/**
 * Async stream request that returns an AsyncIterable
 */
export async function* sendStreamRequestAsync(
  request: StreamRequest
): AsyncIterable<string> {
  try {
    // Auto-include thread ID if not provided
    const requestWithThread = {
      ...request,
      thread_id: request.thread_id || threadUtils.ensureThread()
    };

    console.log(
      "Sending async stream request with thread ID:",
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

    if (reader) {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        yield chunk;
      }
    }
  } catch (error) {
    console.error("Error sending async stream request:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Send async stream request with a specific thread ID
 */
export async function* sendStreamRequestWithThreadAsync(
  request: Omit<StreamRequest, "thread_id">,
  threadId: string,
  setAsCurrentThread: boolean = true
): AsyncIterable<string> {
  // Optionally set as current thread
  if (setAsCurrentThread) {
    threadService.setThreadId(threadId);
  }

  yield* sendStreamRequestAsync({...request, thread_id: threadId});
}

/**
 * Send async stream request with a new thread ID
 */
export async function sendStreamRequestWithNewThreadAsync(
  request: Omit<StreamRequest, "thread_id">
): Promise<{threadId: string; stream: AsyncIterable<string>}> {
  const newThreadId = threadService.createNewThread();

  const stream = sendStreamRequestAsync({...request, thread_id: newThreadId});

  return {threadId: newThreadId, stream};
}
