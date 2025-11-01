"use client";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {
  sendValidatedStreamRequest,
  type EnhancedStreamingCallbacks
} from "@/utils/api";
import type {ToolCallMessagePartComponent} from "@assistant-ui/react";
import {BarChart3, Check, Copy, MessageCircle, Play} from "lucide-react";
import {useState} from "react";
import {useStreaming as useStreamingContext} from "../CustomChat";
import {
  defaultStreamProcessor,
  streamUtils
} from "@/services/StreamProcessingService";

// Standardized streaming hook for all tools
const useStandardStreaming = () => {
  try {
    const {handleStreamRequest} = useStreamingContext();
    return {
      handleStreamRequest,
      isContextAvailable: true
    };
  } catch (error) {
    console.warn(
      "useStreaming must be used within a StreamingProvider, falling back to direct request"
    );
    return {
      handleStreamRequest: null,
      isContextAvailable: false
    };
  }
};

export const CreatePromptTool: ToolCallMessagePartComponent = ({argsText}) => {
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const {handleStreamRequest, isContextAvailable} = useStandardStreaming();

  const prompt: string = JSON.parse(argsText).prompt;

  const handleSubmit = async (next_step: "questions" | "test" | "evaluate") => {
    if (submitted || isLoading) return;

    setSubmitted(true);
    setIsLoading(true);

    console.log("CreatePromptTool: Submitting request for step:", next_step);

    const callbacks: EnhancedStreamingCallbacks = {
      onStart: () => {
        console.log("CreatePromptTool: Starting streaming request...");
      },
      onResponse: (chunk: string) => {
        console.log("CreatePromptTool: Raw response chunk:", chunk);
      },
      onProcessedResponse: (response) => {
        console.log("CreatePromptTool: Processed response:", response);
        // Response is handled by parent component via context
      },
      onComplete: () => {
        console.log("CreatePromptTool: Streaming request completed");
        setIsLoading(false);
      },
      onError: (error: Error) => {
        console.error("CreatePromptTool: Streaming request error:", error);
        setIsLoading(false);
        setSubmitted(false); // Allow retry on error
      },
      onValidationError: (error) => {
        console.error("CreatePromptTool: Validation error:", error);
        setIsLoading(false);
        setSubmitted(false); // Allow retry on error
      },
      onRetry: (attempt: number, maxAttempts: number) => {
        console.log(`CreatePromptTool: Retry ${attempt}/${maxAttempts}`);
      }
    };

    try {
      if (handleStreamRequest && isContextAvailable) {
        // Use the centralized streaming handler from context
        await handleStreamRequest(
          {
            input: {input: ""},
            command: {
              resume: next_step
            }
          },
          callbacks
        );
      } else {
        // Fallback to direct validated request if no context provider available
        console.warn("CreatePromptTool: No streaming context available - using fallback");
        await sendValidatedStreamRequest(
          {
            input: {input: ""},
            command: {
              resume: next_step
            }
          },
          callbacks,
          {
            enableValidation: true,
            maxRetries: 3,
            retryDelay: 1000,
            processor: defaultStreamProcessor
          }
        );
      }
    } catch (error) {
      console.error("CreatePromptTool: Unexpected error:", error);
      setIsLoading(false);
      setSubmitted(false); // Allow retry on error
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="aui-assistant-message-root relative mx-auto w-full max-w-[var(--thread-max-width)] animate-in py-4 duration-200 fade-in slide-in-from-bottom-1">
      <Card className="border-0 bg-white shadow-sm overflow-hidden">
        {/* <CardHeader className="text-XL font-semibold text-slate-500 uppercase tracking-widest">
          Prompt
        </CardHeader> */}
        <CardContent className="space-y-2 px-8 pb-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xl font-semibold">Prompt </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="rounded-lg bg-slate-50 p-6 border border-slate-200 max-h-64 overflow-y-auto">
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {prompt}
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full pt-4">
            {!submitted && (
              <>
                <Button
                  onClick={() => handleSubmit("questions")}
                  variant="outline"
                  className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50 gap-2"
                  size="lg"
                  disabled={isLoading}
                >
                  <MessageCircle className="h-4 w-4" />
                  {isLoading ? "Processing..." : "Ask Questions"}
                </Button>
                <Button
                  onClick={() => handleSubmit("evaluate")}
                  variant="outline"
                  className="flex-1 bg-gray-200 border-gray-200 text-gray-800 hover:bg-gray-300 gap-2"
                  size="lg"
                  disabled={isLoading}
                >
                  <BarChart3 className="h-4 w-4" />
                  {isLoading ? "Processing..." : "Evaluate"}
                </Button>
                <Button
                  onClick={() => handleSubmit("test")}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white gap-2"
                  size="lg"
                  disabled={isLoading}
                >
                  <Play className="h-4 w-4" />
                  {isLoading ? "Testing..." : "Test Prompt"}
                </Button>
              </>
            )}
            {submitted && !isLoading && (
              <div className="flex-1 text-center text-gray-600 text-sm">
                Request submitted. Results will appear above.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
