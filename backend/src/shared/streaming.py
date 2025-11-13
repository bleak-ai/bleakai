"""Shared streaming utilities for graph execution."""

import json
from typing import AsyncGenerator, Any

from fastapi.responses import StreamingResponse
from langchain_core.load import dumpd


async def create_graph_stream(graph, graph_input: Any, config: dict) -> StreamingResponse:
    """
    Create a streaming response for any LangChain graph execution.

    Args:
        graph: The LangChain graph to execute
        graph_input: Input data for the graph
        config: Configuration dictionary for the graph execution

    Returns:
        StreamingResponse: FastAPI streaming response with SSE format
    """

    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            async for update in graph.astream(
                graph_input, config, stream_mode=["updates"]
            ):
                # Convert update to JSON and send as SSE
                update_data = dumpd(update)
                yield f"data: {json.dumps(update_data)}\n\n"

            # Send completion event
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            # Send error event
            error_data = {"type": "error", "error": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream; charset=utf-8",
        },
    )