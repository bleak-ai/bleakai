"""Main FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routers.chat_router import router as chat_router
from src.routers.clarify_router import router as clarify_router
from src.routers.prompt_router import router as prompt_router

app = FastAPI(
    title="BleakAI API",
    description="API for prompt testing and refinement",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(prompt_router)
app.include_router(chat_router)
app.include_router(clarify_router)


@app.get("/")
async def root():
    """Root endpoint to check API health."""
    return {"message": "BleakAI API is running"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
