import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {useState} from "react";

export type QuestionType = {
  question: string;
  type: "input" | "radio";
  options?: string[];
};

interface QuestionsProps {
  questions: QuestionType[];
  onAnswersChange?: (answers: Record<number, string>) => void;
  answers: Record<number, string>;
}

export default function Questions({
  questions,
  onAnswersChange,
  answers
}: QuestionsProps) {
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  console.log("Answers:", answers);
  const handleInputChange = (questionIndex: number, value: string) => {
    const newAnswers = {...answers, [questionIndex]: value};
    onAnswersChange?.(newAnswers);
  };

  const handleCustomInputChange = (questionIndex: number, value: string) => {
    const newCustomInputs = {...customInputs, [questionIndex]: value};
    setCustomInputs(newCustomInputs);
    // Always update the answer with the actual text value
    handleInputChange(questionIndex, value);
  };

  const renderQuestion = (question: QuestionType, questionIndex: number) => {
    // "Other" is selected if either:
    // 1. The answer is exactly "Other", or
    // 2. The answer is not one of the predefined options (meaning it's custom text)
    const isOtherOption = answers[questionIndex] === "Other";
    const isCustomAnswer =
      answers[questionIndex] &&
      !question.options?.includes(answers[questionIndex]);
    const isOtherSelected = isOtherOption || isCustomAnswer;

    return (
      <div className="space-y-3">
        <RadioGroup
          value={isOtherSelected ? "Other" : answers[questionIndex] || ""}
          onValueChange={(value) => {
            if (value === "Other") {
              // When "Other" is selected, ensure the custom input is focused
              setTimeout(() => {
                const input = document.getElementById(
                  `${questionIndex}-other-input`
                ) as HTMLInputElement;
                input?.focus();
              }, 0);
            }
            handleInputChange(questionIndex, value);
          }}
        >
          {question.options?.map((option) => (
            <div key={option} className="flex items-center space-x-2 ">
              <RadioGroupItem
                value={option}
                id={`${questionIndex}-${option}`}
              />
              <Label
                htmlFor={`${questionIndex}-${option}`}
                className="cursor-pointer"
              >
                {option}
              </Label>
            </div>
          ))}

          <div className="flex items-start space-x-2 ">
            <RadioGroupItem value="Other" id={`${questionIndex}-other`} />
            <div className="flex-1">
              {isOtherSelected ? (
                <div className="">
                  <Input
                    id={`${questionIndex}-other-input`}
                    placeholder="Please specify..."
                    value={
                      isCustomAnswer
                        ? answers[questionIndex]
                        : customInputs[questionIndex] || ""
                    }
                    onChange={(e) =>
                      handleCustomInputChange(questionIndex, e.target.value)
                    }
                    className="w-full"
                    autoFocus
                  />
                </div>
              ) : (
                <Label
                  htmlFor={`${questionIndex}-other`}
                  className="cursor-pointer"
                >
                  Other
                </Label>
              )}
            </div>
          </div>
        </RadioGroup>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-2xl font-bold">Answer this Questions: </div>
      {questions.map((question, index) => (
        <div key={index} className="space-y-2">
          <Label className="font-medium">{question.question}</Label>
          {renderQuestion(question, index)}
        </div>
      ))}
    </div>
  );
}
