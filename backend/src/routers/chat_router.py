"""Chat router for basic graph endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel
from src.graphs.basic_graph import graph as basic_graph
from src.shared.streaming import create_graph_stream

router = APIRouter(prefix="/basic", tags=["chat"])


class StreamInput(BaseModel):
    """Request model for streaming conversations."""

    input: str


class ResumeInput(BaseModel):
    """Request model for resuming conversations."""

    resume: str


async def run_basic_graph(graph_input, config, thread_id):
    """Run the basic graph and return streaming response."""
    return await create_graph_stream(basic_graph, graph_input, config)


@router.post("/threads/{thread_id}/stream")
async def basic_stream_thread(thread_id: str, body: StreamInput):
    """Stream conversation updates for a specific thread using basic graph."""
    config = {"configurable": {"thread_id": thread_id}}
    message = {"content": body.input, "type": "human"}
    graph_input = {"messages": [message]}

    print(f"Basic streaming for thread_id: {thread_id}")
    print(f"Message: {message}")

    return await run_basic_graph(graph_input, config, thread_id)


@router.post("/threads/{thread_id}/resume")
async def basic_resume_thread(thread_id: str, body: ResumeInput):
    """Resume a conversation from an interrupt point using basic graph."""
    config = {"configurable": {"thread_id": thread_id}}
    from langgraph.types import Command

    graph_input = Command(resume=body.resume)

    print(f"Basic resuming thread_id: {thread_id} with resume data")

    return await run_basic_graph(graph_input, config, thread_id)


@router.post("/threads/{thread_id}/retry")
async def basic_retry_thread(thread_id: str):
    """Retry the last action in a thread using basic graph."""
    config = {"configurable": {"thread_id": thread_id}}
    graph_input = None  # Input is None for a retry

    print(f"Basic retrying thread_id: {thread_id}")

    return await run_basic_graph(graph_input, config, thread_id)
