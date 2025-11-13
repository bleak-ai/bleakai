"""Clarification router for clarify graph endpoints."""

from fastapi import APIRouter
from langgraph.types import Command
from pydantic import BaseModel
from src.graphs.clarify_graph import graph as clarify_graph
from src.shared.streaming import create_graph_stream

router = APIRouter(prefix="/clarify", tags=["clarification"])


class StreamInput(BaseModel):
    """Request model for streaming conversations."""

    input: str


class ResumeInput(BaseModel):
    """Request model for resuming conversations."""

    resume: str


async def run_clarify_graph(graph_input, config, thread_id):
    """Run the clarify graph and return streaming response."""
    return await create_graph_stream(clarify_graph, graph_input, config)


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
