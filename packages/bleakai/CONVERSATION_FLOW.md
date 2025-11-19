# BleakAI Conversation Flow Guide

This document explains how the BleakAI BleakConversation class processes streaming responses from LangGraph endpoints and converts them into structured conversation events.

## Local vs Backend Events

The naming convention distinguishes between:

- **Bleak Events**: Local events handled by the BleakAI SDK (`BleakEvent`, `BleakResponse`)
- **LangChain Events**: Backend events from the LangGraph system (`messages`, `updates`, `done`, `error`)

## Overview

The conversation system works with Server-Sent Events (SSE) from a LangGraph backend. The streaming data contains information about AI responses, tool calls, and conversation updates that need to be parsed and converted into standardized events.

## Flow Diagram

```
User Input → streamConversationEvents() → makeStreamingRequest() → processStreamingResponse()
                                                                          ↓
                                                          readSSEStream() → processSSEData()
                                                                          ↓
                                                                    parseSSELineToJSON()
                                                                          ↓
                                                                    extractLangChainEventsFromMessage()
                                                                          ↓
                                                                    BleakEvent[]
```

## Step-by-Step Process

### 1. Entry Point: `streamConversationEvents()`
- **Purpose**: Main public method for starting a conversation
- **Input**: URL endpoint and request body
- **Process**:
  1. Makes HTTP request via `makeStreamingRequest()`
  2. Processes the streaming response via `processStreamingResponse()`
  3. Yields conversation events as they come in
- **Output**: AsyncGenerator of `BleakEvent` objects

### 2. HTTP Request: `makeStreamingRequest()`
- **Purpose**: Makes the actual HTTP POST request to the API
- **Process**:
  1. Builds the full URL using the configured API URL
  2. Makes POST request with JSON headers
  3. Validates response is successful (2xx)
  4. Throws error if request fails
- **Output**: Response object for streaming

### 3. Stream Coordination: `processStreamingResponse()`
- **Purpose**: Coordinates between stream reading and data processing
- **Process**:
  1. Calls `readSSEStream()` to read SSE data
  2. Passes parsed data to `processSSEData()` for processing
  3. Yields resulting conversation events
- **Output**: Yields `BleakEvent` objects

### 4. Stream Reading: `readSSEStream()`
- **Purpose**: Reads raw SSE stream data from HTTP response
- **Process**:
  1. Gets a readable stream from the response
  2. Reads data chunk by chunk
  3. Splits chunks into individual SSE lines
  4. Parses each line using `parseSSELineToJSON()`
  5. Yields parsed SSE data objects
- **Output**: AsyncGenerator yielding parsed SSE data

### 5. Data Processing: `processSSEData()`
- **Purpose**: Processes parsed SSE data and converts to conversation events
- **Process**:
  1. Handles different response types (done, error, messages, updates)
  2. Extracts conversation events from LangChain data using `extractLangChainEventsFromMessage()`
  3. Yields `BleakEvent` objects
- **Output**: AsyncGenerator yielding `BleakEvent` objects

### 6. SSE Parsing: `parseSSELineToJSON()`
- **Purpose**: Parses individual Server-Sent Event lines
- **Process**:
  1. Skips SSE comments (lines starting with `:`)
  2. Skips empty lines
  3. Removes `data: ` prefix from data lines
  4. Parses JSON from the line content
  5. Returns null for invalid/unparseable lines
- **Output**: Parsed JSON object or null

### 7. Event Extraction: `extractLangChainEventsFromMessage()`
- **Purpose**: Converts LangChain message data into conversation events
- **Process**:
  1. Iterates through message groups from LangChain
  2. Extracts tool calls from `kwargs.tool_calls`
  3. Handles raw message content (strings)
  4. Creates standardized `BleakEvent` objects
- **Output**: Generator of `BleakEvent` objects

## Response Types

The system handles several types of SSE responses:

### 1. "done" Response
- **Format**: `{"type": "done"}`
- **Action**: Ends the stream processing

### 2. "error" Response
- **Format**: `{"type": "error", "error": "error message"}`
- **Action**: Yields an error event and ends the stream

### 3. Array Response (LangChain Data)
- **Format**: `["messages", {...}]` or `["updates", {...}]`
- **Messages**: Contains conversation messages and tool calls
- **Updates**: Contains node/state updates from the LangGraph

### 4. Raw LangChain Response
- **Format**: Direct LangChain message object
- **Used for**: Resume endpoints and direct message processing

## Event Types

The system produces these `BleakEvent` types (local BleakAI events):

### 1. "input" Event
- **Source**: AI message content from LangChain
- **Contains**: `content` field with the AI response text

### 2. "tool_call" Event
- **Source**: Tool calls from LangChain `kwargs.tool_calls`
- **Contains**: `toolName` and `toolArgs` for the tool invocation

### 3. "error" Event
- **Source**: Network errors, parsing errors, or server errors
- **Contains**: `error` field with error message

## Usage Example

```typescript
const conversation = bleakAI.createConversation("conversation-123");

// Stream BleakEvents from the conversation
for await (const event of conversation.streamConversationEvents("chat", {
  message: "Hello, can you help me?"
})) {
  switch (event.type) {
    case "input":
      console.log("AI:", event.content);
      break;
    case "tool_call":
      console.log("Tool called:", event.toolName, event.toolArgs);
      break;
    case "error":
      console.error("Error:", event.error);
      break;
  }
}
```

## Error Handling

The system handles errors at multiple levels:
1. **Network errors**: HTTP request failures
2. **Stream errors**: Connection issues during streaming
3. **Parse errors**: Invalid JSON or malformed SSE data
4. **Server errors**: Error responses from the backend

All errors are converted to "error" type BleakEvents and yielded to the caller.