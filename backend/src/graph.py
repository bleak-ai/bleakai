import os
from typing import Literal

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import (
    AIMessage,
    ToolCall,
)
from langgraph.graph import START, StateGraph
from langgraph.types import Command

from prompts import (
    CLARIFY_PROMPT,
    PROMPT_TEMPLATE,
    SUGGEST_IMPROVEMENTS_PROMPT,
)
from state import GraphState
from utils import (
    ask_questions_tool,
    create_prompt_tool,
    get_formatted_messages,
    suggest_improvements_tool,
    test_prompt_tool,
)

load_dotenv()

llm_model = os.environ["LLM_MODEL"]
llm = init_chat_model(llm_model)


async def tool_supervisor(
    state: GraphState,
) -> Command[
    Literal[
        "generate_or_improve_prompt",
        "ask_questions_node",
        "test_prompt",
        "suggest_improvements",
        "generate_or_improve_prompt",
        "__end__",
    ]
]:
    """Process the tool calls from ask_questions_node and invoke the ask_questions_tool."""
    messages = state.get("messages", "")
    last_message = messages[-1]

    for tool_call in last_message.tool_calls:
        tool_args = tool_call["args"]
        tool_name = tool_call["name"]

        if tool_name == "ask_questions_tool":
            return ask_questions_tool.invoke(
                input={
                    "questions": tool_args["questions"],
                    "last_message": last_message,
                }
            )
        elif tool_name == "create_prompt_tool":
            return create_prompt_tool.invoke(
                input={"prompt": tool_args["prompt"], "last_message": last_message}
            )
        elif tool_name == "test_prompt_tool":
            return test_prompt_tool.invoke(
                input={"result": tool_args["result"], "last_message": last_message}
            )
        elif tool_name == "suggest_improvements_tool":
            return suggest_improvements_tool.invoke(
                input={
                    "improvements": tool_args["improvements"],
                    "last_message": last_message,
                }
            )


async def ask_questions_node(
    state: GraphState,
) -> Command[Literal["tool_supervisor"]]:
    """"""
    print("clarify state")
    messages = state.get("messages", [])

    # Extract already asked questions from message history
    formatted_messages = get_formatted_messages(messages)

    print("##############################")
    print(formatted_messages)
    print("##############################")

    # asked_questions_list = (
    #     chr(10).join(f"- {q}" for q in asked_questions)
    #     if asked_questions
    #     else "No questions asked yet"
    # )
    prompt = CLARIFY_PROMPT.format(
        formatted_messages=formatted_messages, asked_questions_list=""
    )
    tools = [ask_questions_tool]

    llm_with_tools = llm.bind_tools(tools)

    response = llm_with_tools.invoke([("human", prompt)])

    return Command(goto="tool_supervisor", update={"messages": [response]})


async def generate_or_improve_prompt(
    state: GraphState,
) -> Command[Literal["tool_supervisor"]]:
    """Create or improve a prompt depending on state."""
    messages = state.get("messages", [])
    current_prompt = state.get("prompt", None)

    formatted_messages = get_formatted_messages(messages)

    prompt = PROMPT_TEMPLATE.format(
        formatted_messages=formatted_messages,
        prompt=current_prompt or "",
    )

    print("###############PROMPT to CREATE PROMPT###############")
    print(prompt)
    print("##############################")

    tools = [create_prompt_tool]
    llm_with_tools = llm.bind_tools(tools)
    res = llm_with_tools.invoke(prompt)

    return Command(goto="tool_supervisor", update={"messages": [res]})


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

    prompt = SUGGEST_IMPROVEMENTS_PROMPT.format(
        messages=formatted_messages, result=result
    )

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


graph_builder = StateGraph(GraphState)  # remove update here, override prompt variable


graph_builder.add_node("ask_questions_node", ask_questions_node)
graph_builder.add_node("tool_supervisor", tool_supervisor)
graph_builder.add_node("test_prompt", test_prompt)
graph_builder.add_node("suggest_improvements", suggest_improvements)
graph_builder.add_node("generate_or_improve_prompt", generate_or_improve_prompt)
# graph_builder.add_node("generate_or_improve_prompt", generate_or_improve_prompt)

graph_builder.add_edge(START, "ask_questions_node")

graph = graph_builder.compile()
