"""Prompt router for main graph endpoints."""

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from langchain_core.load import dumpd
from langchain_core.messages import ToolCall
from langgraph.types import Command
from pydantic import BaseModel
from src.graphs.prompt_graph import graph

router = APIRouter(prefix="/threads", tags=["prompt"])


class StreamInput(BaseModel):
    """Request model for streaming conversations."""

    input: str


class ResumeInput(BaseModel):
    """Request model for resuming conversations."""

    resume: str


class BleakResponse(BaseModel):
    content: str
    tool_calls: list[ToolCall]


async def run_prompt_graph(graph_input, config, thread_id):
    """Run the prompt graph and return streaming response."""

    async def generate_stream():
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


@router.post("/{thread_id}/stream")
async def stream_thread(thread_id: str, body: StreamInput):
    """Stream conversation updates for a specific thread."""
    config = {"configurable": {"thread_id": thread_id}}
    message = {"content": body.input, "type": "human"}
    graph_input = {"messages": [message]}

    print(f"Streaming for thread_id: {thread_id}")
    print(f"Message: {message}")

    return await run_prompt_graph(graph_input, config, thread_id)


@router.post("/{thread_id}/resume")
async def resume_thread(thread_id: str, body: ResumeInput):
    """Resume a conversation from an interrupt point."""
    config = {"configurable": {"thread_id": thread_id}}
    graph_input = Command(resume=body.resume)

    print(f"Resuming thread_id: {thread_id} with resume data")

    return await run_prompt_graph(graph_input, config, thread_id)


@router.post("/{thread_id}/retry")
async def retry_thread(thread_id: str):
    """Retry the last action in a thread."""
    config = {"configurable": {"thread_id": thread_id}}
    graph_input = None  # Input is None for a retry

    print(f"Retrying thread_id: {thread_id}")

    return await run_prompt_graph(graph_input, config, thread_id)
