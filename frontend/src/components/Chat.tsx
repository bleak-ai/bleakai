import {
  Bleakai,
  type CustomToolProps,
  type ProcessedResponse,
  type StreamRequest
} from "bleakai/src";
import type {ComponentType} from "react"; // <-- Import React-specific types here
import React from "react";
import {AskQuestionTool} from "./tools/AskQuestionTool";
import {CreatePromptTool} from "./tools/CreatePromptTool";
import {EvaluatePromptTool} from "./tools/EvaluatePromptTool";
import {SuggestImprovementsTool} from "./tools/SuggestImprovementsTool";
import {TestPromptTool} from "./tools/TestPromptTool";

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

export default function CustomChat() {
  const [inputText, setInputText] = React.useState("");
  const [responses, setResponses] = React.useState<
    ProcessedResponse<ToolComponent>[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const bleakaiInstance = new Bleakai<ToolComponent>({
    url: "http://localhost:8000/stream",
    tools: toolComponentMap // The config now matches BleakaiConfig<ToolComponent>
  });

  const handleInitialRequest = async () => {
    if (!inputText.trim() || isLoading) return;

    // Add user message to responses
    const userMessage: ProcessedResponse<ToolComponent> = {
      type: "message",
      data: inputText,
      content: inputText,
      sender: "user"
    };

    setResponses((prev) => [...prev, userMessage]);
    await handleStreamingRequest({input: inputText});
    setInputText("");
  };

  const handleStreamingRequest = async (request: StreamRequest) => {
    console.log("request", request);
    setIsLoading(true);

    try {
      // Send the request and get processed responses directly
      const processedResponses = await bleakaiInstance.stream(request);

      console.log("processedResponses", processedResponses);

      // Append new responses to existing ones instead of replacing
      setResponses((prev) => [...prev, ...processedResponses]);
    } catch (error) {
      console.error("Error handling streaming request:", error);
      // Add error message to responses
      const errorMessage: ProcessedResponse<ToolComponent> = {
        type: "error",
        data: "Error: Failed to process request. Please try again."
      };
      setResponses((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnCommand = async (resumeData: string) => {
    return await handleStreamingRequest({
      input: "",
      command: {resume: resumeData}
    });
  };

  return (
    <div className="max-w-4xl mx-auto min-h-[50vh] flex flex-col font-sans">
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <h2 className="m-0 text-slate-700 text-2xl font-semibold">
          Prompt Optimization Agent
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-white">
        {responses.map((response, index) => {
          if (response.type === "message") {
            const isUserMessage = response.sender === "user";
            const isAiMessage = response.sender === "ai";

            return (
              <div
                key={index}
                className={`flex items-start p-3 rounded-xl max-w-full animate-slide-in ${
                  isUserMessage
                    ? "bg-blue-50 self-end rounded-br-sm"
                    : isAiMessage
                    ? "bg-green-50 self-start rounded-bl-sm"
                    : "bg-gray-50 self-start"
                }`}
              >
                <div className="flex-1 text-slate-700 leading-6 break-words">
                  <div
                    className={`font-semibold mb-1 ${
                      isUserMessage
                        ? "text-blue-700"
                        : isAiMessage
                        ? "text-green-700"
                        : "text-gray-700"
                    }`}
                  >
                    {isUserMessage ? "You:" : isAiMessage ? "AI:" : "Message:"}
                  </div>
                  <pre>
                    {response.content || JSON.stringify(response.data, null, 2)}
                  </pre>
                </div>
              </div>
            );
          }

          if (response.type === "error") {
            return (
              <div
                key={index}
                className="flex items-start p-3 rounded-xl max-w-full bg-red-50 border border-red-200 self-start animate-slide-in"
              >
                <div className="flex-1 text-slate-700 leading-6 break-words">
                  <div className="font-semibold text-red-700 mb-1">Error:</div>
                  {response.error?.toString() ||
                    response.data ||
                    "Unknown error occurred"}
                </div>
              </div>
            );
          }

          if (response.type === "other") {
            // return (
            //   <div
            //     key={index}
            //     className="flex items-start p-3 rounded-xl max-w-full bg-gray-50 border border-gray-200 self-start animate-slide-in"
            //   >
            //     <div className="flex-1 text-slate-700 leading-6 break-words">
            //       <div className="font-semibold text-gray-700 mb-1">System Message:</div>
            //       <pre>{JSON.stringify(response.data, null, 2)}</pre>
            //     </div>
            //   </div>
            // );
            return null;
          }

          if (response.type !== "tool_call") {
            return (
              <div
                key={index}
                className="flex items-start p-3 rounded-xl max-w-full bg-yellow-50 self-center border border-yellow-200 animate-slide-in"
              >
                <div className="flex-1 text-slate-700 leading-6 break-words">
                  <em>Unknown response type: {response.type}</em>
                </div>
              </div>
            );
          }

          // `response.tool` is now correctly typed as `ToolComponent | undefined`
          const ToolComponent = response.tool;

          if (!ToolComponent) {
            return (
              <div
                key={index}
                className="flex items-start p-3 rounded-xl max-w-full bg-red-50 border border-red-200 self-start animate-slide-in"
              >
                <div className="flex-1 text-slate-700 leading-6 break-words">
                  Tool component not found for: {response.toolName}
                </div>
              </div>
            );
          }

          return (
            <div
              key={index}
              className="self-start w-full animate-slide-in mb-4"
            >
              <ToolComponent
                args={response.args} // Remember to update your tools to accept `args` object
                onCommand={handleOnCommand}
              />
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start p-3 rounded-xl max-w-full bg-gray-100 self-start rounded-bl-sm animate-slide-in">
            <div className="flex-1 text-slate-700 leading-6 break-words">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-typing-1"></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-typing-2"></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-typing-3"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 p-5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Write a prompt to optimize..."
          onKeyDown={(e) => e.key === "Enter" && handleInitialRequest()}
          disabled={isLoading}
          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-full text-base outline-none transition-all duration-200 focus:border-blue-500 focus:shadow-blue-100 focus:shadow-sm disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          onClick={handleInitialRequest}
          disabled={isLoading || !inputText.trim()}
          className="px-6 py-3 bg-blue-500 text-white border-0 rounded-full text-base font-semibold cursor-pointer transition-all duration-200 hover:bg-blue-600 active:scale-95 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
