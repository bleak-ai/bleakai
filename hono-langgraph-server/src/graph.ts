import {initChatModel} from "langchain/chat_models/universal";

import {BaseMessage} from "@langchain/core/messages";
import {Annotation, END, START, StateGraph} from "@langchain/langgraph";

// Initialize the Chat Model
const model = await initChatModel("ollama:granite4:micro", {
  temperature: 0.25
});

// Define a simple tool for demonstration
const tools = []; // Add tools here if needed

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y)
  })
});

async function callModel(state: typeof StateAnnotation.State) {
  const response = await model.invoke(state.messages);
  return {messages: [response]};
}

// Create the graph
const graph = new StateGraph(StateAnnotation)
  .addNode("agent", callModel)
  .addEdge(START, "agent")
  .addEdge("agent", END)
  .compile();

export {graph};
