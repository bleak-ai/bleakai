import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";

type QuestionType = {
  question: string;
  type: "input" | "radio";
  options?: string[];
  id: string;
};

interface QuestionsProps {
  questions: QuestionType[];
  onAnswersChange?: (answers: Record<string, string>) => void;
  answers: Record<string, string>;
}

export default function Questions({
  questions,
  onAnswersChange,
  answers
}: QuestionsProps) {
  const handleInputChange = (questionId: string, value: string) => {
    const newAnswers = {...answers, [questionId]: value};
    onAnswersChange?.(newAnswers);
  };

  const renderQuestion = (question: QuestionType) => {
    switch (question.type) {
      case "input":
        return (
          <Input
            placeholder="Type your answer..."
            value={answers[question.id] || ""}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
          />
        );
      case "radio":
        return (
          <RadioGroup
            value={answers[question.id] || ""}
            onValueChange={(value) => handleInputChange(question.id, value)}
          >
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option}
                  id={`${question.id}-${option}`}
                />
                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {questions.map((question, index) => (
        <div key={index} className="space-y-2">
          {index}
          <Label className="font-medium">{question.question}</Label>
          {renderQuestion(question)}
        </div>
      ))}
    </div>
  );
}
