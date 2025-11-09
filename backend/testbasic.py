import uvicorn
from fastapi import FastAPI, HTTPException
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from src.basic_graph import graph

app = FastAPI()


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    result: dict


@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        if not request.message or not isinstance(request.message, str):
            raise HTTPException(status_code=400, detail="Invalid message")

        # Invoke the graph with the user message
        result = graph.invoke({"messages": [HumanMessage(request.message)]})

        # Extract the last message response
        print("Response:", result)
        return {"result": result}

    except Exception as error:
        print(f"Chat error: {error}")
        raise HTTPException(status_code=500, detail="Failed to process message")


if __name__ == "__main__":
    import os

    port = int(os.getenv("PORT", "3000"))
    print(f"🤖 Chatbot running on http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
