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

export const InterruptUI = () => {
  const interrupt = useLangGraphInterruptState();
  const sendCommand = useLangGraphSendCommand();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!interrupt) return null;

  /*************  ✨ Windsurf Command ⭐  *************/
  /**
   * Sends a command to LangGraph to resume the graph with the user's answer.
   * The answer is a JSON object with the question and answer.
   */
  /*******  b4458e7f-2f34-489a-82e2-dcdf6c1ce985  *******/ const respondYes =
    () => {
      const formattedAnswers: Answer[] = interrupt.value.questions.map(
        (question: any) => ({
          question: question.question,
          answer: answers[question.id] || ""
        })
      );
      sendCommand({resume: JSON.stringify(formattedAnswers)});
    };
  const respondNo = () => {
    sendCommand({resume: "no"});
  };

  const questions: QuestionType[] = interrupt.value.questions;
  const questionsWithoutOther = questions.map((question) => ({
    ...question,
    options: question.options?.filter((option) => option !== "Other")
  }));

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
        <div className="flex  gap-2 w-full mt-6">
          <Button onClick={respondYes}>Submit</Button>
          {/* <Button onClick={respondNo}>Reject</Button> */}
        </div>
      </div>
    </div>
  );
};
