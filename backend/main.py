import json
from http.client import HTTPException

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.load import dumpd
from langgraph.types import Command
from src.graph import graph

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/stream")
async def stream_updates(request: Request):
    """Stream LangGraph updates as NDJSON."""
    body = await request.json()

    # Get thread_id from request or use default
    thread_id = body.get("thread_id", None)
    if thread_id is None:
        raise HTTPException(status_code=400, detail="Missing thread_id")

    print("thread_id", thread_id)
    config = {"configurable": {"thread_id": thread_id}}
    print("body", body)

    # Determine input based on whether we're resuming or starting fresh
    command_data = body.get("command")
    if command_data and "resume" in command_data:
        graph_input = Command(resume=command_data["resume"])
    else:
        input_data = body.get("input", "")
        message = {"content": input_data, "type": "human"}
        print("message", message)
        graph_input = {"messages": [message]}

    # Single event generator with error handling
    async def event_generator():
        updates = []
        try:
            async for update in graph.astream(
                graph_input,
                config,
                stream_mode="updates",
            ):
                updates.append(dumpd(update))

            yield json.dumps(updates)
        except Exception as e:
            # Send error as part of the stream
            error_response = {"error": str(e)}
            yield json.dumps(error_response)

    return StreamingResponse(
        event_generator(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache"},
    )
