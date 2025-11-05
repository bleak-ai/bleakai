import {Bleakai, type ProcessedResponse, type StreamRequest} from "bleakai";
import React from "react";
import {AskQuestionTool} from "./customtools/AskQuestionTool";
import {CreatePromptTool} from "./customtools/CreatePromptTool";
import {EvaluatePromptTool} from "./customtools/EvaluatePromptTool";
import {SuggestImprovementsTool} from "./customtools/SuggestImprovementsTool";
import {TestPromptTool} from "./customtools/TestPromptTool";
// Example tool class for demonstration

const tools = {
  create_prompt_tool: CreatePromptTool,
  evaluate_prompt_tool: EvaluatePromptTool,
  test_prompt_tool: TestPromptTool,
  suggest_improvements_tool: SuggestImprovementsTool,
  ask_questions_tool: AskQuestionTool
};

export default function CustomChat3() {
  const [inputText, setInputText] = React.useState("");
  const [responses, setResponses] = React.useState<ProcessedResponse[]>([]);
  const bleakaiInstance = new Bleakai({
    url: "http://localhost:8000/stream",
    headers: {"Content-Type": "application/json"}
  });

  const handleStream = async () => {
    if (!inputText.trim()) return;
    const response = await bleakaiInstance.stream({
      input: inputText
    });
    console.log("Stream response:", response);
    setResponses(response);
    setInputText(""); // Clear input after submission
  };

  const handleStreamingRequest = async (request: StreamRequest) => {
    console.log("request", request);
    // setIsLoading(true);

    const responses: ProcessedResponse[] = [];

    try {
      for await (const processed of bleakaiInstance.streamLive(request)) {
        console.log("Chunk received:", processed);
        responses.push(...processed);
        setResponses([...responses]); // live updates
      }

      console.log("All responses:", responses);
      setResponses(responses);
    } catch (err) {
      console.error("Streaming error:", err);
    } finally {
      // setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>CustomChat3 - Bleakai Instance</h2>
      <input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Enter text..."
        style={{marginRight: "8px", padding: "4px"}}
      />
      <button onClick={handleStream}>ok</button>
      <p>Check console for Bleakai stream response</p>

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
  );
}
