"""Test file for the prompt improvement graph"""

from graph import GraphState, graph

def test_prompt_improvement():
    """Test the prompt improvement workflow"""

    # Initial state with the 4 required parameters
    initial_state = GraphState(
        prompt="What is AI?",
        goal="Create a more specific and detailed question about artificial intelligence",
        modifications="Make the question more specific and detailed",
        iterations_number=0
    )

    # Run the graph
    result = graph.invoke(initial_state)

    print("Final result:")
    print(f"Prompt: {result.prompt}")
    print(f"Goal: {result.goal}")
    print(f"Modifications: {result.modifications}")
    print(f"Iterations: {result.iterations_number}")

    return result

if __name__ == "__main__":
    test_prompt_improvement()