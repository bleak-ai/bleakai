# BleakAI

A powerful TypeScript/JavaScript library for building conversational AI interfaces with tool support. Built on top of LangChain and designed for seamless integration with React applications.

## Features

- 🚀 **Easy Integration**: Simple API for creating AI conversations
- 🛠️ **Tool Support**: Built-in support for custom tools and UI components
- 📡 **Real-time Streaming**: Server-sent events for responsive chat experiences
- 💬 **Message Types**: Support for human messages, AI responses, and tool calls
- ⚡ **TypeScript First**: Full TypeScript support with comprehensive types
- 🎯 **React Ready**: Designed specifically for React component integration

## Installation

```bash
npm install bleakai
```

## Quick Start

### Basic Setup

```typescript
import { BleakAI } from 'bleakai';

// Initialize BleakAI
const bleakAI = new BleakAI({
  apiUrl: 'http://localhost:8000' // Your backend API URL
});

// Create a conversation
const conversation = bleakAI.createConversation('my-conversation-id');
```

### React Integration

Here's a simplified example of how to integrate BleakAI into a React component:

```tsx
import React, { useState, useRef } from 'react';
import { HumanMessage } from '@langchain/core/messages';
import { BleakAI, type BleakResponse } from 'bleakai';

export default function ChatInterface() {
  const [messages, setMessages] = useState<BleakResponse[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const bleakAI = new BleakAI({
    apiUrl: 'http://localhost:8000'
  });

  const conversation = bleakAI.createConversation(`chat-${Date.now()}`);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = new HumanMessage(inputText);
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const responses = await conversation.processEvents(
        `threads/${conversation.getId()}/stream`,
        { input: inputText }
      );

      setMessages(prev => [...prev, ...responses]);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'error',
        error: error instanceof Error ? error.message : String(error)
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      {/* Messages */}
      <div className="messages">
        {messages.map((message, index) => (
          <div key={index}>
            {message.type === 'human' && (
              <div className="user-message">{message.content}</div>
            )}
            {message.type === 'ai' && (
              <div className="ai-message">{message.content}</div>
            )}
            {message.type === 'tool_call' && (
              <div className="tool-call">
                {message.toolName}: {JSON.stringify(message.args)}
              </div>
            )}
            {message.type === 'error' && (
              <div className="error">Error: {message.error}</div>
            )}
          </div>
        ))}
        {isLoading && <div className="typing-indicator">...</div>}
      </div>

      {/* Input */}
      <div className="input-area">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button onClick={sendMessage} disabled={isLoading || !inputText.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
```

## Tools Integration

BleakAI supports custom tools that can render UI components and handle user interactions.

### Defining Tools

```typescript
import type { ToolExecutionProps } from 'bleakai';

// Tool component
const AskQuestionTool = ({ args, onResume }: ToolExecutionProps) => {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    onResume(answer);
  };

  return (
    <div className="tool-component">
      <h3>Question: {args.question}</h3>
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Your answer..."
      />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
};

// Tool registration
const bleakAI = new BleakAI({
  tools: {
    ask_question_tool: AskQuestionTool,
    // Add more tools here
  },
  apiUrl: 'http://localhost:8000'
});
```

### Tool Props

Tool components receive these props:

- `args`: Arguments passed from the AI to the tool
- `onResume`: Function to call when the tool is completed with user data

## API Reference

### BleakAI Class

#### Constructor

```typescript
const bleakAI = new BleakAI(config: BleakAIConfig)
```

**Config Options:**
- `tools?: Record<string, any>` - Map of tool names to React components
- `apiUrl?: string` - Backend API URL (default: 'http://localhost:8000')

#### Methods

- `createConversation(conversationId: string): BleakConversation` - Creates a new conversation
- `getApiUrl(): string` - Returns the configured API URL
- `getTools(): Record<string, any>` - Returns the registered tools

### BleakConversation Class

#### Methods

- `getId(): string` - Returns the conversation ID
- `processEvents(url: string, body: Record<string, unknown>): Promise<BleakResponse[]>` - Sends input and processes responses
- `sendInput(url: string, body: Record<string, unknown>): AsyncGenerator<BleakEvent>` - Streams responses in real-time

### Types

```typescript
interface BleakResponse {
  type: 'human' | 'ai' | 'tool_call' | 'error';
  content?: string;
  toolName?: string;
  args?: Record<string, any>;
  tool?: any;
  error?: unknown;
}

interface ToolExecutionProps {
  args: any;
  onResume: (resumeData: string) => Promise<void>;
}
```

## Message Types

- **human**: User messages sent to the AI
- **ai**: AI responses
- **tool_call**: Tool execution requests from the AI
- **error**: Error messages

## Backend Integration

Your backend should provide endpoints that support Server-Sent Events (SSE):

```typescript
// Example backend endpoints
POST /threads/{conversationId}/stream
POST /threads/{conversationId}/resume
```

The backend should send events in the following format:
```
data: ["messages", [langchain_message_data]]
data: ["updates", {node_name: {messages: [message_data]}}]
data: {"type": "done"}
```

## Examples

### Error Handling

```typescript
try {
  const responses = await conversation.processEvents(
    `threads/${conversation.getId()}/stream`,
    { input: userInput }
  );

  // Process responses
  responses.forEach(response => {
    if (response.type === 'error') {
      console.error('Conversation error:', response.error);
    }
  });
} catch (error) {
  console.error('Network error:', error);
}
```

### Tool Resume

```typescript
const handleResume = async (resumeData: string) => {
  const responses = await conversation.processEvents(
    `threads/${conversation.getId()}/resume`,
    { resume: resumeData }
  );

  setMessages(prev => [...prev, ...responses]);
};
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions, please use the GitHub issue tracker.