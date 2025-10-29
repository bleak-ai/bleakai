import os
from typing import Annotated, Literal, TypedDict

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    MessageLikeRepresentation,
    ToolCall,
)
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command

from prompts import (
    get_apply_improvements_prompt,
    get_clarify_prompt,
    get_create_prompt,
    get_suggest_improvements_prompt,
)
from utils import (
    ask_questions_tool,
    create_prompt_tool,
    format_questions_with_answers,
    get_formatted_messages,
    override_reducer,
    suggest_improvements_tool,
    test_prompt_tool,
)

load_dotenv()


class GraphState(TypedDict):
    messages: Annotated[list[MessageLikeRepresentation], override_reducer]
    result: str
    prompt: str


llm_model = os.environ["LLM_MODEL"]
llm = init_chat_model(llm_model)


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

    prompt = get_clarify_prompt(formatted_messages, asked_questions)
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

    prompt = get_suggest_improvements_prompt(messages, result)

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

    prompt = get_create_prompt(messages)

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

    prompt = get_apply_improvements_prompt(formatted_messages, improvements)

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
