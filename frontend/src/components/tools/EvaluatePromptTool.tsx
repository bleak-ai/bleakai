"use client";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import type {ToolCallMessagePartComponent} from "@assistant-ui/react";
import {useLangGraphSendCommand} from "@assistant-ui/react-langgraph";
import {AlertCircle, ArrowRight, CheckCircle2, Zap} from "lucide-react";
import {useState} from "react";

export const EvaluatePromptTool: ToolCallMessagePartComponent = ({
  argsText
}) => {
  const sendCommand = useLangGraphSendCommand();
  const [submitted, setSubmitted] = useState(false);

  const completionLevel = parseInt(JSON.parse(argsText).evaluation);
  const missingInfo = JSON.parse(argsText).missing_info;

  const handleSubmit = (next_step: "questions" | "test") => {
    setSubmitted(true);
    sendCommand({resume: next_step});
  };

  const percentage = (completionLevel / 6) * 100;

  const getStatus = () => {
    if (completionLevel === 6)
      return {label: "Complete", color: "text-emerald-600", icon: CheckCircle2};
    if (completionLevel >= 4)
      return {label: "Nearly there", color: "text-blue-600", icon: Zap};
    return {
      label: "Needs more info",
      color: "text-amber-600",
      icon: AlertCircle
    };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <div className="aui-assistant-message-root relative mx-auto w-full max-w-[var(--thread-max-width)] animate-in py-4 duration-200 fade-in slide-in-from-bottom-1">
      <Card className="border-0 bg-white shadow-sm overflow-hidden">
        {/* <CardHeader className="text-XL font-semibold text-slate-500 uppercase tracking-widest">
          Prompt
        </CardHeader> */}
        <CardContent className="space-y-2 px-8 pb-2">
          <div className="w-full  mx-auto p-6 bg-card rounded-lg border border-border">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-5 h-5 ${status.color}`} />
                <span className="text-sm font-medium text-foreground">
                  {status.label}
                </span>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {completionLevel}/6
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-500 rounded-full transition-all duration-300"
                  style={{width: `${percentage}%`}}
                />
              </div>
            </div>

            {/* Missing Info */}
            {missingInfo && completionLevel < 6 && (
              <div className="text-sm text-muted-foreground leading-relaxed">
                <p className="font-medium mb-1">Add:</p>
                <p>{missingInfo}</p>
              </div>
            )}

            {/* Complete State */}
            {completionLevel === 6 && (
              <div className="text-xs text-emerald-600 font-medium">
                ✓ Your prompt is ready to go
              </div>
            )}
          </div>
          <div className="flex gap-3 w-full pt-4">
            {!submitted ? (
              <>
                <Button
                  onClick={() => handleSubmit("questions")}
                  variant="outline"
                  className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
                  size="lg"
                >
                  Ask Questions
                </Button>
                <Button
                  onClick={() => handleSubmit("test")}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white gap-2"
                  size="lg"
                >
                  Test Prompt
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-center w-full gap-2 py-2">
                <p className="text-sm text-slate-500 font-medium">
                  Processing...
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
