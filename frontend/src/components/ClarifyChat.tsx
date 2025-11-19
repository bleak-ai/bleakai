import {HumanMessage} from "@langchain/core/messages";
import {
  BleakAI,
  type ConversationResponse,
  type ToolExecutionProps
} from "bleakai";
import {useEffect, useMemo, useRef, useState, type ComponentType} from "react";
import {AskQuestionTool} from "./tools/AskQuestionTool";

type ToolComponent = ComponentType<ToolExecutionProps>;

const toolComponentMap: Record<string, ToolComponent> = {
  ask_questions_tool: AskQuestionTool
};

export default function ClarifyChat({
  title = "Clarify Chat",
  placeholder = "Type your message...",
  className = ""
}) {
  const [messages, setMessages] = useState<ConversationResponse[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const bleakAI = useMemo(
    () =>
      new BleakAI({
        apiUrl: "http://localhost:8000", // Your backend API URL
        tools: toolComponentMap
      }),
    []
  );

  const conversation = useMemo(
    () => bleakAI.createConversation(`chat-${Date.now()}`),
    [bleakAI]
  );

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Before Starting request
    const userMessage = new HumanMessage(inputText);
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    // Start Request
    try {
      const responses = await conversation.processEvents(
        `clarify/threads/${conversation.getId()}/stream`,
        {input: inputText}
      );
      setMessages((prev) => [...prev, ...responses]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          error: error
        }
      ]);
      setIsLoading(false);
    }
  };

  const handleResume = async (resumeData: string) => {
    setIsLoading(true);
    try {
      const responses = await conversation.processEvents(
        `clarify/threads/${conversation.getId()}/resume`,
        {resume: resumeData}
      );

      console.log("resume responses", responses);

      setMessages((prev) => [...prev, ...responses]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          error: error instanceof Error ? error.message : String(error)
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`max-w-4xl mx-auto h-full flex flex-col font-sans bg-white ${className}`}
    >
      <ChatHeader title={title} />
      <MessageList
        messages={messages}
        isLoading={isLoading}
        onResume={handleResume}
      />
      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        placeholder={placeholder}
      />
    </div>
  );
}

const ChatHeader = ({title}: {title: string}) => (
  <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
    <h1 className="m-0 text-gray-900 text-xl font-semibold tracking-tight">
      {title}
    </h1>
  </div>
);

const EmptyState = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center text-gray-500">
      <p className="text-lg font-medium mb-2">Start a conversation</p>
      <p className="text-sm">
        Type a message below to begin chatting with the AI
      </p>
    </div>
  </div>
);

const LoadingIndicator = () => (
  <div className="flex items-start max-w-2xl self-start animate-slide-in">
    <div className="px-4 py-3 rounded-lg bg-gray-100">
      <div className="flex gap-1.5 items-center">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-1"></span>
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-2"></span>
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-3"></span>
      </div>
    </div>
  </div>
);

const MessageBubble = ({
  message,
  onResume
}: {
  message: ConversationResponse;
  onResume?: (resumeData: string) => void;
}) => {
  if (message.type === "error") {
    return (
      <div className="flex items-start max-w-2xl w-full self-start animate-slide-in">
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 flex-1">
          <p className="font-semibold text-red-900 mb-1 text-sm">Error</p>
          <p className="text-red-700 text-sm">{message.error?.toString()}</p>
        </div>
      </div>
    );
  }

  if (message.type === "tool_call") {
    const ToolComponent = message.tool;

    return (
      <div className={`flex items-start max-w-2xl animate-slide-in `}>
        <div className="px-4 py-3 rounded-lg">
          <ToolComponent args={message.args} onResume={onResume} />
        </div>
      </div>
    );
  }

  const isUser = message.type === "human";
  const bubbleClasses = isUser
    ? "self-end bg-blue-600 text-white rounded-br-none"
    : "self-start bg-gray-100 text-gray-900 rounded-bl-none";

  return (
    <div
      className={`flex items-start max-w-2xl animate-slide-in ${bubbleClasses}`}
    >
      <div className="px-4 py-3 rounded-lg">
        <pre className="font-sans text-sm whitespace-pre-wrap leading-relaxed break-words">
          {message.content}
        </pre>
      </div>
    </div>
  );
};

const MessageList = ({
  messages,
  isLoading,
  onResume
}: {
  messages: ConversationResponse[];
  isLoading: boolean;
  onResume?: (resumeData: string) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, isLoading]);

  const hasMessages = messages.length > 0;
  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4 bg-white"
    >
      {!hasMessages && !isLoading && <EmptyState />}
      {messages.map((msg, index) => (
        <MessageBubble key={index} message={msg} onResume={onResume} />
      ))}
      {isLoading && <LoadingIndicator />}
    </div>
  );
};

const ChatInput = ({
  inputText,
  setInputText,
  onSendMessage,
  isLoading,
  placeholder
}: {
  inputText: string;
  setInputText: (text: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  placeholder: string;
}) => (
  <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-white">
    <div className="flex gap-3 items-center">
      <input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => e.key === "Enter" && onSendMessage()}
        disabled={isLoading}
        className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-base outline-none transition-colors duration-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-300 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 placeholder-gray-400"
      />
      <button
        onClick={onSendMessage}
        disabled={isLoading || !inputText.trim()}
        className="px-5 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-blue-700 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? "Sending..." : "Send"}
      </button>
    </div>
  </div>
);
