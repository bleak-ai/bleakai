"use client";

import {Button} from "@/components/ui/button";
import type {ToolCallMessagePartComponent} from "@assistant-ui/react";
import {useLangGraphSendCommand} from "@assistant-ui/react-langgraph";
import {ArrowUp} from "lucide-react";
import {useState} from "react";

export const TestPromptTool: ToolCallMessagePartComponent = ({argsText}) => {
  const sendCommand = useLangGraphSendCommand();
  const [submitted, setSubmitted] = useState(false);

  const result: string = JSON.parse(argsText).result;

  const handleSubmit = (next_step: "analyze" | "finish") => {
    setSubmitted(true);
    sendCommand({resume: next_step});
  };

  return (
    <div className="py-4">
      <h3 className="text-lg font-medium mb-3">Next Steps</h3>
      <div className="flex gap-2">
        {!submitted ? (
          <>
            <Button
              onClick={() => handleSubmit("analyze")}
              className="bg-zinc-700 hover:bg-zinc-800 text-white gap-2"
              size="sm"
            >
              <ArrowUp className="h-4 w-4" />
              Improve
            </Button>
            <Button
              onClick={() => handleSubmit("finish")}
              variant="outline"
              className="border-zinc-700 text-zinc-500 hover:bg-zinc-200"
              size="sm"
            >
              Finish
            </Button>
          </>
        ) : (
          <p className="text-sm text-zinc-400">Processing...</p>
        )}
      </div>
    </div>
  );
};
