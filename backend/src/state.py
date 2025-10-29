import operator
from typing import Annotated, List

from langchain_core.messages import MessageLikeRepresentation
from pydantic import BaseModel, Field


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


class Question(BaseModel):
    """Represents a question to be asked to the user."""

    question: str
    options: List[str] | None = None


class GraphState(dict):
    """State for the prompt refinement graph."""

    messages: Annotated[list[MessageLikeRepresentation], override_reducer]
    result: str = Field(
        default="",
        description="The last result of the prompt.",
    )
    prompt: str = Field(
        default="",
        description="The current prompt.",
    )
