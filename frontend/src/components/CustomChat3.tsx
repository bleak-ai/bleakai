import {
  Bleakai,
  type CustomToolProps,
  type ProcessedResponse,
  type StreamRequest
} from "bleakai";
import type {ComponentType} from "react"; // <-- Import React-specific types here
import React from "react";
import {AskQuestionTool} from "./customtools/AskQuestionTool";
import {CreatePromptTool} from "./customtools/CreatePromptTool";
import {EvaluatePromptTool} from "./customtools/EvaluatePromptTool";
import {SuggestImprovementsTool} from "./customtools/SuggestImprovementsTool";
import {TestPromptTool} from "./customtools/TestPromptTool";

// Example tool class for demonstration

const toolComponentMap: Record<string, ToolComponent> = {
  create_prompt_tool: CreatePromptTool,
  evaluate_prompt_tool: EvaluatePromptTool,
  test_prompt_tool: TestPromptTool,
  suggest_improvements_tool: SuggestImprovementsTool,
  ask_questions_tool: AskQuestionTool
};

// 2. Define the specific type for your tool. This will be used as the generic parameter.
type ToolComponent = ComponentType<CustomToolProps>;

export default function CustomChat3() {
  const [inputText, setInputText] = React.useState("");
  const [responses, setResponses] = React.useState<
    ProcessedResponse<ToolComponent>[]
  >([]);
  const bleakaiInstance = new Bleakai<ToolComponent>({
    url: "http://localhost:8000/stream",
    tools: toolComponentMap // The config now matches BleakaiConfig<ToolComponent>
  });

  // const handleStream = async () => {
  //   if (!inputText.trim()) return;
  //   const response = await bleakaiInstance.stream({
  //     input: inputText
  //   });
  //   console.log("Stream response:", response);
  //   setResponses(response);
  //   setInputText(""); // Clear input after submission
  // };
  const handleInitialRequest = async () => {
    if (!inputText.trim()) return;
    await handleStreamingRequest({input: inputText});
    setInputText("");
  };

  const handleStreamingRequest = async (request: StreamRequest) => {
    console.log("request", request);
    // setIsLoading(true);

    try {
      // Send the request and get processed responses directly
      const processedResponses = await bleakaiInstance.stream(request);

      console.log("processedResponses", processedResponses);

      setResponses(processedResponses);
    } catch (error) {
      console.error("Error handling streaming request:", error);
    } finally {
      // setIsLoading(false);
    }
  };

  const handleOnCommand = async (resumeData: string) => {
    return await handleStreamingRequest({
      input: "",
      command: {resume: resumeData}
    });
  };

  return (
    <div>
      <h2>CustomChat3 - Bleakai Instance</h2>
      <input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Enter text..."
      />
      <button onClick={handleInitialRequest}>Send</button>

      {responses.map((response, index) => {
        if (response.type !== "tool_call") {
          return <pre key={index}>No tool call</pre>;
        }

        // `response.tool` is now correctly typed as `ToolComponent | undefined`
        const ToolComponent = response.tool;

        if (!ToolComponent) {
          return (
            <span key={index}>
              Tool component not found for: {response.toolName}
            </span>
          );
        }

        return (
          <ToolComponent
            key={index}
            args={response.args} // Remember to update your tools to accept `args` object
            onCommand={handleOnCommand}
          />
        );
      })}
    </div>
  );
}
