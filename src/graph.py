from typing import Literal

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command
from pydantic import BaseModel, Field
from typing_extensions import TypedDict

load_dotenv()


class GraphState(TypedDict):
    """State for the prompt improvement workflow."""

    prompt: str
    goal: str
    modifications: str
    iterations_number: int
    result: str


class TesterOutput(BaseModel):
    """Structured output for the prompt tester node."""

    correct: bool = Field(description="Whether the prompt meets the goal correctly")
    modification: str = Field(description="Suggested modification if not correct")


# Initialize the LLM
llm = init_chat_model("google_genai:gemini-2.5-flash-lite")


# Node 1: Improve prompt
def improve_prompt(state: GraphState) -> Command[Literal["prompt_tester", "__end__"]]:
    """Node 1: Improve prompt based on current prompt and modifications."""
    prompt = state.get("prompt", "")
    goal = state.get("goal", "")
    modifications = state.get("modifications", "")
    iterations_number = state.get("iterations_number", 0)

    # Generate a prompt
    improvement_request = f"""
    Please improve the following prompt based on the specified modifications:

    Current prompt:
    {prompt}
    
    Goal:
    {goal}

    Desired modifications:
    {modifications}

    Provide an improved version of the prompt that incorporates the requested changes.
    Return just a single prompt that can be directly used without introductions.
    """

    response = llm.invoke([("human", improvement_request)])

    return Command(
        update={
            "prompt": response.content,
            "iterations_number": iterations_number + 1,
        },
        goto="prompt_tester",
    )


# Node 2: Prompt tester
def prompt_tester(state: GraphState) -> Command[Literal["improve_prompt", "__end__"]]:
    """Node 2: Test the prompt and return structured output."""
    prompt = state.get("prompt", "")
    goal = state.get("goal", "")
    iterations_number = state.get("iterations_number", 0)

    prompt_to_execute = (
        prompt.strip()
        + "Return just a single response without any additional introductions."
    )

    response = llm.invoke([("human", prompt_to_execute)])

    testing_request = f"""
    Please evaluate if the following prompt and it's result fulfill the goal properly:

    Prompt:
    {prompt}

    Result of prompt:
    {response.content}

    Goal (what is expected from the prompt):
    {goal}

    Analyze the prompt and provide:
    1. Whether the prompt correctly achieves the goal (true/false)
    2. Suggested modification if not correct

    Return your response as a JSON object with the following structure:
    {{
        "correct": boolean,
        "modification": "string describing the suggested modification"
    }}
    """

    # Use structured output for the tester
    structured_llm = llm.with_structured_output(TesterOutput)
    result = structured_llm.invoke([("human", testing_request)])

    # Check if we should continue or end
    if iterations_number > 1 or result.correct:
        return Command(
            update={
                "modifications": result.modification,
                "prompt": prompt,
                "result": response.content,
            },
            goto=END,
        )
    else:
        return Command(
            update={
                "modifications": result.modification,
            },
            goto="improve_prompt",
        )


# Build the graph with two nodes
graph_builder = StateGraph(GraphState)
graph_builder.add_node("improve_prompt", improve_prompt)
graph_builder.add_node("prompt_tester", prompt_tester)

# Define the flow - only keep the start edge as requested
graph_builder.add_edge(START, "improve_prompt")


# def get_langfuse_handler():
#     from langfuse.langchain import CallbackHandler

#     return CallbackHandler()


# graph = graph_builder.compile().with_config({"callbacks": [get_langfuse_handler()]})

graph = graph_builder.compile()
