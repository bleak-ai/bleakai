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
  sendStreamRequestWithRetry,
  type AdvancedStreamCallbacks,
  type StreamRequest
} from "@/utils/api";
import {createContext, useContext, useEffect, useState} from "react";
import {AskQuestionTool} from "./customtools/AskQuestionTool";
import {CreatePromptTool} from "./customtools/CreatePromptTool";
import {SuggestImprovementsTool} from "./customtools/SuggestImprovementsTool";
import {TestPromptTool} from "./customtools/TestPromptTool";
import {EvaluatePromptTool} from "./tools/EvaluatePromptTool";

// Context to provide streaming callback to tools
export const StreamingContext = createContext<{
  handleStreamRequest:
    | ((
        request: StreamRequest,
        callbacks: AdvancedStreamCallbacks
      ) => Promise<void>)
    | null;
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
        "generate_or_improve_prompt",
        CreatePromptTool
      ),
      toolRegistryUtils.createToolConfig(
        "evaluate_prompt_node",
        EvaluatePromptTool
      ),
      toolRegistryUtils.createToolConfig("test_prompt", TestPromptTool),
      toolRegistryUtils.createToolConfig(
        "autoimprove",
        SuggestImprovementsTool
      ),
      toolRegistryUtils.createToolConfig("ask_questions_node", AskQuestionTool)
    ];

    toolRegistryUtils.registerTools(tools);
  };

  // Process validated responses and render appropriate components
  const handleProcessedResponse = (response: ProcessedResponse) => {
    if (streamUtils.isToolCall(response)) {
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

  // Centralized streaming request wrapper using simplified API
  const handleStreamingRequest = async (
    request: StreamRequest,
    callbacks: AdvancedStreamCallbacks
  ) => {
    setIsLoading(true);

    const enhancedCallbacks: AdvancedStreamCallbacks = {
      ...callbacks,
      onResponse: (chunk: string) => {
        // Handle the raw response chunk
        callbacks.onResponse?.(chunk);

        // Process the chunk for tool calls and other events
        const processedResponses =
          defaultStreamProcessor.processResponse(chunk);
        for (const response of processedResponses) {
          if (streamUtils.isToolCall(response)) {
            handleProcessedResponse(response);
          } else if (streamUtils.isError(response)) {
            handleValidationError(response.error);
          }
        }
      }
    };

    await sendStreamRequestWithRetry(request, enhancedCallbacks, {
      maxRetries: 3,
      retryDelay: 1000
    });

    setIsLoading(false);
  };

  const handleNewThread = () => {
    const newThreadId = createNewThread();
    setCurrentThreadId(newThreadId);
    setOutput([]);
  };

  async function send() {
    if (!message.trim()) return;

    setOutput([]);

    await handleStreamingRequest(
      {
        input: {input: message}
      },
      {
        onStart: () => console.log("Starting message send..."),
        onResponse: (chunk: string) => {
          console.log("Raw response chunk:", chunk);
        },
        onComplete: () => console.log("Message send completed"),
        onError: (error: Error) => console.error("Message send error:", error)
      }
    );
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
