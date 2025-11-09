from typing import Annotated, Literal, TypedDict

from langchain.chat_models import init_chat_model
from langchain_core.messages import BaseMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.types import Command

# Initialize the Chat Model
model = init_chat_model("ollama:granite4:micro", temperature=0.25)


# Define state schema
class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


# Define the node function
def call_model(state: State) -> Command[Literal["__end__"]]:
    response = model.invoke(state["messages"])
    return Command(
        goto=END,
        update={"messages": [response]},
    )


# Create and compile the graph
graph = (
    StateGraph(State).add_node("agent", call_model).add_edge(START, "agent").compile()
)
