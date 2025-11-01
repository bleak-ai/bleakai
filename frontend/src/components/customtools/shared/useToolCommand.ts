"use client";

import {useCallback, useState} from "react";
import {useToolStreaming} from "./useToolStreaming";

// Simplified callbacks for the minimal interface
export interface SimpleCommandCallbacks {
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

// Simplified hook for sending commands with automatic state management
export const useToolCommand = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const {handleStreamRequest, isContextAvailable} = useToolStreaming();

  const sendCommand = useCallback(
    async (commandValue: string, callbacks?: SimpleCommandCallbacks) => {
      if (isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        // Simplified request structure - just send the command value
        const requestData = {
          input: {input: ""},
          command: {resume: commandValue}
        };

        if (handleStreamRequest && isContextAvailable) {
          // Use context streaming with simplified callbacks
          await handleStreamRequest(requestData, {
            onStart: () => {
              console.log(`ToolCommand: Starting command: ${commandValue}`);
            },
            onComplete: () => {
              console.log(`ToolCommand: Command completed: ${commandValue}`);
              callbacks?.onComplete?.();
            },
            onError: (error: Error) => {
              console.error(
                `ToolCommand: Command failed: ${commandValue}`,
                error
              );
              setError(error);
              callbacks?.onError?.(error);
            },
            onResponse: () => {
              console.log(
                `ToolCommand: Received response for command: ${commandValue}`
              );
            }
          });
        } else {
          throw new Error("No streaming context available");
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(
          `ToolCommand: Unexpected error for command: ${commandValue}`,
          err
        );
        setError(err);
        callbacks?.onError?.(err);
      } finally {
        setIsLoading(false);
      }
    },
    [handleStreamRequest, isContextAvailable, isLoading]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sendCommand,
    isLoading,
    error,
    clearError
  };
};
