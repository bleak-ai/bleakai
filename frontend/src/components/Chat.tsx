"use client";

import {AssistantRuntimeProvider} from "@assistant-ui/react";
import {useLangGraphRuntime} from "@assistant-ui/react-langgraph";
import React, {useState} from "react";

import {Thread} from "@/components/assistant-ui/thread";
import {createThread, sendMessage} from "@/utils/chatApi";
import {getAssistantId} from "@/config/assistants";

interface ChatProps {
  assistantKey?: string;
}

export default function Chat({ assistantKey = 'default' }: ChatProps) {
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    // Check if user has beta access bypass
    const initializeChat = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log("Initializing a new chat thread...");
        const {thread_id} = await createThread();
        setCurrentThreadId(thread_id);
        console.log("Successfully initialized thread with ID:", thread_id);
      } catch (err) {
        console.error("Failed to initialize chat thread:", err);
        setError("Could not start the chat. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [assistantKey]);

  const runtime = useLangGraphRuntime({
    stream: async (messages, config) => {
      if (!currentThreadId) {
        throw new Error("Cannot send message: Thread is not initialized.");
      }

      console.log(`Streaming message to thread: ${currentThreadId} with assistant: ${assistantKey}`);

      const assistantId = getAssistantId(assistantKey);
      const stream = await sendMessage({
        config,
        threadId: currentThreadId,
        messages,
        assistantId
      });

      return stream;
    }
    // TODO: Use `create` or `load` when fixed
  });

  if (isLoading) {
    return <div>Initializing Chat...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <>
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </>
  );
}
