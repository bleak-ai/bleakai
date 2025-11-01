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
from src.prompts import (
    CLARIFY_PROMPT,
    PROMPT_TEMPLATE,
)
from src.state import GraphState
from src.utils import (
    ask_questions_tool,
    create_prompt_tool,
    evaluate_prompt_tool,
    get_formatted_messages,
    suggest_improvements_tool,
    test_prompt_tool,
)

load_dotenv()

llm_model = os.environ["LLM_MODEL"]
llm = init_chat_model(llm_model)


async def generate_or_improve_prompt(
    state: GraphState,
) -> Command[Literal["tool_supervisor"]]:
    """Create or improve a prompt depending on state."""
    messages = state.get("messages", [])

    print("messages", messages)
    last_message = messages[-1]
    current_prompt = state.get("prompt", None)

    formatted_messages = ""
    if current_prompt:
        formatted_messages = get_formatted_messages([last_message])
    else:
        # HANDLE THE FIRST MESSAGE FROM THE CHAT BY INITIALISING THE PROMPT VARIABLE IN THE STATE
        tool_call = ToolCall(
            name="create_prompt_tool",
            args={"prompt": messages[0]["content"]},
            id="manual_test_call_1",
        )
        ai_message = AIMessage(content="", tool_calls=[tool_call])
        return Command(
            goto="tool_supervisor",
            update={"messages": [ai_message], "prompt": messages[0]["content"]},
        )

    prompt = PROMPT_TEMPLATE.format(
        formatted_messages=formatted_messages,
        prompt=current_prompt or "",
    )

    print("###############PROMPT to CREATE PROMPT###############")
    print(prompt)
    print("##############################")

    tools = [create_prompt_tool]
    llm_with_tools = llm.bind_tools(tools)
    res = await llm_with_tools.ainvoke(prompt)

    new_prompt = res.tool_calls[0]["args"]["prompt"]

    return Command(
        goto="tool_supervisor", update={"messages": [res], "prompt": new_prompt}
    )


async def tool_supervisor(
    state: GraphState,
) -> Command[
    Literal[
        "generate_or_improve_prompt",
        "ask_questions_node",
        "test_prompt",
        "autoimprove",
        "evaluate_prompt_node",
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
        elif tool_name == "evaluate_prompt_tool":
            return evaluate_prompt_tool.invoke(
                input={
                    "evaluation": tool_args["evaluation"],
                    "missing_info": tool_args["missing_info"],
                    "tool_call_message": last_message,
                }
            )


async def ask_questions_node(
    state: GraphState,
) -> Command[Literal["tool_supervisor"]]:
    """"""
    print("ask_questions_node")
    messages = state.get("messages", [])
    current_prompt = state.get("prompt", "")

    # Extract already asked questions from message history
    missing_info = ""

    last_message = messages[-1]
    if (
        last_message.tool_calls
        and last_message.tool_calls[0]["name"] == "evaluate_prompt_tool"
    ):
        missing_info = f""" IDEAS TO DO THE QUESTIONS ABOUT: {last_message.tool_calls[0]["args"]["missing_info"]} """

    prompt = CLARIFY_PROMPT.format(prompt=current_prompt, missing_info=missing_info)

    print("############ask_questions_node##################")
    print(prompt)
    print("##############################")

    tools = [ask_questions_tool]

    llm_with_tools = llm.bind_tools(tools)

    response = await llm_with_tools.ainvoke([("human", prompt)])

    return Command(goto="tool_supervisor", update={"messages": [response]})


# Analyze prompt improvements based on past messages and current result
async def autoimprove(
    state: GraphState,
) -> Command[Literal["generate_or_improve_prompt"]]:
    """Analyze prompt improvements based on past messages and what has been ignored or not properly applied."""
    messages = state.get("messages", [])
    result = state.get("result", "")
    current_prompt = state.get("prompt", "")

    # formatted_messages = get_formatted_messages(messages)

    feedback = messages[-1]

    print("##############################")
    print("AUTOIMPROVE ANALYSIS")
    print("Current prompt:", current_prompt)
    print("Result:", result)
    # print("Messages:", formatted_messages)
    print("Feedback:", feedback)
    print("##############################")

    # Create a comprehensive analysis prompt that examines:
    # 1. What user requirements have been ignored
    # 2. What aspects haven't been properly applied
    # 3. How the current result falls short of expectations
    # 4. Specific improvements needed based on conversation history
    prompt = f"""
        You are an expert prompt analyst. Focus ONLY on addressing the specific user feedback and clear gaps between the prompt and result.

        <PROMPT>
        {current_prompt}
        </PROMPT>

        <RESULT>
        {result}
        </RESULT>

        <FEEDBACK>
        {feedback}
        </FEEDBACK>

        TASK: Identify improvements that directly address:
        1. Specific issues mentioned in the user's feedback
        2. Clear discrepancies between what the prompt asks for and what the result delivers
        3. Missing instructions that would prevent the issues seen in the result

        CONSTRAINTS:
        - Maximum 2-3 specific improvements
        - Each improvement must directly relate to the feedback or obvious prompt-result gaps
        - Avoid general improvements unless the feedback explicitly mentions them
        - Focus on actionable changes that will prevent the current issues

        Call the suggest_improvements_tool with ONLY the most relevant, specific improvements.
    """

    tools = [suggest_improvements_tool]
    llm_with_tools = llm.bind_tools(tools)
    res = await llm_with_tools.ainvoke(prompt)

    return Command(goto="generate_or_improve_prompt", update={"messages": [res]})


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


async def evaluate_prompt_node(
    state: GraphState,
) -> Command[Literal["tool_supervisor"]]:
    """Evaluate the completeness of the current prompt and return a score from 1-6."""
    prompt = state.get("prompt", "")

    print("###############EVALUATE PROMPT##################")
    print("Prompt to evaluate:", prompt)
    print("##############################")

    # Create an evaluation prompt that analyzes completeness on a 1-6 scale
    evaluation_prompt = f"""
    You are an expert prompt analyst. Evaluate the completeness of the following prompt on a scale from 1 to 6, where:

    1 - Very incomplete: Lacks basic structure, unclear goal, missing key information
    2 - Incomplete: Has basic idea but missing important details and context
    3 - Somewhat complete: Has main elements but lacks specificity and clarity
    4 - Mostly complete: Good structure and details, but could use some refinement
    5 - Very complete: Well-structured with clear instructions and good context
    6 - Excellent: Comprehensive, specific, and ready for immediate use

    Consider these factors in your evaluation:
    - Clarity of the objective/goal
    - Specificity of instructions
    - Completeness of context and constraints
    - Structure and organization
    - Examples or guidelines provided
    - Target audience/purpose definition

    <PROMPT>
    {prompt}
    </PROMPT>

    After analyzing the prompt, you MUST call the evaluate_prompt_tool with these parameters:
    - evaluation: int (your score from 1-6)
    - missing_info: str (brief description of what information is missing or needs improvement)

    Call the evaluate_prompt_tool with your evaluation score and missing information description.
    """

    tools = [evaluate_prompt_tool]
    llm_with_tools = llm.bind_tools(tools)

    response = await llm_with_tools.ainvoke([("human", evaluation_prompt)])

    return Command(goto="tool_supervisor", update={"messages": [response]})


graph_builder = StateGraph(GraphState)  # remove update here, override prompt variable


graph_builder.add_node("ask_questions_node", ask_questions_node)
graph_builder.add_node("tool_supervisor", tool_supervisor)
graph_builder.add_node("test_prompt", test_prompt)
graph_builder.add_node("autoimprove", autoimprove)
graph_builder.add_node("evaluate_prompt_node", evaluate_prompt_node)
graph_builder.add_node("generate_or_improve_prompt", generate_or_improve_prompt)
# graph_builder.add_node("generate_or_improve_prompt", generate_or_improve_prompt)

graph_builder.add_edge(START, "generate_or_improve_prompt")

graph = graph_builder.compile()
