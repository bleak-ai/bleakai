"use client";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import type {ToolCallMessagePartComponent} from "@assistant-ui/react";
import {useLangGraphSendCommand} from "@assistant-ui/react-langgraph";
import {BarChart3, Check, Copy, MessageCircle, Play} from "lucide-react";
import {useState} from "react";

export const CreatePromptTool: ToolCallMessagePartComponent = ({argsText}) => {
  const sendCommand = useLangGraphSendCommand();
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const prompt: string = JSON.parse(argsText).prompt;

  const handleSubmit = (next_step: "questions" | "test" | "evaluate") => {
    setSubmitted(true);
    sendCommand({resume: next_step});
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
                  Evaluate
                </Button>
                <Button
                  onClick={() => handleSubmit("test")}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white gap-2"
                  size="lg"
                >
                  <Play className="h-4 w-4" />
                  Test Prompt
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
