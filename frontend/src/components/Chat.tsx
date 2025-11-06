import {
  Bleakai,
  Thread,
  type CustomToolProps,
  type ProcessedResponse
} from "bleakai/src";
import type {ComponentType} from "react"; // <-- Import React-specific types here
import React from "react";
import {AskQuestionTool} from "./tools/AskQuestionTool";
import {CreatePromptTool} from "./tools/CreatePromptTool";
import {EvaluatePromptTool} from "./tools/EvaluatePromptTool";
import {SuggestImprovementsTool} from "./tools/SuggestImprovementsTool";
import {TestPromptTool} from "./tools/TestPromptTool";
import {Button} from "./ui/button";

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

  const appendResponse = (
    response:
      | ProcessedResponse<ToolComponent>
      | ProcessedResponse<ToolComponent>[]
  ) =>
    setResponses((prev) => [
      ...prev,
      ...(Array.isArray(response) ? response : [response])
    ]);

  const handleRequest = async (
    action: () => Promise<ProcessedResponse<ToolComponent>[]>
  ) => {
    setIsLoading(true);
    try {
      appendResponse(await action());
    } catch (error) {
      appendResponse({type: "error", data: error});
    } finally {
      setIsLoading(false);
    }
  };

  // Custom request handlers

  const bleakai = React.useMemo(
    () =>
      new Bleakai<ToolComponent>({
        tools: toolComponentMap,
        requestHandlers: {
          handleMessage: async (input: string, threadId?: string) => {
            return fetch(`http://localhost:8000/threads/${threadId}/stream`, {
              method: "POST",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({
                input
              })
            });
          },
          handleResume: async (resumeData: string, threadId?: string) => {
            return fetch(`http://localhost:8000/threads/${threadId}/resume`, {
              method: "POST",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({
                resume: resumeData
              })
            });
          },
          handleRetry: async (threadId?: string) => {
            return fetch(`http://localhost:8000/threads/${threadId}/retry`, {
              method: "POST",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({})
            });
          }
        }
      }),
    []
  );

  const thread = React.useMemo(
    () => bleakai.createThread(`chat-session-${Date.now()}`),
    [bleakai]
  );

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    appendResponse({
      type: "message",
      data: inputText,
      content: inputText,
      sender: "user"
    });
    setInputText("");
    await handleRequest(() => thread.send(inputText));
  };

  const handleOnCommand = async (resumeData: string) => {
    handleRequest(() => thread.resume(resumeData));
  };

  const handleRetry = async () => {
    handleRequest(() => thread.retry());
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col font-sans bg-white">
      <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <h1 className="m-0 text-gray-900 text-xl font-semibold tracking-tight">
          Prompt Optimization
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4 bg-white">
        {responses.map((response, index) => {
          if (response.type === "message") {
            const isUserMessage = response.sender === "user";
            const isAiMessage = response.sender === "ai";

            return (
              <div
                key={index}
                className={`flex items-start max-w-2xl animate-slide-in ${
                  isUserMessage ? "self-end" : "self-start"
                }`}
              >
                <div
                  className={`px-4 py-3 rounded-lg ${
                    isUserMessage
                      ? "bg-gray-900 text-white rounded-br-none"
                      : "bg-gray-100 text-gray-900 rounded-bl-none"
                  }`}
                >
                  <div className="flex-1 leading-relaxed break-words">
                    <pre className="font-mono text-sm whitespace-pre-wrap">
                      {response.content ||
                        JSON.stringify(response.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            );
          }

          if (response.type === "error") {
            return (
              <div
                key={index}
                className="flex items-start max-w-2xl w-full self-start animate-slide-in"
              >
                <div className="px-4 py-3 rounded-lg bg-white border border-gray-300 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1 text-sm">
                        Error
                      </div>
                      <div className="text-gray-600 text-sm">
                        {response.error?.toString() ||
                          response.data?.toString() ||
                          "Unknown error occurred"}
                      </div>
                    </div>
                    <Button
                      onClick={handleRetry}
                      className="flex-shrink-0 text-sm"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            );
          }

          if (response.type === "other") {
            return null;
          }

          if (response.type !== "tool_call") {
            return (
              <div
                key={index}
                className="flex items-start max-w-2xl self-center animate-slide-in"
              >
                <div className="px-4 py-3 rounded-lg bg-gray-100 text-gray-600 text-sm">
                  Unknown response type: {response.type}
                </div>
              </div>
            );
          }

          const ToolComponent = response.tool;

          if (!ToolComponent) {
            return (
              <div
                key={index}
                className="flex items-start max-w-2xl self-start animate-slide-in"
              >
                <div className="px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-600 text-sm">
                  Tool component not found: {response.toolName}
                </div>
              </div>
            );
          }

          return (
            <div
              key={index}
              className="self-start w-full animate-slide-in mb-4"
            >
              <ToolComponent args={response.args} onCommand={handleOnCommand} />
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start max-w-2xl self-start animate-slide-in">
            <div className="px-4 py-3 rounded-lg bg-gray-100">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-1"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-2"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-3"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-white">
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Optimize your prompt..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-base outline-none transition-colors duration-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 placeholder-gray-400"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputText.trim()}
            className="px-5 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-gray-800 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
