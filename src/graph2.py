import json
from typing import List, Literal

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import AIMessage
from langchain_core.tools import tool
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import MessagesState
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


class InputGraphState(MessagesState):
    """_"""


class GraphState(InputGraphState):
    goal: str
    context: str
    output_format: str
    role: str
    questions: List[Question]
    questions_response: str
    answers: List[Answer]


@tool(description="Tool to ask questions to the user.")
def ask_questions_tool(questions: List[Question]) -> Command[Literal["answer"]]:
    """"""

    answers = interrupt({"questions": questions})

    json_answers = json.loads(answers)

    formatted_answers = (
        "**START Questions & Answers:** \n\n"
        + "\n\n".join(
            [
                f"**Question:** {answer['question']}. \n**Answer:** {answer['answer']}"
                for answer in json_answers
            ]
        )
        + "\n\n**END Questions & Answers**\n\n"
    )

    answers_ai_message = AIMessage(content=formatted_answers)

    return Command(
        goto="answers", update={"answers": answers, "messages": answers_ai_message}
    )


llm = init_chat_model("google_genai:gemini-2.5-flash-lite")
# llm = init_chat_model("ollama:llama3.2:latest")


async def clarify_prompt(state: GraphState) -> Command[Literal["ask_questions"]]:
    """"""
    print("clarify state")
    messages = state.get("messages", [])
    prompt = f"""
    Your goal is to call the tool ask_questions_tool with the right paramters.

    Based on the user message, please do questions to the user that help you define the goal, context, output_format and role.

    The user message is:
    {messages}

    Call the tool with the questions as an array of JSON objects.
    questions: [
        {{"id": "q1", "question": "question1", "options":["option1", "option2", "option3"]}},
    ]

    MAX 2 QUESTIONS, NO MORE

    Never include Other in the options.

    DO NOT RETURN ANYHITNG. JUST CALL THE TOOL ask_questions_tool with the right options
  """

    tools = [ask_questions_tool]

    llm_with_tools = llm.bind_tools(tools)

    # llm_with_structured = llm.with_structured_output(QuestionsOutput)
    response = llm_with_tools.invoke([("human", prompt)])

    print("Questions:")
    print(response)

    return Command(goto="ask_questions", update={"questions_response": response})


async def ask_questions(state: GraphState) -> Command[Literal["answer"]]:
    """Process the tool calls from clarify_prompt and invoke the ask_questions_tool."""
    questions_response = state.get("questions_response", [])

    print("Tool calls:")
    for tool_call in questions_response.tool_calls:
        tool_args = tool_call["args"]
        print("toolargs", tool_args)

        answers = ask_questions_tool.invoke(tool_args)
        print(answers)

    return Command(goto="answer", update={"answers": answers})


async def answer(state: GraphState) -> Command[Literal["__end__"]]:
    """"""

    answers = state.get("answers", [])
    messages = state.get("messages", [])

    prompt = f"""   
    Answer the following question of the user based on the message and answers
    
    The message is:
    {messages}
    
    Questions and answers: 
    {answers}
    """

    response = llm.invoke(prompt)

    # Add clear separation between Q&A and AI response
    separator = "\n" + "=" * 50 + "\n"
    ai_response_content = f"{separator}\n🤖 **AI Response:**\n\n{response.content}"
    ai_response = AIMessage(content=ai_response_content)

    return Command(goto=END)


graph_builder = StateGraph(GraphState)


graph_builder.add_node("clarify_prompt", clarify_prompt)
graph_builder.add_node("ask_questions", ask_questions)
graph_builder.add_node("answer", answer)

graph_builder.add_edge(START, "clarify_prompt")

graph = graph_builder.compile()
