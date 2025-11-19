"use client";

import {BleakAI, type BleakMessage, createUserMessage} from "bleakai";
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
  const [messages, setMessages] = useState<BleakMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Memoize the BleakAI instance so it's not recreated on every render
  const bleakAI = useMemo(
    () =>
      new BleakAI({
        tools: {},
        apiUrl: "http://localhost:8000"
      }),
    []
  );

  // Use a ref to hold the conversation instance, ensuring it persists across renders
  const conversationRef = useRef(
    bleakAI.createConversation(`basic-chat-${Date.now()}`)
  );
  const conversation = conversationRef.current;

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = createUserMessage(inputText);
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const responses = await conversation.processEvents(
        `basic/threads/${conversation.getId()}/stream`,
        {input: inputText}
      );

      console.log("responses", responses);

      setMessages((prev) => [...prev, ...responses]);
    } catch (error) {
      const errorMessage: BleakMessage = {
        type: "error",
        message: error instanceof Error ? error.message : String(error)
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, conversation]);

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

const MessageBubble = ({message}: {message: BleakMessage}) => {
  if (message.type === "error") {
    return (
      <div className="flex items-start max-w-2xl w-full self-start animate-slide-in">
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 flex-1">
          <p className="font-semibold text-red-900 mb-1 text-sm">Error</p>
          <p className="text-red-700 text-sm">{message.message}</p>
        </div>
      </div>
    );
  }

  if (message.type === "tool") {
    return (
      <div className="flex items-start max-w-2xl w-full self-start animate-slide-in">
        <div className="px-4 py-3 rounded-lg bg-purple-50 border border-purple-200 flex-1">
          <p className="font-semibold text-purple-900 mb-1 text-sm">Tool Call</p>
          <p className="text-purple-700 text-sm">Tool: {message.toolName}</p>
          <pre className="text-purple-600 text-xs mt-1">{JSON.stringify(message.args, null, 2)}</pre>
        </div>
      </div>
    );
  }

  if (message.type === "interrupt") {
    return (
      <div className="flex items-start max-w-2xl w-full self-start animate-slide-in">
        <div className="px-4 py-3 rounded-lg bg-yellow-50 border border-yellow-200 flex-1">
          <p className="font-semibold text-yellow-900 mb-1 text-sm">Interrupt</p>
          <p className="text-yellow-700 text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // text message
  const isUser = message.role === "user";
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
  messages: BleakMessage[];
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
