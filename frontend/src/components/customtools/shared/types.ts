"use client";

// Interface to replace ToolCallMessagePartComponent from assistant-ui
export interface CustomToolProps {
  argsText: string;
  onCommand?: (command: any) => void;
}

// Standard streaming callbacks for all tools
export interface ToolStreamingCallbacks {
  onStart?: () => void;
  onResponse?: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number, maxAttempts: number) => void;
}

// Standard tool state interface
export interface ToolState {
  submitted: boolean;
  isLoading: boolean;
  error?: string;
}

// Standard parsed args interface
export interface ParsedToolArgs {
  [key: string]: any;
}
