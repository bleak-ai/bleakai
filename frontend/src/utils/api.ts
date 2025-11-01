import {
  defaultStreamProcessor,
  StreamProcessingService,
  streamUtils,
  type ProcessedError,
  type ProcessedResponse
} from "../services/StreamProcessingService";
import {threadService, threadUtils} from "../services/ThreadService";

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

export interface EnhancedStreamingCallbacks extends StreamingCallbacks {
  onProcessedResponse?: (response: ProcessedResponse) => void;
  onValidatedResponse?: (response: ProcessedResponse) => void;
  onValidationError?: (error: ProcessedError) => void;
  onRetry?: (attempt: number, maxAttempts: number) => void;
}

export interface StreamProcessingOptions {
  enableValidation?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  processor?: StreamProcessingService;
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

    console.log(
      "Sending stream request with thread ID:",
      requestWithThread.thread_id
    );

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
  request: Omit<StreamRequest, "thread_id">,
  threadId: string,
  setAsCurrentThread: boolean = true,
  onResponse: (chunk: string) => void
): Promise<void> {
  // Optionally set as current thread
  if (setAsCurrentThread) {
    threadService.setThreadId(threadId);
  }

  return sendStreamRequest({...request, thread_id: threadId}, onResponse);
}

/**
 * Creates a new thread and sends the request with that thread ID
 */
export async function sendStreamRequestWithNewThread(
  request: Omit<StreamRequest, "thread_id">,
  onResponse: (chunk: string) => void
): Promise<string> {
  const newThreadId = threadService.createNewThread();

  await sendStreamRequest({...request, thread_id: newThreadId}, onResponse);

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

/**
 * Enhanced stream request with processing and validation
 */
export async function sendValidatedStreamRequest(
  request: StreamRequest,
  callbacks: EnhancedStreamingCallbacks,
  options: StreamProcessingOptions = {}
): Promise<void> {
  const {
    enableValidation = true,
    maxRetries = 3,
    retryDelay = 1000,
    processor = defaultStreamProcessor
  } = options;

  let attempt = 0;
  const maxAttempts = maxRetries + 1; // Include initial attempt

  const attemptRequest = async (): Promise<void> => {
    try {
      attempt++;

      if (attempt > 1) {
        callbacks.onRetry?.(attempt - 1, maxAttempts);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }

      callbacks.onStart?.();

      // Auto-include thread ID if not provided
      const requestWithThread = {
        ...request,
        thread_id: request.thread_id || threadUtils.ensureThread()
      };

      console.log(
        "Sending validated stream request with thread ID:",
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
          callbacks.onResponse(chunk);

          // Process the chunk if validation is enabled
          if (enableValidation) {
            const processedResponses = processor.processResponse(chunk);

            for (const response of processedResponses) {
              callbacks.onProcessedResponse?.(response);

              if (streamUtils.isError(response)) {
                if (
                  streamUtils.isRecoverableError(response.error) &&
                  attempt < maxAttempts
                ) {
                  throw (
                    response.error.originalError ||
                    new Error(response.error.message)
                  );
                } else {
                  callbacks.onValidationError?.(response.error);
                  callbacks.onError?.(
                    response.error.originalError ||
                      new Error(response.error.message)
                  );
                  return;
                }
              } else {
                callbacks.onValidatedResponse?.(response);
              }
            }
          }
        }
      }

      callbacks.onComplete?.();
    } catch (error) {
      console.error(
        "Error in validated stream request (attempt ${attempt}/${maxAttempts}):",
        error
      );

      if (
        attempt < maxAttempts &&
        streamUtils.isRecoverableError(processor.handleError(error as Error))
      ) {
        return attemptRequest();
      } else {
        const processedError = processor.handleError(error as Error);
        callbacks.onValidationError?.(processedError);
        callbacks.onError?.(error as Error);
      }
    }
  };

  await attemptRequest();
}

/**
 * Create a stream processor with custom configuration
 */
export function createStreamProcessor(
  config: StreamProcessingOptions
): StreamProcessingService {
  return new StreamProcessingService({
    enableLogging: true,
    maxRetries: config.maxRetries || 3,
    retryDelay: config.retryDelay || 1000,
    strictValidation: config.enableValidation || false
  });
}

/**
 * Utility to extract tool calls from processed responses
 */
export function extractToolCallsFromResponses(
  responses: ProcessedResponse[]
): Array<{
  toolName: string;
  args: any;
  data?: any;
}> {
  return responses.filter(streamUtils.isToolCall).map((response) => ({
    toolName: response.toolName,
    args: response.args,
    data: response.data
  }));
}

/**
 * Enhanced sendStreamRequestWithThread that supports processing
 */
export async function sendValidatedStreamRequestWithThread(
  request: Omit<StreamRequest, "thread_id">,
  threadId: string,
  callbacks: EnhancedStreamingCallbacks,
  options: StreamProcessingOptions & {setAsCurrentThread?: boolean} = {}
): Promise<void> {
  const {setAsCurrentThread = true, ...processingOptions} = options;

  // Optionally set as current thread
  if (setAsCurrentThread) {
    threadService.setThreadId(threadId);
  }

  return sendValidatedStreamRequest(
    {...request, thread_id: threadId},
    callbacks,
    processingOptions
  );
}

/**
 * Enhanced sendStreamRequestWithNewThread that supports processing
 */
export async function sendValidatedStreamRequestWithNewThread(
  request: Omit<StreamRequest, "thread_id">,
  callbacks: EnhancedStreamingCallbacks,
  options: StreamProcessingOptions = {}
): Promise<string> {
  const newThreadId = threadService.createNewThread();

  await sendValidatedStreamRequest(
    {...request, thread_id: newThreadId},
    callbacks,
    options
  );

  return newThreadId;
}
