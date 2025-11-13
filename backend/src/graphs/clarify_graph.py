import operator
import os
from typing import Annotated, List, Literal, TypedDict

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import MessageLikeRepresentation
from langchain_core.tools import tool
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt
from pydantic import BaseModel

load_dotenv()


class Question(BaseModel):
    """Represents a question to be asked to the user."""

    question: str
    options: List[str]  # Only for radio questions


class Answer(BaseModel):
    question: str
    answer: str


class QuestionsOutput(BaseModel):
    questions: List[Question]


class GraphState(TypedDict):
    messages: Annotated[list[MessageLikeRepresentation], operator.add]
    questions_made: bool


@tool(description="Tool to ask questions to the user.")
def ask_questions_tool(questions: List[Question]) -> Command[Literal["answer"]]:
    """"""

    answers = interrupt({"questions": questions})

    return answers


# llm = init_chat_model("google_genai:gemini-2.5-flash-lite")
llm_model = os.environ["LLM_MODEL"]
llm = init_chat_model(llm_model)


async def clarify_prompt(
    state: GraphState,
) -> Command[Literal["tool_supervisor", "answer"]]:
    """"""
    print("clarify state")
    messages = state.get("messages", [])
    questions_made = state.get("questions_made", False)

    if questions_made:
        return Command(goto="answer")

    prompt = f"""
    Your goal is to call the tool ask_questions_tool with the right paramters.

    Based on the user message, please do questions to the user that help you define the goal, context, output_format and role.

    The user message is:
    {messages}

    Call the tool with the questions as an array of JSON objects.
    questions: [
        {{"id": "q1", "question": "question1", "options":["option1", "option2", "option3"]}},
    ]

    3 or 4 QUESTIONS, NO MORE

    Never include Other in the options.

    DO NOT RETURN ANYHITNG. JUST CALL THE TOOL ask_questions_tool with the right options
  """

    tools = [ask_questions_tool]

    llm_with_tools = llm.bind_tools(tools)

    # llm_with_structured = llm.with_structured_output(QuestionsOutput)
    response = llm_with_tools.invoke([("human", prompt)])

    return Command(goto="tool_supervisor", update={"messages": [response]})


async def tool_supervisor(state: GraphState) -> Command[Literal["answer"]]:
    """Process the tool calls from clarify_prompt and invoke the ask_questions_tool."""
    messages = state.get("messages", "")
    last_message = messages[-1]

    for tool_call in last_message.tool_calls:
        tool_args = tool_call["args"]

        answers = ask_questions_tool.invoke(tool_args)

    return Command(
        goto="answer", update={"messages": [answers], "questions_made": True}
    )


async def answer(state: GraphState) -> Command[Literal["__end__"]]:
    """"""

    messages = state.get("messages", [])

    prompt = f"""   
    Answer the following question of the user based on the message and answers
    
    The messages are:
    {messages}
    """

    res = llm.invoke(prompt)

    return Command(goto=END, update={"messages": [res.content]})


graph_builder = StateGraph(GraphState)


graph_builder.add_node("clarify_prompt", clarify_prompt)
graph_builder.add_node("tool_supervisor", tool_supervisor)
graph_builder.add_node("answer", answer)

graph_builder.add_edge(START, "clarify_prompt")

graph = graph_builder.compile()
