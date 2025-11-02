import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {
  defaultStreamProcessor,
  streamUtils,
  type ProcessedResponse
} from "@/services/StreamProcessingService";
import {
  defaultToolRegistry,
  toolRegistryUtils
} from "@/services/ToolRegistryService";
import {
  createNewThread,
  getCurrentThreadId,
  sendStreamRequestAsync,
  type StreamRequest
} from "@/utils/api";
import {createContext, useContext, useEffect, useState} from "react";
import {AskQuestionTool} from "./customtools/AskQuestionTool";
import {CreatePromptTool} from "./customtools/CreatePromptTool";
import {EvaluatePromptTool} from "./customtools/EvaluatePromptTool";
import {SuggestImprovementsTool} from "./customtools/SuggestImprovementsTool";
import {TestPromptTool} from "./customtools/TestPromptTool";

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

export default function CustomChat() {
  const [message, setMessage] = useState("");
  const [output, setOutput] = useState<React.ReactNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

  // Initialize thread ID on component mount
  useEffect(() => {
    const existingThreadId = getCurrentThreadId();
    if (existingThreadId) {
      setCurrentThreadId(existingThreadId);
    } else {
      const newThreadId = createNewThread();
      setCurrentThreadId(newThreadId);
    }

    // Register tools with the registry
    registerTools();
  }, []);

  // Register available tools
  const registerTools = () => {
    const tools = [
      toolRegistryUtils.createToolConfig(
        "create_prompt_tool",
        CreatePromptTool
      ),
      toolRegistryUtils.createToolConfig(
        "evaluate_prompt_tool",
        EvaluatePromptTool
      ),
      toolRegistryUtils.createToolConfig("test_prompt_tool", TestPromptTool),
      toolRegistryUtils.createToolConfig(
        "suggest_improvements_tool",
        SuggestImprovementsTool
      ),
      toolRegistryUtils.createToolConfig("ask_questions_tool", AskQuestionTool)
    ];

    toolRegistryUtils.registerTools(tools);
  };

  // Process validated responses and render appropriate components
  const handleProcessedResponse = (response: ProcessedResponse) => {
    if (streamUtils.isToolCall(response)) {
      console.log("cleaned response", response);
      const toolComponent = defaultToolRegistry.getToolComponent(
        response.toolName
      );

      if (toolComponent) {
        // Record tool usage
        defaultToolRegistry.recordToolUsage(response.toolName);

        // Create the tool component with args
        const ToolComponent = toolComponent;
        const itemToRender = (
          <ToolComponent argsText={JSON.stringify(response.args)} />
        );

        setOutput((prev) => [...prev, itemToRender]);
      } else {
        console.warn(`No component registered for tool: ${response.toolName}`);
      }
    } else if (streamUtils.isError(response)) {
      const errorMessage = streamUtils.getErrorMessage(response.error);
      const errorComponent = (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error</h3>
          <p className="text-red-600 text-sm">{errorMessage}</p>
        </div>
      );
      setOutput((prev) => [...prev, errorComponent]);
    }
    // Regular messages are currently not rendered, but could be added here
  };

  // Handle validation errors
  const handleValidationError = (error: any) => {
    const errorComponent = (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">Stream Processing Error</h3>
        <p className="text-red-600 text-sm">
          {error?.message ||
            "An unknown error occurred while processing the stream"}
        </p>
      </div>
    );
    setOutput((prev) => [...prev, errorComponent]);
  };

  // Centralized streaming request wrapper using async/await pattern
  const handleStreamingRequest = async (request: StreamRequest) => {
    setIsLoading(true);

    try {
      // Process the stream using async iteration
      for await (const chunk of sendStreamRequestAsync(request)) {
        // Process the chunk for tool calls and other events
        console.log("chunk", chunk);
        const processedResponses =
          defaultStreamProcessor.processResponse(chunk);
        for (const response of processedResponses) {
          console.log("response", response);
          if (streamUtils.isToolCall(response)) {
            handleProcessedResponse(response);
          } else if (streamUtils.isError(response)) {
            handleValidationError(response.error);
          }
        }
      }
    } catch (error) {
      console.error("Streaming request failed:", error);
      handleValidationError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewThread = () => {
    const newThreadId = createNewThread();
    setCurrentThreadId(newThreadId);
    setOutput([]);
  };

  async function send() {
    if (!message.trim()) return;

    setOutput([]);

    await handleStreamingRequest({
      input: message
    });
  }

  return (
    <StreamingContext.Provider
      value={{handleStreamRequest: handleStreamingRequest}}
    >
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
              onKeyPress={(e) => e.key === "Enter" && send()}
              disabled={isLoading}
            />
            <Button onClick={send} disabled={isLoading || !message.trim()}>
              {isLoading ? "Sending..." : "Send"}
            </Button>
            <Button
              variant="outline"
              onClick={handleNewThread}
              disabled={isLoading}
            >
              New Thread
            </Button>
          </div>
          <div className="space-y-4">
            {output.map((item, index) => (
              <div key={index}>{item}</div>
            ))}
          </div>
        </CardContent>
      </Card>
    </StreamingContext.Provider>
  );
}
