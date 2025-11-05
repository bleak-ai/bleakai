"use client";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {AlertCircle, ArrowRight, CheckCircle2, Zap} from "lucide-react";
import {useState} from "react";
import type {CustomToolProps} from "./shared";

export const EvaluatePromptTool = ({argsText, onCommand}: CustomToolProps) => {
  const [submitted, setSubmitted] = useState(false);

  const completionLevel = parseInt(JSON.parse(argsText).evaluation);
  const missingInfo = JSON.parse(argsText).missing_info;

  const handleSubmit = async (next_step: "questions" | "test") => {
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
    <div className="custom-tool-root">
      <Card className="custom-tool-card">
        <CardContent className="custom-tool-content">
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
                  className="h-full bg-gradient-to-r from-orange-500 via-yellow-500 to-emerald-500 rounded-full transition-all duration-300"
                  style={{width: `${percentage}%`}}
                />
              </div>
            </div>

            {/* Missing Info */}
            {missingInfo && completionLevel < 6 && (
              <div className="text-sm text-muted-foreground leading-relaxed">
                <p className="font-medium mb-1">How to Improve:</p>
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
