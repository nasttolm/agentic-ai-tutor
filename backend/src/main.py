"""
AI Tutor Backend - FastAPI Application

Supports two modes:
- Multi-subject mode (default): loads all subjects
- Single-subject mode: set SUBJECT env var (e.g., SUBJECT=fsd)
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from . import logging_config  # noqa: F401 — configures root logger on import
from .config import load_subjects, SUBJECT

logger = logging.getLogger(__name__)
from .schemas import (
    ChatRequest,
    ChatResponse,
    SubjectInfo,
    HealthResponse,
    Source,
)
from .rag import (
    init_embedder,
    init_rag_client,
    retrieve_chunks,
    build_context,
)
from .inference import (
    init_tokenizer,
    init_base_model,
    load_adapter,
    generate_response,
    generate_response_stream,
    get_loaded_subjects,
)

# Global subjects config
subjects: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, cleanup on shutdown."""
    global subjects

    logger.info("Loading subjects config...")
    subjects = load_subjects()

    logger.info("Loading embedder...")
    init_embedder()

    logger.info("Loading tokenizer...")
    init_tokenizer()

    logger.info("Loading base model...")
    init_base_model()

    for key, cfg in subjects.items():
        logger.info("Loading adapter for %s...", key)
        load_adapter(key, cfg["adapter"])

        logger.info("Loading RAG for %s...", key)
        init_rag_client(key)

    logger.info("Ready!")
    yield

    logger.info("Shutting down...")


# FastAPI app
_title = f"AI Tutor API ({SUBJECT.upper()})" if SUBJECT else "AI Tutor API"
_description = (
    f"AI tutoring for {SUBJECT.upper()} with LoRA + RAG"
    if SUBJECT
    else "Subject-specific AI tutoring with LoRA + RAG"
)

app = FastAPI(
    title=_title,
    description=_description,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse)
def health():
    """Health check endpoint."""
    loaded = get_loaded_subjects()
    versions = {key: subjects[key].get("version", "unknown") for key in loaded if key in subjects}
    return HealthResponse(
        status="ok",
        subjects_loaded=loaded,
        versions=versions,
    )


@app.get("/api/subjects", response_model=list[SubjectInfo])
def list_subjects():
    """List available subjects."""
    return [
        SubjectInfo(id=key, name=cfg["name"])
        for key, cfg in subjects.items()
    ]


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Chat with AI tutor."""
    if req.subject not in subjects:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown subject: {req.subject}"
        )

    # RAG retrieval
    chunks = retrieve_chunks(req.subject, req.question)
    context = build_context(chunks)

    # Generate response
    history = [{"role": m.role, "content": m.content} for m in req.messages]
    answer = generate_response(req.subject, req.question, history, context)

    # Format sources (first 3, with similarity score)
    sources = [
        Source(file=c["file"], text=c["text"][:200], similarity=round(c.get("similarity", 0), 2))
        for c in chunks[:3]
    ]

    return ChatResponse(answer=answer, sources=sources)


@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest):
    """Chat with AI tutor (streaming response)."""
    if req.subject not in subjects:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown subject: {req.subject}"
        )

    # RAG retrieval
    chunks = retrieve_chunks(req.subject, req.question)
    context = build_context(chunks)

    # Generate streaming response
    history = [{"role": m.role, "content": m.content} for m in req.messages]

    def generate():
        for token in generate_response_stream(req.subject, req.question, history, context):
            yield token

    return StreamingResponse(generate(), media_type="text/plain")


# -----------------------------------------------------------------------------
# Run directly
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
