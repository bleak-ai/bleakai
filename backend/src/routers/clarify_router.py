"""Clarification router for clarify graph endpoints."""

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from langchain_core.load import dumpd
from langgraph.types import Command
from pydantic import BaseModel
from src.graphs.clarify_graph import graph as clarify_graph

router = APIRouter(prefix="/clarify", tags=["clarification"])


class StreamInput(BaseModel):
    """Request model for streaming conversations."""

    input: str


class ResumeInput(BaseModel):
    """Request model for resuming conversations."""

    resume: str


async def run_clarify_graph(graph_input, config, thread_id):
    """Run the clarify graph and return streaming response."""

    async def generate_stream():
        try:
            async for update in clarify_graph.astream(
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


@router.post("/threads/{thread_id}/stream")
async def clarify_stream_thread(thread_id: str, body: StreamInput):
    """Stream conversation updates for a specific thread using clarify graph."""
    config = {"configurable": {"thread_id": thread_id}}
    message = {"content": body.input, "type": "human"}
    graph_input = {"messages": [message]}

    print(f"Clarify streaming for thread_id: {thread_id}")
    print(f"Message: {message}")

    return await run_clarify_graph(graph_input, config, thread_id)


@router.post("/threads/{thread_id}/resume")
async def clarify_resume_thread(thread_id: str, body: ResumeInput):
    """Resume a conversation from an interrupt point using clarify graph."""
    config = {"configurable": {"thread_id": thread_id}}
    graph_input = Command(resume=body.resume)

    print(f"Clarify resuming thread_id: {thread_id} with resume data")

    return await run_clarify_graph(graph_input, config, thread_id)


@router.post("/threads/{thread_id}/retry")
async def clarify_retry_thread(thread_id: str):
    """Retry the last action in a thread using clarify graph."""
    config = {"configurable": {"thread_id": thread_id}}
    graph_input = None  # Input is None for a retry

    print(f"Clarify retrying thread_id: {thread_id}")

    return await run_clarify_graph(graph_input, config, thread_id)
