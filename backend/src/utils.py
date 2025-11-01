import json
import warnings
from typing import Any, List

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.tools import tool
from langgraph.types import Command, interrupt
from src.state import Question


@tool(
    description="Tool to ask questions to the user. Arguments: questions: List[Question]"
)
def ask_questions_tool(questions: List[Question], last_message: Any) -> Any:
    """"""
    print("questions", questions)
    print("last_message", last_message)

    answers_str = interrupt({"questions": questions})

    answers = json.loads(answers_str)
    user_answers_message = HumanMessage(content=answers)

    print("user_answers_message", user_answers_message)

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


@tool(description="Tool to create a prompt.")
def create_prompt_tool(prompt: str, last_message: Any) -> Any:
    next_step = interrupt({"prompt": prompt})

    if next_step == "questions":
        return Command(
            goto="ask_questions_node",
            update={
                "messages": {
                    "value": [AIMessage(content="create_prompt_tool called")],
                    "type": "override_last",
                },
                "prompt": prompt,
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
                "prompt": prompt,
            },
        )
    elif next_step == "evaluate":
        return Command(
            goto="evaluate_prompt_node",
            update={
                "messages": {
                    "value": [AIMessage(content="create_prompt_tool called")],
                    "type": "override_last",
                },
                "prompt": prompt,
            },
        )


@tool(description="Tool to test a prompt.")
def test_prompt_tool(result: str, last_message: Any) -> Any:
    feedback = interrupt({"result": result})

    human_feedback = HumanMessage(content=feedback)

    return Command(
        goto="autoimprove",
        update={
            "messages": {
                "value": [human_feedback],
                "type": "override_last",
            },
            "result": result,
        },
    )


@tool(
    description="Tool to evaluate a prompt. Args: evaluation: int (1-6). missing_info: Str (Small description on the info missing)"
)
def evaluate_prompt_tool(
    evaluation: int, missing_info: str, tool_call_message: Any
) -> Any:
    next_step = interrupt({"evaluation": evaluation, "missing_info": missing_info})

    if next_step == "questions":
        return Command(
            goto="ask_questions_node",
            update={
                "messages": {
                    "value": [tool_call_message],
                    "type": "override_last",
                }
            },
        )
    elif next_step == "test":
        return Command(
            goto="test_prompt",
        )


@tool(description="Tool to suggest improvements.")
def suggest_improvements_tool(improvements: list[str], last_message: Any) -> Any:
    improvements_result = interrupt({"improvements": improvements})
    parsed_improvements = json.loads(improvements_result)

    if len(parsed_improvements) == 0:
        return Command(goto="ask_questions_node")

    ai_message = AIMessage(content=parsed_improvements)

    return Command(goto="generate_or_improve_prompt", update={"messages": [ai_message]})


def format_message(message: BaseMessage) -> str:
    """Format a single message into a readable string."""
    if isinstance(message, HumanMessage):
        return f"Human: {message.content}"
    elif isinstance(message, AIMessage):
        ai_content = f"AI: {message.content}"
        # Include tool calls if present
        if hasattr(message, "tool_calls") and message.tool_calls:
            tool_calls_str = ", ".join(
                [
                    f"{tc.get('name', 'unknown')}({tc.get('args', {})})"
                    for tc in message.tool_calls
                ]
            )
            ai_content += f" [Tool calls: {tool_calls_str}]"
        return ai_content
    elif isinstance(message, SystemMessage):
        return f"System: {message.content}"
    elif isinstance(message, ToolMessage):
        # Include tool name if available
        tool_name = (
            getattr(message, "name", None)
            or getattr(message, "tool", None)
            or "unknown_tool"
        )
        return f"Tool[{tool_name}]: {message.content}"
    else:
        # fallback for unknown or custom message types
        print("fallback", message)
        return f"{message.__class__.__name__}: {message['content']}"


def get_formatted_messages(messages: list[BaseMessage]) -> str:
    """Return a readable transcript showing roles, including tool names for ToolMessages."""
    lines = []
    messages = normalize_messages(messages)
    for m in messages:
        print("message", m)
        lines.append(format_message(m))
    return "\n".join(lines)


def format_questions_with_answers(
    questions_message: AIMessage, answers_message: HumanMessage
):
    question_tool_call = questions_message.tool_calls[0]
    questions = question_tool_call["args"]["questions"]

    single_questions = [question["question"] for question in questions]

    single_answers = answers_message.content
    questions_with_answers = []
    for idx, question in enumerate(single_questions):
        answer = single_answers[idx]
        question_with_answer = {"question": question, "answer": answer}
        questions_with_answers.append(question_with_answer)

    return questions_with_answers


def normalize_messages(messages: list) -> list[BaseMessage]:
    """Converts a list of mixed message representations (dicts and objects)
    into a list of BaseMessage objects.
    """
    normalized = []
    # A mapping from string type to the corresponding class
    message_class_map = {
        "human": HumanMessage,
        "ai": AIMessage,
        "system": SystemMessage,
        "tool": ToolMessage,
    }

    for msg in messages:
        if isinstance(msg, BaseMessage):
            # It's already a proper message object, just add it.
            normalized.append(msg)
        elif isinstance(msg, dict):
            # It's a dictionary, so we need to convert it.
            msg_type = msg.get("type")
            constructor = message_class_map.get(msg_type)

            if not constructor:
                warnings.warn(f"Unknown message type in dict: '{msg_type}'. Skipping.")
                continue

            # Create a copy of the dict and remove 'type' as it's not a constructor argument
            params = msg.copy()
            params.pop("type", None)

            # Create the message object using the remaining dictionary items as keyword arguments
            normalized.append(constructor(**params))
        else:
            warnings.warn(f"Unknown item in messages list: {type(msg)}. Skipping.")

    return normalized
