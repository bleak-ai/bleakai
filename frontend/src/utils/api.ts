import { threadService, threadUtils } from "../services/ThreadService";

// Minimal request interface
export interface StreamRequest {
  input: any;
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
  request: StreamRequest,
  callbacks: StreamCallbacks
): Promise<void> {
  try {
    // Auto-include thread ID if not provided
    const requestWithThread = {
      ...request,
      thread_id: request.thread_id || threadUtils.ensureThread()
    };

    console.log("Sending stream request with thread ID:", requestWithThread.thread_id);

    const res = await fetch("http://localhost:8000/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestWithThread)
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        callbacks.onResponse(chunk);
      }
    }

    callbacks.onComplete?.();
  } catch (error) {
    console.error("Error sending stream request:", error);
    callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Send stream request with a specific thread ID
 */
export async function sendStreamRequestWithThread(
  request: Omit<StreamRequest, "thread_id">,
  threadId: string,
  callbacks: StreamCallbacks,
  setAsCurrentThread: boolean = true
): Promise<void> {
  // Optionally set as current thread
  if (setAsCurrentThread) {
    threadService.setThreadId(threadId);
  }

  return sendStreamRequest({ ...request, thread_id: threadId }, callbacks);
}

/**
 * Send stream request with a new thread ID
 */
export async function sendStreamRequestWithNewThread(
  request: Omit<StreamRequest, "thread_id">,
  callbacks: StreamCallbacks
): Promise<string> {
  const newThreadId = threadService.createNewThread();

  await sendStreamRequest({ ...request, thread_id: newThreadId }, callbacks);

  return newThreadId;
}

// Thread utilities - simplified exports
export const getCurrentThreadId = (): string | null => threadService.getThreadId();
export const setCurrentThreadId = (threadId: string | null): void => threadService.setThreadId(threadId);
export const createNewThread = (): string => threadService.createNewThread();
export const subscribeToThreadChanges = (callback: (threadId: string | null) => void): (() => void) =>
  threadService.subscribe(callback);

// Advanced functionality for those who need it - kept separate to avoid confusion
export interface AdvancedStreamCallbacks extends StreamCallbacks {
  onStart?: () => void;
  onRetry?: (attempt: number, maxAttempts: number) => void;
}

export interface AdvancedStreamOptions {
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Enhanced stream request with retries - for advanced use cases
 */
export async function sendStreamRequestWithRetry(
  request: StreamRequest,
  callbacks: AdvancedStreamCallbacks,
  options: AdvancedStreamOptions = {}
): Promise<void> {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  let attempt = 0;
  const maxAttempts = maxRetries + 1;

  const attemptRequest = async (): Promise<void> => {
    try {
      attempt++;

      if (attempt > 1) {
        callbacks.onRetry?.(attempt - 1, maxAttempts);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      callbacks.onStart?.();

      await sendStreamRequest(request, {
        onResponse: callbacks.onResponse,
        onComplete: callbacks.onComplete,
        onError: callbacks.onError
      });
    } catch (error) {
      console.error(`Error in stream request (attempt ${attempt}/${maxAttempts}):`, error);

      if (attempt < maxAttempts) {
        return attemptRequest();
      } else {
        callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  await attemptRequest();
}