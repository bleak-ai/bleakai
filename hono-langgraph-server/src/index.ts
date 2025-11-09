import {HumanMessage, BaseMessage} from "@langchain/core/messages";
import {Hono} from "hono";
import {graph} from "./graph";

const app = new Hono();

interface ChatRequest {
  message: string;
}

interface ChatResponse {
  messages: ProcessedMessage[];
  error?: string;
}

interface ProcessedMessage {
  type: string;
  content?: string;
  [key: string]: any;
}

function processMessages(messages: BaseMessage[]): ProcessedMessage[] {
  return messages.map((msg) => {
    const data = (msg as any).data ?? {};
    return {
      type: msg.type,
      content: msg.content,
      ...data,
    };
  });
}

app.post("/chat", async (c) => {
  try {
    const {message} = await c.req.json<ChatRequest>();

    if (!message || typeof message !== "string") {
      return c.json<ChatResponse>({messages: [], error: "Invalid message"}, 400);
    }

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const streamResponse = await graph.stream(
            {
              messages: [new HumanMessage(message)]
            },
            {streamMode: "values"}
          );

          for await (const chunk of streamResponse) {
            if (chunk.messages && chunk.messages.length > 0) {
              const processedMessages = processMessages(chunk.messages);
              const latestMessage = processedMessages[processedMessages.length - 1];

              if (latestMessage && latestMessage.content) {
                const data = `data: ${JSON.stringify(latestMessage)}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }
          }

          const doneData = `data: ${JSON.stringify({type: "done"})}\n\n`;
          controller.enqueue(encoder.encode(doneData));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          const errorData = `data: ${JSON.stringify({type: "error", error: "Streaming failed"})}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return c.json<ChatResponse>({messages: [], error: "Failed to process message"}, 500);
  }
});

export default app;

import {serve} from "@hono/node-server";

const port = parseInt(process.env.PORT || "3000");

serve({
  fetch: app.fetch,
  port
});

console.log(`🤖 Chatbot running on http://localhost:${port}`);
