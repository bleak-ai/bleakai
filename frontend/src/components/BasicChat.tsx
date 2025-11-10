"use client";

import {Bleakai, type ProcessedResponse} from "bleakai";
import React from "react";

export interface BasicChatProps {
  /**
   * Optional custom title for the chat interface
   */
  title?: string;
  /**
   * Optional placeholder text for the input field
   */
  placeholder?: string;
  /**
   * Optional className for additional styling
   */
  className?: string;
}

interface BasicChatResponse {
  type: "human" | "ai" | "error";
  content: string;
  error?: string;
}

export function BasicChat({
  title = "Chat",
  placeholder = "Type your message...",
  className = ""
}: BasicChatProps) {
  const [inputText, setInputText] = React.useState("");
  const [responses, setResponses] = React.useState<BasicChatResponse[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [responses, isLoading]);

  const appendResponse = (response: BasicChatResponse | BasicChatResponse[]) =>
    setResponses((prev) => [
      ...prev,
      ...(Array.isArray(response) ? response : [response])
    ]);

  const handleRequest = async (action: () => Promise<BasicChatResponse[]>) => {
    setIsLoading(true);
    try {
      appendResponse(await action());
    } catch (error) {
      appendResponse({
        type: "error",
        content: "",
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const bleakai = React.useMemo(
    () =>
      new Bleakai({
        tools: {},
        requestHandlers: {
          handleMessageStream: async (input: string, threadId?: string) => {
            return fetch(
              `http://localhost:8000/basic/threads/${threadId}/stream`,
              {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({input})
              }
            );
          },
          handleResume: async (resumeData: string, threadId?: string) => {
            return fetch(
              `http://localhost:8000/basic/threads/${threadId}/resume`,
              {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({resume: resumeData})
              }
            );
          },
          handleRetry: async (threadId?: string) => {
            return fetch(
              `http://localhost:8000/basic/threads/${threadId}/retry`,
              {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({})
              }
            );
          }
        }
      }),
    []
  );

  const threadRef = React.useRef(
    bleakai.createThread(`basic-chat-${Date.now()}`)
  );
  const thread = threadRef.current;

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userInput = inputText;
    appendResponse({
      type: "human",
      content: userInput
    });
    setInputText("");

    await handleRequest(async () => {
      const processedResponses = await thread.send(userInput);

      console.log("processedResponses: ", processedResponses);
      return processedResponses.map((response: ProcessedResponse<any>) => {
        if (response.type === "ai") {
          return {
            type: "ai" as const,
            content: response.content
          };
        } else if (response.type === "other") {
          return {
            type: "ai" as const,
            content: response.content
          };
        } else if (response.type === "error") {
          return {
            type: "error" as const,
            content: "",
            error: response.error?.toString() || "Unknown error occurred"
          };
        }
        return {
          type: "ai" as const,
          content: "Received unsupported response type"
        };
      });
    });
  };

  const handleRetry = async () => {
    await handleRequest(async () => {
      const processedResponses = await thread.retry();
      console.log("processedResponses retry: ", processedResponses);

      return processedResponses.map((response: ProcessedResponse<any>) => {
        if (response.type === "ai") {
          return {
            type: "ai" as const,
            content: response.content
          };
        } else if (response.type === "error") {
          return {
            type: "error" as const,
            content: "",
            error: response.error?.toString() || "Unknown error occurred"
          };
        }
        return {
          type: "ai" as const,
          content: "Received unsupported response type"
        };
      });
    });
  };

  return (
    <div
      className={`max-w-4xl mx-auto h-full flex flex-col font-sans bg-white ${className}`}
    >
      <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <h1 className="m-0 text-gray-900 text-xl font-semibold tracking-tight">
          {title}
        </h1>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4 bg-white"
      >
        {responses.map((response, index) => {
          const isUserMessage = response.type === "human";
          const isAiMessage = response.type === "ai";
          const isErrorMessage = response.type === "error";

          if (isErrorMessage) {
            return (
              <div
                key={index}
                className="flex items-start max-w-2xl w-full self-start animate-slide-in"
              >
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-red-900 mb-1 text-sm">
                        Error
                      </div>
                      <div className="text-red-700 text-sm">
                        {response.error || "Unknown error occurred"}
                      </div>
                    </div>
                    <button
                      onClick={handleRetry}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={index}
              className={`flex items-start max-w-2xl animate-slide-in ${
                isUserMessage ? "self-end" : "self-start"
              }`}
            >
              <div
                className={`px-4 py-3 rounded-lg ${
                  isUserMessage
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-100 text-gray-900 rounded-bl-none"
                }`}
              >
                <div className="flex-1 leading-relaxed break-words">
                  <pre className="font-mono text-sm whitespace-pre-wrap">
                    {response.content}
                  </pre>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start max-w-2xl self-start animate-slide-in">
            <div className="px-4 py-3 rounded-lg bg-gray-100">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-1"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-2"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-3"></span>
              </div>
            </div>
          </div>
        )}

        {responses.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium mb-2">Start a conversation</p>
              <p className="text-sm">
                Type a message below to begin chatting with the AI
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-white">
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-base outline-none transition-colors duration-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-300 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 placeholder-gray-400"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputText.trim()}
            className="px-5 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-blue-700 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
