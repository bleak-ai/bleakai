import {type ToolCallMessagePartComponent} from "@assistant-ui/react";
import {useLangGraphSendCommand} from "@assistant-ui/react-langgraph";
import {useState} from "react";
import Questions, {type QuestionType} from "../Questions";
import {Button} from "../ui/button";

type Answer = {
  question: string;
  answer: string;
};

export const AskQuestionTool: ToolCallMessagePartComponent = ({argsText}) => {
  const sendCommand = useLangGraphSendCommand();

  // const interrupt = useLangGraphInterruptState();
  // const questions: QuestionType[] = interrupt?.value.questions ?? [];
  const questions: QuestionType[] = JSON.parse(argsText).questions;

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const questionsWithoutOther = questions.map((question) => ({
    ...question,
    options: question.options?.filter((option) => option !== "Other")
  }));

  const handleSubmit = () => {
    setSubmitted(true);
    const formattedAnswers: Answer[] = questionsWithoutOther.map(
      (question: QuestionType, index) => ({
        question: question.question,
        answer: answers[index] || ""
      })
    );
    sendCommand({resume: JSON.stringify(formattedAnswers)});
  };

  const handleAnswersChange = (newAnswers: Record<number, string>) => {
    setAnswers(newAnswers);
  };

  return (
    <div className="aui-assistant-message-root relative mx-auto w-full max-w-[var(--thread-max-width)] animate-in py-4 duration-200 fade-in slide-in-from-bottom-1">
      <div className="flex flex-col gap-2">
        <div>
          <Questions
            questions={questionsWithoutOther}
            onAnswersChange={handleAnswersChange}
            answers={answers}
          />
        </div>
        <div className="flex gap-2 w-full mt-6">
          {!submitted ? (
            <Button onClick={handleSubmit}>Submit</Button>
          ) : (
            <p> Answers sent. Generating response... </p>
          )}
        </div>
      </div>
    </div>
  );
};
