from os import error

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from langchain_core.load import dumpd
from langgraph.types import Command
from pydantic import BaseModel
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


async def run_graph(graph_input, config, thread_id):
    """Run the graph and return JSON response with consistent envelope."""
    try:
        updates = [
            dumpd(u)
            async for u in graph.astream(graph_input, config, stream_mode="updates")
        ]
        return JSONResponse(content=updates)
    except Exception:
        return JSONResponse(content=error, status_code=500)


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
