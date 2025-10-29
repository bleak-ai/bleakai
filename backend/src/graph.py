import os
from typing import Literal

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    ToolCall,
)
from langgraph.graph import END, START, StateGraph
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
    format_questions_with_answers,
    get_formatted_messages,
    suggest_improvements_tool,
    test_prompt_tool,
)

load_dotenv()

llm_model = os.environ["LLM_MODEL"]
llm = init_chat_model(llm_model)


async def clarify_prompt(
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

    print("prompt", prompt)

    llm_with_tools = llm.bind_tools(tools)

    response = llm_with_tools.invoke([("human", prompt)])

    return Command(goto="tool_supervisor", update={"messages": [response]})


async def tool_supervisor(
    state: GraphState,
) -> Command[
    Literal[
        "generate_or_improve_prompt",
        "clarify_prompt",
        "test_prompt",
        "suggest_improvements",
        "generate_or_improve_prompt",
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
                goto="generate_or_improve_prompt",
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

            return Command(
                goto="generate_or_improve_prompt", update={"messages": [ai_message]}
            )


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


async def generate_or_improve_prompt(
    state: GraphState,
) -> Command[Literal["tool_supervisor"]]:
    """Create or improve a prompt depending on state."""
    messages = state.get("messages", [])
    current_prompt = state.get("prompt", None)

    formatted_messages = get_formatted_messages(messages)

    # Determine if this is a creation or improvement step
    is_improvement = current_prompt is not None and len(messages) > 0

    if is_improvement:
        # Assume last message contains improvement suggestions
        improvements = messages[-1].content
        previous_messages = messages[:-1]
        formatted_previous = get_formatted_messages(previous_messages)

        prompt = PROMPT_TEMPLATE.format(
            mode="improvement",
            formatted_messages=formatted_previous,
            improvements=improvements,
            prompt=current_prompt,
        )
    else:
        prompt = PROMPT_TEMPLATE.format(
            mode="creation",
            formatted_messages=formatted_messages,
            improvements="",
            prompt="",
        )

    print("##############################")
    print(prompt)
    print("##############################")

    tools = [create_prompt_tool]
    llm_with_tools = llm.bind_tools(tools)
    res = llm_with_tools.invoke(prompt)

    return Command(goto="tool_supervisor", update={"messages": [res]})


graph_builder = StateGraph(GraphState)  # remove update here, override prompt variable


graph_builder.add_node("clarify_prompt", clarify_prompt)
graph_builder.add_node("tool_supervisor", tool_supervisor)
graph_builder.add_node("test_prompt", test_prompt)
graph_builder.add_node("suggest_improvements", suggest_improvements)
graph_builder.add_node("generate_or_improve_prompt", generate_or_improve_prompt)
# graph_builder.add_node("generate_or_improve_prompt", generate_or_improve_prompt)

graph_builder.add_edge(START, "clarify_prompt")

graph = graph_builder.compile()
