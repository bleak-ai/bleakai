"use client";

import {Bleakai, type ProcessedResponse} from "bleakai";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";

//==============================================================================
// 1. TYPE DEFINITIONS (Unchanged, but good to keep separate)
//==============================================================================

export interface BasicChatProps {
  /** Optional custom title for the chat interface */
  title?: string;
  /** Optional placeholder text for the input field */
  placeholder?: string;
  /** Optional className for additional styling */
  className?: string;
}

interface ChatMessage {
  type: "human" | "ai" | "error";
  content: string;
  error?: string;
}

const API_BASE_URL = "http://localhost:8000";

//==============================================================================
// 2. MAIN COMPONENT (Clean, readable, and focused on layout)
//==============================================================================

export function BasicChat({
  title = "Chat",
  placeholder = "Type your message...",
  className = ""
}: BasicChatProps) {
  const {messages, inputText, isLoading, setInputText, handleSendMessage} =
    useChatHandler();

  return (
    <div
      className={`max-w-4xl mx-auto h-full flex flex-col font-sans bg-white ${className}`}
    >
      <ChatHeader title={title} />
      <MessageList messages={messages} isLoading={isLoading} />
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

//==============================================================================
// 3. CUSTOM HOOK (Separates logic from UI)
//==============================================================================

function useChatHandler() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Memoize the Bleakai instance so it's not recreated on every render
  const bleakai = useMemo(() => new Bleakai({tools: {}}), []);

  // Use a ref to hold the thread instance, ensuring it persists across renders
  const threadRef = useRef(bleakai.createThread(`basic-chat-${Date.now()}`));

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {type: "human", content: inputText};
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const threadId = threadRef.current.getId();
      const response = fetch(
        `${API_BASE_URL}/basic/threads/${threadId}/stream`,
        {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({input: userMessage.content})
        }
      );

      const processedResponses = await bleakai.handleCustomRequest(response);

      const newAiMessages = processedResponses.map(
        (res: ProcessedResponse<any>): ChatMessage => {
          switch (res.type) {
            case "ai":
            case "other":
              return {type: "ai", content: res.content};
            case "error":
              return {
                type: "error",
                content: "",
                error: res.error?.toString() ?? "An unknown error occurred"
              };
            default:
              // Fallback for any unexpected response types
              return {
                type: "ai",
                content: "Received an unsupported response type."
              };
          }
        }
      );

      setMessages((prev) => [...prev, ...newAiMessages]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        type: "error",
        content: "",
        error: error instanceof Error ? error.message : String(error)
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, bleakai]);

  return {
    messages,
    inputText,
    isLoading,
    setInputText,
    handleSendMessage
  };
}

//==============================================================================
// 4. UI SUB-COMPONENTS (Breaks down the view into manageable pieces)
//==============================================================================

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

const MessageBubble = ({message}: {message: ChatMessage}) => {
  if (message.type === "error") {
    return (
      <div className="flex items-start max-w-2xl w-full self-start animate-slide-in">
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 flex-1">
          <p className="font-semibold text-red-900 mb-1 text-sm">Error</p>
          <p className="text-red-700 text-sm">{message.error}</p>
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
  isLoading
}: {
  messages: ChatMessage[];
  isLoading: boolean;
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
        <MessageBubble key={index} message={msg} />
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
