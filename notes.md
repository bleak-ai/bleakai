1. Context is needed for handleStreamingRequest, this ensures that every request triggered in the tools will be redirected through here

2. handleStreamREquest receives as a paramater whatever that we want to send to the backend (input or resume)

3. Then after sending the request to backend we receive the chunk which is something like this
   [
   {"generate_or_improve_prompt": {"messages": [{"lc": 1, "type": "constructor", "id": ["langchain", "schema", "messages", "AIMessage"], "kwargs": {"content": "", "response_metadata": {"model": "granite4:micro", "created_at": "2025-11-01T23:13:11.677705Z", "done": true, "done_reason": "stop", "total_duration": 1075783167, "load_duration": 67332292, "prompt_eval_count": 305, "prompt_eval_duration": 421023667, "eval_count": 46, "eval_duration": 576142252, "model_name": "granite4:micro", "model_provider": "ollama"}, "type": "ai", "id": "lc_run--7c2794c0-eb43-41e1-8566-593a29a81cc6-0", "tool_calls": [{"name": "create_prompt_tool", "args": {"prompt": "Write a tweet (less than 140 characters) that shares a personal anecdote or experience, using a friendly and informal tone."}, "id": "92198089-fbdf-438f-8c46-d081c521b04a", "type": "tool_call"}], "usage_metadata": {"input_tokens": 305, "output_tokens": 46, "total_tokens": 351}, "invalid_tool_calls": []}}], "prompt": "Write a tweet (less than 140 characters) that shares a personal anecdote or experience, using a friendly and informal tone."}},
   {"**interrupt**": [{"lc": 1, "type": "not_implemented", "id": ["langgraph", "types", "Interrupt"], "repr": "Interrupt(value={'prompt': 'Write a tweet (less than 140 characters) that shares a personal anecdote or experience, using a friendly and informal tone.'}, id='1813a7083379bd9e6d5babd24caefd82')"}]}]

4. Then we iterate through each of this objects (responses) and we process them

if (streamUtils.isToolCall(response)) {
handleProcessedResponse(response);
} else if (streamUtils.isError(response)) {
handleValidationError(response.error);
}
isToolCall(response: ProcessedResponse): response is ProcessedResponse & {
type: "tool_call";
toolName: string;
args: any;
} {
return response.type === "tool_call" && !!response.toolName;
},

5. Here there is also a transform of the response, where we start from what we receive from the backend, with the kwargs and everything, and we end up with everything much more polised
   const processedResponses =
   defaultStreamProcessor.processResponse(chunk);

6. In handleProcessedRespoonse, we see if there is a mtatch of the tool and we return it.

(Tools are registered in the beggining of the component or somewhere else)

///////// Steps to implement this.

1.
