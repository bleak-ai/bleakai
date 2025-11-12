"use client";

import type {ToolExecutionProps} from "bleakai";
import {Lightbulb} from "lucide-react";

export const SuggestImprovementsTool = ({args}: ToolExecutionProps) => {
  const {improvements} = args;

  return (
    <div className="custom-tool-root">
      <div className="custom-tool-card rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="border-b border-border/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              Improvements
            </h3>
          </div>
        </div>

        <div className="px-4 py-3">
          {improvements && improvements.length > 0 ? (
            <div className="space-y-2">
              {improvements.map((improvement: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                  <p className="text-sm leading-relaxed text-foreground">
                    {improvement}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No improvements suggested.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
