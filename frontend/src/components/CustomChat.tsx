import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {
  createNewThread,
  getCurrentThreadId,
  sendStreamRequest,
  type StreamingCallbacks,
  type StreamRequest
} from "@/utils/api";
import {helloWorld} from "bleakai";
import {createContext, useContext, useEffect, useState} from "react";
import {CreatePromptTool} from "./customtools/CreatePromptTool";
import {EvaluatePromptTool} from "./tools/EvaluatePromptTool";

// Context to provide streaming callback to tools
export const StreamingContext = createContext<{
  handleStreamRequest:
    | ((request: StreamRequest, callbacks: StreamingCallbacks) => Promise<void>)
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
  helloWorld();
  const [message, setMessage] = useState("");
  const [output, setOutput] = useState<React.ReactNode[]>([]); // store React elements, not strings
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
  }, []);

  // Centralized response handler for all streaming responses
  const handleStreamResponse = (chunk: string) => {
    try {
      // Parse the JSON response
      const jsonData = JSON.parse(chunk);

      console.log("Received JSON data:", jsonData);

      // Handle array of responses
      const responses = Array.isArray(jsonData) ? jsonData : [jsonData];
      for (const response of responses) {
        try {
          const key = Object.keys(response)[0];
          console.log("Received response:", key);

          // Extract args from tool calls for both cases
          const messages = response[key]?.messages || [];
          console.log("Received messages:", messages);
          const toolCalls = messages
            .flatMap((msg) => msg.kwargs?.tool_calls || msg.tool_calls || [])
            .filter((call) => call?.args);
          console.log("Received tool calls:", toolCalls);
          const args = toolCalls[0]?.args || {};

          console.log("Received args:", args);

          if (key === "generate_or_improve_prompt") {
            const itemToRender = (
              <CreatePromptTool argsText={JSON.stringify(args)} />
            );
            setOutput((prev) => [...prev, itemToRender]);
          } else if (key == "evaluate_prompt_node") {
            const itemToRender = (
              <EvaluatePromptTool argsText={JSON.stringify(args)} />
            );
            setOutput((prev) => [...prev, itemToRender]);
          } else {
            // setOutput((prev) => [
            //   ...prev,
            //   <pre key={Math.random()}>
            //     {JSON.stringify(response, null, 2)}
            //   </pre>
            // ]);
          }
        } catch (err) {
          console.log("Error parsing JSON:", err);
          // If parsing fails, display the raw chunk
          setOutput((prev) => [...prev, <pre>{chunk}</pre>]);
        }
      }
    } catch (err) {
      console.log("Error parsing JSON:", err);
      // If parsing fails, display the raw chunk
      setOutput((prev) => [...prev, <pre>{chunk}</pre>]);
    }
  };

  // Centralized streaming request wrapper
  const handleStreamingRequest = async (
    request: StreamRequest,
    callbacks: StreamingCallbacks
  ) => {
    setIsLoading(true);
    callbacks.onStart?.();

    await sendStreamRequest(request, (chunk) => {
      callbacks.onResponse(chunk);
      handleStreamResponse(chunk); // Process in CustomChat
    });

    setIsLoading(false);
    callbacks.onComplete?.();
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
        onResponse: (chunk) => {
          console.log("Send response chunk:", chunk);
        },
        onComplete: () => console.log("Message send completed"),
        onError: (error) => console.error("Message send error:", error)
      }
    );
  }

  return (
    <StreamingContext.Provider
      value={{handleStreamRequest: handleStreamingRequest}}
    >
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>LangGraph Stream Demo</CardTitle>
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
          {output && (
            <pre className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap overflow-auto max-h-96">
              {output}
            </pre>
          )}
        </CardContent>
      </Card>
    </StreamingContext.Provider>
  );
}
