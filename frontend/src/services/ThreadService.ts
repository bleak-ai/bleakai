/**
 * ThreadService - A non-React closure-based thread management service
 *
 * This service manages thread state using closures and provides a subscription pattern
 * for components to react to thread changes without requiring React Context.
 */

type ThreadChangeCallback = (threadId: string | null) => void;

export interface ThreadManager {
  getThreadId: () => string | null;
  setThreadId: (threadId: string | null) => void;
  createNewThread: () => string;
  clearThread: () => void;
  subscribe: (callback: ThreadChangeCallback) => () => void;
  unsubscribe: (callback: ThreadChangeCallback) => void;
}

/**
 * Creates a thread manager instance with closure-based state
 */
export const createThreadManager = (): ThreadManager => {
  let threadId: string | null = null;
  const subscribers = new Set<ThreadChangeCallback>();

  const notifySubscribers = (newThreadId: string | null): void => {
    subscribers.forEach(callback => {
      try {
        callback(newThreadId);
      } catch (error) {
        console.error('Error in thread change callback:', error);
      }
    });
  };

  return {
    /**
     * Gets the current thread ID
     */
    getThreadId: (): string | null => threadId,

    /**
     * Sets the current thread ID and notifies subscribers
     */
    setThreadId: (newThreadId: string | null): void => {
      if (threadId !== newThreadId) {
        threadId = newThreadId;
        notifySubscribers(newThreadId);
      }
    },

    /**
     * Creates a new thread ID with timestamp and random component
     */
    createNewThread: (): string => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const newThreadId = `thread_${timestamp}_${random}`;

      threadId = newThreadId;
      notifySubscribers(newThreadId);

      return newThreadId;
    },

    /**
     * Clears the current thread ID and notifies subscribers
     */
    clearThread: (): void => {
      threadId = null;
      notifySubscribers(null);
    },

    /**
     * Subscribe to thread changes
     * Returns an unsubscribe function
     */
    subscribe: (callback: ThreadChangeCallback): (() => void) => {
      subscribers.add(callback);

      // Immediately call the callback with current thread ID
      try {
        callback(threadId);
      } catch (error) {
        console.error('Error in initial thread callback:', error);
      }

      // Return unsubscribe function
      return () => {
        subscribers.delete(callback);
      };
    },

    /**
     * Unsubscribe from thread changes
     */
    unsubscribe: (callback: ThreadChangeCallback): void => {
      subscribers.delete(callback);
    }
  };
};

// Create and export singleton instance
export const threadService = createThreadManager();

/**
 * Utility functions for common operations
 */
export const threadUtils = {
  /**
   * Ensures a thread exists, creating one if necessary
   */
  ensureThread: (): string => {
    const currentId = threadService.getThreadId();
    if (currentId) {
      return currentId;
    }
    return threadService.createNewThread();
  },

  /**
   * Gets current thread ID or throws if none exists
   */
  requireThread: (): string => {
    const currentId = threadService.getThreadId();
    if (!currentId) {
      throw new Error('Thread ID is required but none exists. Call ensureThread() first.');
    }
    return currentId;
  }
};