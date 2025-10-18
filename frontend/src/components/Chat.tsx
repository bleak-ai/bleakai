"use client";

import {AssistantRuntimeProvider} from "@assistant-ui/react";
import {useLangGraphRuntime} from "@assistant-ui/react-langgraph";
import {useRef} from "react";

import {Thread} from "@/components/assistant-ui/thread";
import {createThread, getThreadState, sendMessage} from "@/utils/chatApi";

export default function Chat() {
  const threadIdRef = useRef<string | undefined>(undefined);
  const runtime = useLangGraphRuntime({
    threadId: threadIdRef.current,
    stream: async (messages, {command}) => {
      if (!threadIdRef.current) {
        const {thread_id} = await createThread();
        threadIdRef.current = thread_id;
      }
      const threadId = threadIdRef.current;
      return sendMessage({
        threadId,
        messages,
        command
      });
    },
    onSwitchToNewThread: async () => {
      const {thread_id} = await createThread();
      threadIdRef.current = thread_id;
    },
    onSwitchToThread: async (threadId) => {
      const state = await getThreadState(threadId);
      threadIdRef.current = threadId;
      return {messages: state.values.messages};
    }
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
