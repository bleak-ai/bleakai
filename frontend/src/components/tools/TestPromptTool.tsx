"use client";

import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import type {ToolExecutionProps} from "bleakai";
import {ArrowUp, MessageSquare} from "lucide-react";
import {useState} from "react";

// 1. Import the updated props interface

// 2. Change the function signature to destructure `args` instead of `argsText`
export const TestPromptTool = ({args, onResume}: ToolExecutionProps) => {
  const [submitted, setSubmitted] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  // 3. (THE KEY CHANGE) Access properties directly from the `args` object.
  //    No more JSON.parse!
  const result: string = args.result;

  // The rest of your component logic remains exactly the same, as it was already well-written.
  const handleFeedbackSubmit = async () => {
    if (submitted) return;

    setSubmitted(true);

    if (!onResume) {
      throw new Error("onResume is not defined");
    }

    await onResume(feedbackText);
  };

  return (
    <div className="custom-tool-root">
      <div className="space-y-4">
        <h3 className="text-lg font-medium mb-3">Next Steps</h3>

        {/* We can now safely render the result variable */}
        <p className="text-md p-4 bg-gray-100 rounded-md border">{result}</p>

        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-zinc-500" />
            <p className="text-sm font-medium text-zinc-700">
              Feedback (optional)
            </p>
          </div>

          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Please describe what went wrong or what you'd like to improve..."
            className="min-h-[100px] resize-y border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500/20"
          />
        </div>
      </div>

      {!submitted ? (
        <div>
          <div className="flex gap-2">
            <Button
              onClick={handleFeedbackSubmit}
              className="bg-zinc-700 hover:bg-zinc-800 text-white gap-2"
              size="sm"
            >
              <ArrowUp className="h-4 w-4" />
              Improve Prompt
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <p className="text-sm text-zinc-400">Processing your feedback...</p>
        </div>
      )}
    </div>
  );
};
