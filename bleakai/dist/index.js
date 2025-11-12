function* parseLangChainEvents(messages) {
    for (const item of messages) {
        if (item.lc === 1 && item.type === "constructor" && item.kwargs) {
            const kwargs = item.kwargs;
            // Handle tool calls
            const toolCalls = kwargs.tool_calls || [];
            for (const toolCall of toolCalls) {
                if (toolCall.name && toolCall.args) {
                    yield {
                        type: "tool_call",
                        toolName: toolCall.name,
                        toolArgs: toolCall.args
                    };
                }
            }
            // Handle regular content
            if (kwargs.content &&
                typeof kwargs.content === "string" &&
                kwargs.content.trim()) {
                yield {
                    type: "input",
                    content: kwargs.content.trim()
                };
            }
        }
    }
}
export class Conversation {
    constructor(bleakAI, conversationId) {
        this.bleakAI = bleakAI;
        this.conversationId = conversationId;
    }
    getId() {
        return this.conversationId;
    }
    async *sendInput(url, body) {
        const apiUrl = this.bleakAI.getApiUrl();
        const response = await fetch(`${apiUrl}/${url}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            yield { type: "error", error: `HTTP error! status: ${response.status}` };
            return;
        }
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) {
            yield { type: "error", error: "Response body is not readable" };
            return;
        }
        let accumulatedContent = "";
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            // Skip SSE comments and empty lines
                            if (line.startsWith(":"))
                                continue;
                            // Parse SSE data lines (remove "data: " prefix)
                            let jsonResponse = line;
                            if (line.startsWith("data: ")) {
                                jsonResponse = line.substring(6);
                            }
                            const response = JSON.parse(jsonResponse);
                            if (response.type === "done") {
                                // DO NOTHING
                                // if (accumulatedContent.trim()) {
                                //   yield {type: "message", content: accumulatedContent.trim()};
                                // }
                                // yield {type: "done"};
                                return;
                            }
                            else if (response.type === "error") {
                                yield {
                                    type: "error",
                                    error: response.error || "An unknown error occurred"
                                };
                                return;
                            }
                            else if (Array.isArray(response)) {
                                const [type, data] = response;
                                switch (type) {
                                    case "messages":
                                        accumulatedContent = "";
                                        yield* parseLangChainEvents(data);
                                        break;
                                    case "updates":
                                        const nodeName = Object.values(data)[0];
                                        const innerMessages = nodeName &&
                                            typeof nodeName === "object" &&
                                            "messages" in nodeName
                                            ? nodeName.messages
                                            : undefined;
                                        if (innerMessages && Array.isArray(innerMessages)) {
                                            yield* parseLangChainEvents(innerMessages);
                                        }
                                        break;
                                }
                            }
                            else {
                                // Handle raw LangChain messages (for resume endpoints)
                                yield* parseLangChainEvents([response]);
                            }
                        }
                        catch (parseError) {
                            console.error("Failed to parse stream data:", parseError);
                        }
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    async processEvents(url, body) {
        const responses = [];
        for await (const event of this.sendInput(url, body)) {
            switch (event.type) {
                case "input":
                    if (event.content && event.content.trim()) {
                        responses.push({
                            type: "ai",
                            content: event.content
                        });
                    }
                    break;
                case "tool_call":
                    if (event.toolName && event.toolArgs) {
                        const tool = this.bleakAI.getTools()[event.toolName];
                        responses.push({
                            type: "tool_call",
                            toolName: event.toolName,
                            args: event.toolArgs,
                            tool
                        });
                    }
                    break;
                case "error":
                    responses.push({
                        type: "error",
                        error: event.error
                    });
                    break;
            }
        }
        return responses;
    }
}
export class EventHandler {
    constructor() {
        this.handlers = {};
    }
    onInput(callback) {
        this.handlers.onInput = callback;
        return this;
    }
    onToolCall(callback) {
        this.handlers.onToolCall = callback;
        return this;
    }
    onError(callback) {
        this.handlers.onError = callback;
        return this;
    }
    getHandlers() {
        return { ...this.handlers };
    }
}
export class BleakAI {
    constructor(config = {}) {
        this.tools = config.tools || {};
        this.apiUrl = config.apiUrl || "http://localhost:8000";
    }
    getApiUrl() {
        return this.apiUrl;
    }
    createConversation(conversationId) {
        return new Conversation(this, conversationId);
    }
    getTools() {
        return this.tools;
    }
}
