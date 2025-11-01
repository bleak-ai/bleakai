import { threadService, threadUtils } from "../services/ThreadService";

export interface StreamRequest {
  input: any;
  command?: {
    resume?: string;
  };
  thread_id?: string;
}

export interface StreamingCallbacks {
  onResponse: (chunk: string) => void;
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Enhanced sendStreamRequest that automatically includes thread ID
 * if not explicitly provided in the request
 */
export async function sendStreamRequest(
  request: StreamRequest,
  onResponse: (chunk: string) => void
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
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(requestWithThread)
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        onResponse(chunk);
      }
    }
  } catch (error) {
    console.error("Error sending stream request:", error);
  }
}

/**
 * Alternative function that sends a request with a specific thread ID
 * and optionally sets it as the current thread
 */
export async function sendStreamRequestWithThread(
  request: Omit<StreamRequest, 'thread_id'>,
  threadId: string,
  setAsCurrentThread: boolean = true,
  onResponse: (chunk: string) => void
): Promise<void> {
  // Optionally set as current thread
  if (setAsCurrentThread) {
    threadService.setThreadId(threadId);
  }

  return sendStreamRequest(
    { ...request, thread_id: threadId },
    onResponse
  );
}

/**
 * Creates a new thread and sends the request with that thread ID
 */
export async function sendStreamRequestWithNewThread(
  request: Omit<StreamRequest, 'thread_id'>,
  onResponse: (chunk: string) => void
): Promise<string> {
  const newThreadId = threadService.createNewThread();

  await sendStreamRequest(
    { ...request, thread_id: newThreadId },
    onResponse
  );

  return newThreadId;
}

/**
 * Get the current thread ID from the ThreadService
 */
export const getCurrentThreadId = (): string | null => {
  return threadService.getThreadId();
};

/**
 * Set a new thread ID
 */
export const setCurrentThreadId = (threadId: string | null): void => {
  threadService.setThreadId(threadId);
};

/**
 * Create a new thread and return its ID
 */
export const createNewThread = (): string => {
  return threadService.createNewThread();
};

/**
 * Subscribe to thread changes
 */
export const subscribeToThreadChanges = (
  callback: (threadId: string | null) => void
): (() => void) => {
  return threadService.subscribe(callback);
};