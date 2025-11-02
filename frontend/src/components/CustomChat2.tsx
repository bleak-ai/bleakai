import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {
  processResponse,
  sendStreamRequest,
  type StreamRequest
} from "@/custom2/api2";
import {createContext, useContext, useState} from "react";

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
    setIsLoading(true);

    const chunks = await sendStreamRequest(request);
    console.log("chunks", chunks);

    const cleanedChunks = chunks.map((chunk) => {
      return processResponse(chunk);
    });
    console.log("cleanedChunks", cleanedChunks);
    setIsLoading(false);
    setOutput(chunks);
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
          {output.map((item, index) => (
            <div key={index}>{item}</div>
          ))}
        </div>
      </CardContent>
    </Card>
    // </StreamingContext.Provider>
  );
}
