import {
  type LangChainMessage,
  type LangGraphSendMessageConfig
} from "@assistant-ui/react-langgraph";
import {Client, type ThreadState} from "@langchain/langgraph-sdk";

const createClient = () => {
  const apiUrl =
    import.meta.env.VITE_PUBLIC_LANGGRAPH_API_URL ||
    new URL("/api", window.location.href).href;
  return new Client({
    apiUrl
  });
};

export const createThread = async () => {
  const client = createClient();
  return client.threads.create();
};

export const getThreadState = async (
  threadId: string
): Promise<ThreadState<{messages: LangChainMessage[]}>> => {
  const client = createClient();
  return client.threads.getState(threadId);
};

export const sendMessage = async (params: {
  threadId: string;
  messages?: LangChainMessage[];
  config?: LangGraphSendMessageConfig;
  assistantId?: string;
}) => {
  const client = createClient();
  const config = params.config ?? {};
  const assistantId = params.assistantId || import.meta.env.VITE_PUBLIC_LANGGRAPH_ASSISTANT_ID;

  return client.runs.stream(
    params.threadId,
    assistantId,
    {
      input: params.messages?.length
        ? {
            messages: params.messages
          }
        : null,
      streamMode: ["messages"],
      ...config
    }
  );
};
