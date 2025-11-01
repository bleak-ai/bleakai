import json
from http.client import HTTPException

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.load import dumpd
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
    thread_id = body.get("thread_id", "1")
    config = {"configurable": {"thread_id": thread_id}}

    input_data = body.get("input", {})
    if not isinstance(input_data, dict) or "input" not in input_data:
        raise HTTPException(status_code=400, detail="Invalid input structure")

    message = {"content": input_data["input"], "type": "human"}
    print("message", message)

    async def event_generator():
        updates = []
        async for update in graph.astream(
            {"messages": [message]},  # input
            config,  # pass config here with thread_id
            stream_mode="updates",
        ):
            updates.append(dumpd(update))

        yield json.dumps(updates)

    return StreamingResponse(
        event_generator(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache"},
    )
