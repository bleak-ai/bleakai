"use client";

import type {ToolExecutionProps} from "bleakai";
import {useState} from "react";
import Questions, {type QuestionType} from "../Questions";
import {Button} from "../ui/button";
import {Card, CardContent} from "../ui/card";

export const AskQuestionTool = ({args, onResume}: ToolExecutionProps) => {
  const questions: QuestionType[] = args.questions;

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const questionsWithoutOther = questions.map((question) => ({
    ...question,
    options: question.options?.filter((option) => option !== "Other")
  }));

  const handleSubmit = async () => {
    if (submitted) return;

    setSubmitted(true);
    const formattedAnswers: string[] = questionsWithoutOther.map(
      (_: QuestionType, index) => answers[index] ?? ""
    );

    if (!onResume) {
      throw new Error("onResume is not defined");
    }

    await onResume(JSON.stringify(formattedAnswers));
  };

  const handleAnswersChange = (newAnswers: Record<number, string>) => {
    setAnswers(newAnswers);
  };

  return (
    <div className="custom-tool-root">
      <Card className="custom-tool-card border-primary/20 bg-gradient-to-br from-card to-card/50">
        {/* <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <HelpCircle className="h-5 w-5 text-primary" />
                Answer Questions
              </CardTitle>
              <CardDescription>
                {answeredCount} of {totalQuestions} questions answered
              </CardDescription>
            </div>
          </div>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{width: `${progressPercentage}%`}}
            />
          </div>
        </CardHeader> */}

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Questions
              questions={questionsWithoutOther}
              onAnswersChange={handleAnswersChange}
              answers={answers}
            />
          </div>

          <div className="flex gap-3 w-full pt-2">
            {!submitted ? (
              <Button onClick={handleSubmit} className="w-full" size="lg">
                Submit Answers
              </Button>
            ) : (
              <div className="flex items-center justify-center w-full gap-2 py-2">
                <p className="text-sm text-muted-foreground font-medium">
                  Generating Prompt...
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
