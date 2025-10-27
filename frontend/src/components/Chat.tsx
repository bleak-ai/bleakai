"use client";

import {AssistantRuntimeProvider} from "@assistant-ui/react";
import {useLangGraphRuntime} from "@assistant-ui/react-langgraph";
import React, {useState} from "react";

import {Thread} from "@/components/assistant-ui/thread";
import {BetaBlockerModal} from "@/components/BetaBlockerModal";
import {createThread, sendMessage} from "@/utils/chatApi";
import {hasBetaAccessBypass} from "@/utils/url";

export default function Chat() {
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBetaBlocker, setShowBetaBlocker] = useState(false);

  React.useEffect(() => {
    // Check if user has beta access bypass
    if (!hasBetaAccessBypass()) {
      setShowBetaBlocker(true);
      setIsLoading(false);
      return;
    }

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
  }, []);
  const runtime = useLangGraphRuntime({
    stream: async (messages, config) => {
      if (!currentThreadId) {
        throw new Error("Cannot send message: Thread is not initialized.");
      }

      console.log(`Streaming message to thread: ${currentThreadId}`);

      const stream = await sendMessage({
        config,
        threadId: currentThreadId,
        messages
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
      <BetaBlockerModal
        isOpen={showBetaBlocker}
        onClose={() => setShowBetaBlocker(false)}
      />
      {!showBetaBlocker && (
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread />
        </AssistantRuntimeProvider>
      )}
    </>
  );
}
