"use client";

import { sendStreamRequestWithRetry, type AdvancedStreamCallbacks } from "@/utils/api";
import {useCallback} from "react";
import {useStreaming as useStreamingContext} from "../../CustomChat";
import type {ToolStreamingCallbacks} from "./types";

// Convert our tool callbacks to advanced streaming callbacks
const convertToAdvancedCallbacks = (
  callbacks: ToolStreamingCallbacks
): AdvancedStreamCallbacks => ({
  onStart: callbacks.onStart,
  onResponse: callbacks.onResponse || (() => {}),
  onComplete: callbacks.onComplete,
  onError: callbacks.onError,
  onRetry: callbacks.onRetry
});

// Standardized streaming hook for all tools (based on CreatePromptTool's proven approach)
export const useToolStreaming = () => {
  try {
    const {handleStreamRequest} = useStreamingContext();
    return {
      handleStreamRequest,
      isContextAvailable: true
    };
  } catch (error) {
    console.warn(
      "useToolStreaming must be used within a StreamingProvider, falling back to direct request"
    );
    return {
      handleStreamRequest: null,
      isContextAvailable: false
    };
  }
};

// Standardized streaming function for all tools
export const useToolStreamingRequest = () => {
  const {handleStreamRequest, isContextAvailable} = useToolStreaming();

  const executeStreamRequest = useCallback(
    async (
      requestData: any,
      callbacks: ToolStreamingCallbacks,
      options?: {
        maxRetries?: number;
        retryDelay?: number;
      }
    ) => {
      const advancedCallbacks = convertToAdvancedCallbacks(callbacks);
      const requestOptions = {
        maxRetries: 3,
        retryDelay: 1000,
        ...options
      };

      try {
        if (handleStreamRequest && isContextAvailable) {
          // Use the centralized streaming handler from context
          await handleStreamRequest(requestData, advancedCallbacks);
        } else {
          // Fallback to direct request with retries if no context provider available
          console.warn(
            "Tool streaming: No streaming context available - using fallback"
          );
          await sendStreamRequestWithRetry(
            requestData,
            advancedCallbacks,
            requestOptions
          );
        }
      } catch (error) {
        console.error("Tool streaming: Unexpected error:", error);
        throw error;
      }
    },
    [handleStreamRequest, isContextAvailable]
  );

  return {executeStreamRequest, isContextAvailable};
};
