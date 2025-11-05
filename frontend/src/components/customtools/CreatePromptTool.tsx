"use client";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {BarChart3, Check, Copy, MessageCircle, Play} from "lucide-react";
import {useState} from "react";
import type {CustomToolProps} from "./shared";

export const CreatePromptTool = ({argsText, onCommand}: CustomToolProps) => {
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  // const {sendCommand, isLoading} = useToolCommand();

  const prompt: string = JSON.parse(argsText).prompt;

  const handleSubmit = async (next_step: "questions" | "test" | "evaluate") => {
    if (submitted) return;

    setSubmitted(true);

    const requestData = {
      input: {},
      command: {resume: next_step}
    };

    if (!onCommand) {
      throw new Error("onCommand is not defined");
    }

    await onCommand(requestData);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="custom-tool-root">
      <Card className="custom-tool-card">
        <CardContent className="custom-tool-content">
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
                >
                  <MessageCircle className="h-4 w-4" />
                  Ask Questions
                </Button>
                <Button
                  onClick={() => handleSubmit("evaluate")}
                  variant="outline"
                  className="flex-1 bg-gray-200 border-gray-200 text-gray-800 hover:bg-gray-300 gap-2"
                  size="lg"
                >
                  <BarChart3 className="h-4 w-4" />
                  Evaluate{" "}
                </Button>
                <Button
                  onClick={() => handleSubmit("test")}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white gap-2"
                  size="lg"
                >
                  <Play className="h-4 w-4" />
                  Test Prompt{" "}
                </Button>
              </>
            )}
            {submitted && (
              <div className="flex-1 text-center text-gray-600 text-sm">
                Request submitted. Results will appear below.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
