import { BaseMessage, type MessageType } from "@langchain/core/messages";
export interface ConversationEvent {
    type: "input" | "tool_call" | "error";
    content?: string;
    toolName?: string;
    toolArgs?: any;
    tool?: any;
    error?: string;
}
export interface BleakAIConfig {
    tools?: Record<string, any>;
    apiUrl?: string;
}
export interface ToolExecutionProps {
    args: any;
    onResume: (resumeData: string) => Promise<void>;
}
export interface EventHandlers {
    onInput?: (content: string) => void | Promise<void>;
    onToolCall?: (toolName: string, toolArgs: any) => void | Promise<void>;
    onError?: (error: string) => void | Promise<void>;
}
export interface ConversationResponse {
    type: MessageType;
    message?: BaseMessage;
    toolName?: string;
    args?: Record<string, any>;
    content?: string | any;
    tool?: any;
    error?: unknown;
}
export declare class Conversation {
    private bleakAI;
    private conversationId;
    constructor(bleakAI: BleakAI, conversationId: string);
    getId(): string;
    sendInput(url: string, body: Record<string, unknown>): AsyncGenerator<ConversationEvent>;
    processEvents(url: string, body: Record<string, unknown>): Promise<ConversationResponse[]>;
}
export declare class EventHandler {
    private handlers;
    onInput(callback: (content: string) => void | Promise<void>): this;
    onToolCall(callback: (toolName: string, toolArgs: any) => void | Promise<void>): this;
    onError(callback: (error: string) => void | Promise<void>): this;
    getHandlers(): EventHandlers;
}
export declare class BleakAI {
    private tools;
    private apiUrl;
    constructor(config?: BleakAIConfig);
    getApiUrl(): string;
    createConversation(conversationId: string): Conversation;
    getTools(): Record<string, any>;
}
