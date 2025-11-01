import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {useState} from "react";
import {CreatePromptTool} from "./tools/CreatePromptTool";

export default function CustomChat() {
  const [message, setMessage] = useState("");
  const [output, setOutput] = useState<React.ReactNode[]>([]); // store React elements, not strings
  const [isLoading, setIsLoading] = useState(false);

  async function send() {
    if (!message.trim()) return;

    setIsLoading(true);
    setOutput([]);

    try {
      const res = await fetch("http://localhost:8000/stream", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({input: {input: message}})
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);

          try {
            // Parse the JSON response
            const jsonData = JSON.parse(chunk);

            console.log("Received JSON data:", jsonData);

            // Handle array of responses
            const responses = Array.isArray(jsonData) ? jsonData : [jsonData];

            for (const response of responses) {
              const key = Object.keys(response)[0];
              console.log("Received response:", key);

              if (key === "generate_or_improve_prompt") {
                const itemToRender = (
                  <CreatePromptTool argsText={JSON.stringify(response[key])} />
                );
                setOutput((prev) => [...prev, itemToRender]);
              } else {
                setOutput((prev) => [
                  ...prev,
                  <pre key={Math.random()}>
                    {JSON.stringify(response, null, 2)}
                  </pre>
                ]);
              }
            }
          } catch {
            // If parsing fails, display the raw chunk
            setOutput((prev) => [...prev, <pre>{chunk}</pre>]);
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setOutput(["Error: Failed to connect to server"]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>LangGraph Stream Demo</CardTitle>
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
        </div>
        {output && (
          <pre className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap overflow-auto max-h-96">
            {output}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
