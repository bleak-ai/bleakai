import json
import operator
from typing import Annotated, Any, List, Literal, TypedDict

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    MessageLikeRepresentation,
    ToolCall,
)
from langchain_core.tools import tool
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt
from pydantic import BaseModel

from utils import format_questions_with_answers, get_formatted_messages

load_dotenv()


class Question(BaseModel):
    """Represents a question to be asked to the user."""

    question: str
    options: List[str]  # Only for radio questions


def override_reducer(current_value, new_value):
    """Reducer function that allows a new value to completely replace the old one."""
    if isinstance(new_value, dict) and new_value.get("type") == "override":
        return new_value.get("value", new_value)
    if isinstance(new_value, dict) and new_value.get("type") == "override_last":
        override_value = new_value.get("value", new_value)
        # If current_value is a list, replace only the last element
        if isinstance(current_value, list) and current_value:
            current_list_trimmed = current_value[:-1]
            list_with_new_value = current_list_trimmed + override_value
            return list_with_new_value
        # If current_value is not a list or is empty, return the override_value as a single-element list
        return [override_value]
    return operator.add(current_value, new_value)


class GraphState(TypedDict):
    messages: Annotated[list[MessageLikeRepresentation], override_reducer]
    result: str
    prompt: str


llm = init_chat_model("ollama:granite4:micro")
# llm = init_chat_model("google_genai:gemini-2.5-flash-lite")


@tool(description="Tool to ask questions to the user.")
def ask_questions_tool(questions: List[Question]) -> Any:
    """"""

    answers = interrupt({"questions": questions})

    return json.loads(answers)


@tool(description="Tool to create a prompt.")
def create_prompt_tool(prompt: str) -> Any:
    next_step = interrupt({"prompt": prompt})

    return next_step


@tool(description="Tool to test a prompt.")
def test_prompt_tool(result: str) -> Any:
    next_step = interrupt({"result": result})

    return next_step


@tool(description="Tool to suggest improvements.")
def suggest_improvements_tool(improvements: list[str]) -> Any:
    improvements = interrupt({"improvements": improvements})

    return json.loads(improvements)


async def clarify_prompt(
    state: GraphState,
) -> Command[Literal["tool_supervisor"]]:
    """"""
    print("clarify state")
    messages = state.get("messages", [])

    # Extract already asked questions from message history
    asked_questions = set()
    for msg in messages:
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            for tool_call in msg.tool_calls:
                if tool_call.get("name") == "ask_questions_tool":
                    questions = tool_call.get("args", {}).get("questions", [])
                    for q in questions:
                        asked_questions.add(q.get("question", ""))

    formatted_messages = get_formatted_messages(messages)

    print("##############################")
    print(formatted_messages)
    print("##############################")

    prompt = f"""
    Your goal is to call the tool ask_questions_tool with the right parameters.

    Based on the user message, please do questions to the user that help you define the goal, context, output_format and role.

    Call the tool with the questions as an array of JSON objects.
    questions: [
        {{"id": "q1", "question": "question1", "options":["option1", "option2", "option3"]}},

    <CONVERSATION HISTORY>
    {formatted_messages}
    </CONVERSATION HISTORY>

    1 question, NO MORE

    Never include Other in the options.

    IMPORTANT: The following questions have ALREADY been asked. DO NOT repeat them:
    {chr(10).join(f"- {q}" for q in asked_questions) if asked_questions else "No questions asked yet"}

    Generate a COMPLETELY DIFFERENT question that explores a new aspect of the user's needs.

    DO NOT RETURN ANYTHING. JUST CALL THE TOOL ask_questions_tool with the new options
  """
    tools = [ask_questions_tool]

    llm_with_tools = llm.bind_tools(tools)

    response = llm_with_tools.invoke([("human", prompt)])

    return Command(goto="tool_supervisor", update={"messages": [response]})


async def tool_supervisor(
    state: GraphState,
) -> Command[
    Literal[
        "create_prompt",
        "clarify_prompt",
        "test_prompt",
        "suggest_improvements",
        "apply_improvements",
        "__end__",
    ]
]:
    """Process the tool calls from clarify_prompt and invoke the ask_questions_tool."""
    messages = state.get("messages", "")
    last_message = messages[-1]

    for tool_call in last_message.tool_calls:
        tool_args = tool_call["args"]
        tool_name = tool_call["name"]

        if tool_name == "ask_questions_tool":
            answers = ask_questions_tool.invoke(tool_args)
            user_answers_message = HumanMessage(content=answers)

            # To have the messages structured in a clear way, we merge
            # the tool call with the answers from the user
            questions_with_answers = format_questions_with_answers(
                last_message, user_answers_message
            )

            return Command(
                goto="create_prompt",
                update={
                    "messages": {
                        "value": [AIMessage(content=questions_with_answers)],
                        "type": "override_last",
                    }
                },
            )
        elif tool_name == "create_prompt_tool":
            next_step = create_prompt_tool.invoke(tool_args)

            if next_step == "questions":
                return Command(
                    goto="clarify_prompt",
                    update={
                        "messages": {
                            "value": [AIMessage(content="create_prompt_tool called")],
                            "type": "override_last",
                        },
                        "prompt": tool_args["prompt"],
                    },
                )
            elif next_step == "test":
                return Command(
                    goto="test_prompt",
                    update={
                        "messages": {
                            "value": [AIMessage(content="create_prompt_tool called")],
                            "type": "override_last",
                        },
                        "prompt": tool_args["prompt"],
                    },
                )

        elif tool_name == "test_prompt_tool":
            next_step = test_prompt_tool.invoke(tool_args)
            print("nextstep", next_step)

            if next_step == "analyze":
                print("analyze")
                return Command(
                    goto="suggest_improvements",
                    update={
                        "messages": {
                            "value": [AIMessage(content="test_prompt_tool called")],
                            "type": "override_last",
                        },
                        "result": tool_args["result"],
                    },
                )
            elif next_step == "finish":
                return Command(
                    goto=END,
                    update={
                        "messages": {
                            "value": [AIMessage(content="test_prompt_tool called")],
                            "type": "override_last",
                        },
                        "prompt": tool_args,
                    },
                )
        elif tool_name == "suggest_improvements_tool":
            improvements = suggest_improvements_tool.invoke(tool_args)

            print("improvements", improvements)
            if len(improvements) == 0:
                return Command(goto="clarify_prompt")

            ai_message = AIMessage(content=improvements)

            return Command(goto="apply_improvements", update={"messages": [ai_message]})


# Based on result and messages, suggest improvements.
async def suggest_improvements(
    state: GraphState,
) -> Command[Literal["tool_supervisor"]]:
    """Analyze and improve prompt."""
    messages = state.get("messages", [])

    result = state.get("result", "")

    formatted_messages = get_formatted_messages(messages)

    print("##############################")
    print(formatted_messages)
    print("##############################")

    prompt = f"""
        You're objective is to call the tool create_prompt_tool with the correct parameter. New_prompt.
        
        These are the instructions that the users has provided to generate a prompt. 
        <Instructions>
        {messages}
        </Instructions>
        
        This has been the result of this prompt
        <result>
        {result}
        </result>
        
        Analyze how the prompt could be improved based on the instructions and generate improvements to improve it following the questions by the user.
    """

    tools = [suggest_improvements_tool]

    llm_with_tools = llm.bind_tools(tools)

    res = llm_with_tools.invoke(prompt)

    return Command(goto="tool_supervisor", update={"messages": [res]})


# Uses just the prompt from the state
async def test_prompt(state: GraphState) -> Command[Literal["tool_supervisor"]]:
    """Test the prompt."""
    prompt = state.get("prompt", "")

    result = await llm.ainvoke(prompt)
    # result = "This is a sample tweet"

    # Create a fake tool call manually
    tool_call = ToolCall(
        name="test_prompt_tool",
        args={"result": str(result.content)},
        id="manual_test_call_1",
    )

    # Create AIMessage with the tool call
    ai_message = AIMessage(content="", tool_calls=[tool_call])

    return Command(
        goto="tool_supervisor", update={"messages": [ai_message]}
    )  # remove update here, override result variable


# Based on questions creates a prompt
async def create_prompt(state: GraphState) -> Command[Literal["tool_supervisor"]]:
    """Generate a prompt."""
    messages = state.get("messages", [])

    formatted_messages = get_formatted_messages(messages)

    print("##############################")
    print(formatted_messages)
    print("##############################")

    prompt = f"""
    Based on the user's original message and the answers to the clarification questions, generate a comprehensive prompt that addresses the user's needs.

    The messages and answers are:
    {messages}

    Create a well-structured prompt that incorporates:
    - The goal identified from the answers
    - The context provided by the user
    - The desired output format
    - The appropriate role/tone for the AI

    Call the create_prompt_tool with your generated prompt as the parameter.

    DO NOT return any text other than calling the create_prompt_tool with the prompt.
    """

    tools = [create_prompt_tool]

    llm_with_tools = llm.bind_tools(tools)

    res = llm_with_tools.invoke(prompt)

    return Command(
        goto="tool_supervisor", update={"messages": [res]}
    )  # remove update here, override prompt variable


# Same as create prompt but  for improvements (merge together?)
async def apply_improvements(state: GraphState) -> Command[Literal["tool_supervisor"]]:
    """Apply improvements to create an improved prompt."""
    messages = state.get("messages", [])

    # Get the improvements from the last message
    improvements = messages[-1].content

    # Get all previous messages to understand the original context
    previous_messages = messages[:-1]

    formatted_messages = get_formatted_messages(previous_messages)

    print("##############################")
    print("Applying improvements:", improvements)
    print("##############################")

    prompt = f"""
    Based on the original user request and the suggested improvements, generate an improved prompt.

    Original context and requirements:
    {formatted_messages}

    Suggested improvements to apply:
    {improvements}

    Create a new, improved prompt that incorporates these suggestions while maintaining the original intent.

    Call the create_prompt_tool with your improved prompt as the parameter.

    DO NOT return any text other than calling the create_prompt_tool with the improved prompt.
    """

    tools = [create_prompt_tool]

    llm_with_tools = llm.bind_tools(tools)

    res = llm_with_tools.invoke(prompt)

    return Command(goto="tool_supervisor", update={"messages": [res]})


graph_builder = StateGraph(GraphState)  # remove update here, override prompt variable


graph_builder.add_node("clarify_prompt", clarify_prompt)
graph_builder.add_node("tool_supervisor", tool_supervisor)
graph_builder.add_node("test_prompt", test_prompt)
graph_builder.add_node("suggest_improvements", suggest_improvements)
graph_builder.add_node("create_prompt", create_prompt)
graph_builder.add_node("apply_improvements", apply_improvements)

graph_builder.add_edge(START, "clarify_prompt")

graph = graph_builder.compile()
