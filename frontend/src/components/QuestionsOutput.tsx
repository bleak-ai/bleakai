import type {ToolCallMessagePartComponent} from "@assistant-ui/react";
import {
  useLangGraphInterruptState,
  useLangGraphSendCommand
} from "@assistant-ui/react-langgraph";
import {useState} from "react";
import Questions, {type QuestionType} from "./Questions";
import {Button} from "./ui/button";

interface Answer {
  question: string;
  answer: string;
}

export const QuestionsOutput: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  result
}) => {
  const interrupt = useLangGraphInterruptState();
  const sendCommand = useLangGraphSendCommand();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  console.log("tool name", toolName);
  // if (!interrupt) {
  //   return (
  //     <div>
  //       {toolName}, {argsText}
  //       {result}
  //     </div>
  //   );
  // }

  const questions: QuestionType[] = interrupt?.value.questions ?? [];
  const questionsWithoutOther = questions.map((question) => ({
    ...question,
    options: question.options?.filter((option) => option !== "Other")
  }));

  const handleSubmit = () => {
    const formattedAnswers: Answer[] = questionsWithoutOther.map(
      (question: QuestionType, index) => ({
        question: question.question,
        answer: answers[index] || ""
      })
    );
    sendCommand({resume: JSON.stringify(formattedAnswers)});
  };

  const handleAnswersChange = (newAnswers: Record<string, string>) => {
    setAnswers(newAnswers);
  };

  return (
    <div className="aui-assistant-message-root relative mx-auto w-full max-w-[var(--thread-max-width)] animate-in py-4 duration-200 fade-in slide-in-from-bottom-1 last:mb-24">
      <div className="flex flex-col gap-2">
        <div>
          <Questions
            questions={questionsWithoutOther}
            onAnswersChange={handleAnswersChange}
            answers={answers}
          />
        </div>
        <div className="flex gap-2 w-full mt-6">
          <Button onClick={handleSubmit}>Submit</Button>
        </div>
      </div>
    </div>
  );
};
