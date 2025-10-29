from unittest.mock import MagicMock, patch

import pytest

from graph import GraphState, tool_supervisor

# Assuming these are imported from your module
# from utils import (
#     tool_supervisor,
#     GraphState,
#     Command,
#     HumanMessage,
#     AIMessage,
#     ask_questions_tool,
#     create_prompt_tool,
#     test_prompt_tool,
#     suggest_improvements_tool,
#     format_questions_with_answers,
#     END,
# )

# For this minimal test, we'll mock everything external.
# Replace 'utils' with the actual module name.


@pytest.mark.asyncio
async def test_tool_supervisor_ask_questions_tool():
    # Mock the state
    state = GraphState(
        messages=[
            MagicMock(
                tool_calls=[
                    {
                        "name": "ask_questions_tool",
                        "args": {
                            "mock_args": "value",
                        },
                        "type": "tool_call",
                    }
                ]
            )
        ]
    )

    # Mock the tools and functions
    with patch("utils.ask_questions_tool") as mock_ask:
        mock_ask.invoke.return_value = "mock answers"

    with patch("utils.format_questions_with_answers") as mock_format:
        mock_format.return_value = "formatted questions with answers"

    # Call the function
    result = await tool_supervisor(state)

    # Assertions
    assert result.goto == "generate_or_improve_prompt"
    assert (
        result.update["messages"]["value"][0].content
        == "formatted questions with answers"
    )
    assert result.update["messages"]["type"] == "override_last"
    mock_ask.invoke.assert_called_once_with({"mock_args": "value"})
    mock_format.assert_called_once()
