from typing import Literal

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import MessagesState
from langgraph.types import Command

load_dotenv()


class InputGraphState(MessagesState):
    """_"""


class GraphState(InputGraphState):
    goal: str
    context: str
    output_format: str
    role: str


llm = init_chat_model("google_genai:gemini-2.5-flash-lite")


async def clarify_prompt(state: GraphState) -> Command[Literal["__end__"]]:
    """"""
    messages = state.get("messages", [])
    prompt = """
  
    Based on the user message, please do questions to the user that help you define the goal, context, output_format and role.
    
    The user message is:
    {messages}
  
  """

    response = llm.invoke([("human", prompt)])

    return Command(goto=END, update={"messages": response.content})


graph_builder = StateGraph(GraphState)


graph_builder.add_node("clarify_prompt", clarify_prompt)

graph_builder.add_edge(START, "clarify_prompt")

graph = graph_builder.compile()
