import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {
  processResponse,
  sendStreamRequest,
  type ProcessedResponse,
  type StreamRequest
} from "@/custom2/api2";
import {createContext, useContext, useState} from "react";
import {AskQuestionTool} from "./customtools/AskQuestionTool";
import {CreatePromptTool} from "./customtools/CreatePromptTool";
import {EvaluatePromptTool} from "./customtools/EvaluatePromptTool";
import {SuggestImprovementsTool} from "./customtools/SuggestImprovementsTool";
import {TestPromptTool} from "./customtools/TestPromptTool";

const tools = {
  create_prompt_tool: CreatePromptTool,
  evaluate_prompt_tool: EvaluatePromptTool,
  test_prompt_tool: TestPromptTool,
  suggest_improvements_tool: SuggestImprovementsTool,
  ask_questions_tool: AskQuestionTool
};

// Context to provide streaming callback to tools
export const StreamingContext = createContext<{
  handleStreamRequest: ((request: StreamRequest) => Promise<void>) | null;
}>({
  handleStreamRequest: null
});

// Hook to use streaming context
export const useStreaming = () => {
  const context = useContext(StreamingContext);
  if (!context) {
    throw new Error("useStreaming must be used within a StreamingProvider");
  }
  return context;
};

export default function CustomChat2() {
  const [message, setMessage] = useState("");
  const [output, setOutput] = useState<React.ReactNode[]>([]);
  const [responses, setResponses] = useState<ProcessedResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

  async function sendMainChatMessage() {
    if (!message.trim()) return;

    setOutput([]);

    console.log("message", message);

    await handleStreamingRequest({
      input: message
    });
  }

  const handleStreamingRequest = async (request: StreamRequest) => {
    console.log("request", request);
    setIsLoading(true);

    const chunks = await sendStreamRequest(request);
    console.log("chunks", chunks);

    const cleanedChunks = chunks
      .map((chunk) => {
        return processResponse(chunk);
      })
      .flatMap((chunk) => chunk);
    console.log("cleanedChunks", cleanedChunks);
    setIsLoading(false);
    setOutput(chunks);
    setResponses(cleanedChunks);
  };

  return (
    // <StreamingContext.Provider
    //   value={{handleStreamRequest: (e: any) => await {}}}
    // >
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>LangGraph Stream Demo (Centralized)</CardTitle>
        {currentThreadId && (
          <div className="text-sm text-muted-foreground">
            Thread ID:{" "}
            <code className="bg-muted px-1 rounded">{currentThreadId}</code>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            id="msg"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMainChatMessage()}
            disabled={isLoading}
          />
          <Button
            onClick={sendMainChatMessage}
            disabled={isLoading || !message.trim()}
          >
            {isLoading ? "Sending..." : "Send"}
          </Button>
          {/* <Button
            variant="outline"
            onClick={handleNewThread}
            disabled={isLoading}
          >
            New Thread
          </Button> */}
        </div>
        <div className="space-y-4">
          {/* {output.map((item, index) => (
            <div key={index}>{item}</div>
          ))} */}
          {responses.map((response, index) => {
            console.log("response", response);
            const ToolComponent = tools[response.toolName ?? ""];
            console.log("ToolComponent", ToolComponent);
            if (!ToolComponent) {
              return <span> Tool not found: {response.toolName}</span>;
            }
            return (
              <ToolComponent
                key={index}
                argsText={JSON.stringify(response.args)}
                onCommand={handleStreamingRequest}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
    // </StreamingContext.Provider>
  );
}
