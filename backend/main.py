import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.load import dumpd
from langchain_core.messages import (
    ToolCall,
)
from langgraph.types import Command
from pydantic import BaseModel
from src.basic_graph import graph as basic_graph
from src.graph import graph

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for request body validation
class StreamInput(BaseModel):
    """Request model for streaming conversations."""

    input: str


class ResumeInput(BaseModel):
    """Request model for resuming conversations."""

    resume: str


class BleakResponse(BaseModel):
    content: str
    tool_calls: list[ToolCall]


async def run_graph(graph_input, config, thread_id, use_basic_graph=False):
    """Run the graph and return streaming response."""

    async def generate_stream():
        try:
            selected_graph = basic_graph if use_basic_graph else graph
            async for update in selected_graph.astream(
                graph_input, config, stream_mode="messages"
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


# Endpoint for starting/continuing a conversation
@app.post("/threads/{thread_id}/stream")
async def stream_thread(thread_id: str, body: StreamInput):
    """Stream conversation updates for a specific thread."""
    config = {"configurable": {"thread_id": thread_id}}
    message = {"content": body.input, "type": "human"}
    graph_input = {"messages": [message]}

    print(f"Streaming for thread_id: {thread_id}")
    print(f"Message: {message}")

    return await run_graph(graph_input, config, thread_id)


# New, specific endpoint for resuming
@app.post("/threads/{thread_id}/resume")
async def resume_thread(thread_id: str, body: ResumeInput):
    """Resume a conversation from an interrupt point."""
    config = {"configurable": {"thread_id": thread_id}}
    graph_input = Command(resume=body.resume)

    print(f"Resuming thread_id: {thread_id} with resume data")

    return await run_graph(graph_input, config, thread_id)


# New, specific endpoint for retrying
@app.post("/threads/{thread_id}/retry")
async def retry_thread(thread_id: str):
    """Retry the last action in a thread."""
    config = {"configurable": {"thread_id": thread_id}}
    graph_input = None  # Input is None for a retry

    print(f"Retrying thread_id: {thread_id}")

    return await run_graph(graph_input, config, thread_id)


# Basic graph endpoints
@app.post("/basic/threads/{thread_id}/stream")
async def basic_stream_thread(thread_id: str, body: StreamInput):
    """Stream conversation updates for a specific thread using basic graph."""
    config = {"configurable": {"thread_id": thread_id}}
    message = {"content": body.input, "type": "human"}
    graph_input = {"messages": [message]}

    print(f"Basic streaming for thread_id: {thread_id}")
    print(f"Message: {message}")

    return await run_graph(graph_input, config, thread_id, use_basic_graph=True)


@app.post("/basic/threads/{thread_id}/resume")
async def basic_resume_thread(thread_id: str, body: ResumeInput):
    """Resume a conversation from an interrupt point using basic graph."""
    config = {"configurable": {"thread_id": thread_id}}
    graph_input = Command(resume=body.resume)

    print(f"Basic resuming thread_id: {thread_id} with resume data")

    return await run_graph(graph_input, config, thread_id, use_basic_graph=True)


@app.post("/basic/threads/{thread_id}/retry")
async def basic_retry_thread(thread_id: str):
    """Retry the last action in a thread using basic graph."""
    config = {"configurable": {"thread_id": thread_id}}
    graph_input = None  # Input is None for a retry

    print(f"Basic retrying thread_id: {thread_id}")

    return await run_graph(graph_input, config, thread_id, use_basic_graph=True)
