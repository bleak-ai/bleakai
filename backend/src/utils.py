import warnings

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)


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
