from typing import List, Literal

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langgraph.graph import START, StateGraph
from langgraph.graph.message import MessagesState
from langgraph.types import Command, interrupt
from pydantic import BaseModel

load_dotenv()


class Question(BaseModel):
    """Represents a question to be asked to the user."""

    question: str
    options: List[str]  # Only for radio questions


class QuestionsOutput(BaseModel):
    questions: List[Question]


class InputGraphState(MessagesState):
    """_"""


class GraphState(InputGraphState):
    goal: str
    context: str
    output_format: str
    role: str
    questions: List[Question]


llm = init_chat_model("google_genai:gemini-2.5-flash-lite")


async def clarify_prompt(state: GraphState) -> Command[Literal["human_clarify_prompt"]]:
    """"""
    messages = state.get("messages", [])
    prompt = f"""
  
    Based on the user message, please do questions to the user that help you define the goal, context, output_format and role.
    
    The user message is:
    {messages}
    
    Return the questions as an array of JSON objects.
    questions: [
        {{"id": "q1", "question": "question1", "options":["option1", "option2", "option3"]}},
    ]
    
    Never include Other in the options.
    
    Format your response as a JSON array of questions with:
    - "question": the question text
    - "options": an array of options.
  """

    llm_with_structured = llm.with_structured_output(QuestionsOutput)
    response = llm_with_structured.invoke([("human", prompt)])

    print("Questions:")
    print(response)

    return Command(
        goto="human_clarify_prompt", update={"questions": response.questions}
    )


async def human_clarify_prompt(state: GraphState) -> Command[Literal["__end__"]]:
    """"""
    # messages = state.get("messages", [])
    # questions = messages[-1]
    questions = state.get("questions", [])

    print("Last message:")
    print(questions)

    answers = interrupt({"questions": questions})

    return Command(goto="clarify_prompt")


graph_builder = StateGraph(GraphState)


graph_builder.add_node("clarify_prompt", clarify_prompt)
graph_builder.add_node("human_clarify_prompt", human_clarify_prompt)

graph_builder.add_edge(START, "clarify_prompt")

graph = graph_builder.compile()
