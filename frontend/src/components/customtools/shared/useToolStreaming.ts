"use client";

import { sendStreamRequestAsync } from "@/utils/api";
import {useCallback} from "react";
import {useStreaming as useStreamingContext} from "../../CustomChat";
import type {ToolStreamingCallbacks} from "./types";

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

// Standardized streaming function for all tools using async/await
export const useToolStreamingRequest = () => {
  const {handleStreamRequest, isContextAvailable} = useToolStreaming();

  const executeStreamRequest = useCallback(
    async (
      requestData: any,
      callbacks: ToolStreamingCallbacks
    ) => {
      try {
        callbacks.onStart?.();

        if (handleStreamRequest && isContextAvailable) {
          // Use the centralized streaming handler from context
          // The context version now handles all internal processing
          await handleStreamRequest(requestData);
        } else {
          // Fallback to direct request if no context provider available
          console.warn(
            "Tool streaming: No streaming context available - using fallback"
          );

          for await (const chunk of sendStreamRequestAsync(requestData)) {
            callbacks.onResponse?.(chunk);
          }
        }

        callbacks.onComplete?.();
      } catch (error) {
        console.error("Tool streaming: Unexpected error:", error);
        callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    },
    [handleStreamRequest, isContextAvailable]
  );

  return {executeStreamRequest, isContextAvailable};
};
