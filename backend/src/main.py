"""
AI Tutor Backend - FastAPI Application
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import load_subjects
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
    get_loaded_subjects,
)

# Global subjects config
subjects: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, cleanup on shutdown."""
    global subjects

    print("Loading subjects config...")
    subjects = load_subjects()

    print("Loading embedder...")
    init_embedder()

    print("Loading tokenizer...")
    init_tokenizer()

    print("Loading base model...")
    init_base_model()

    # Load adapters and RAG for each subject
    for key, cfg in subjects.items():
        print(f"Loading adapter for {key}...")
        load_adapter(key, cfg["adapter"])

        print(f"Loading RAG for {key}...")
        init_rag_client(key, cfg["rag"])

    print("Ready!")
    yield

    print("Shutting down...")


# FastAPI app
app = FastAPI(
    title="AI Tutor API",
    description="Subject-specific AI tutoring with LoRA + RAG",
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
    return HealthResponse(
        status="ok",
        subjects_loaded=get_loaded_subjects(),
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

    # Format sources (first 3, truncated)
    sources = [
        Source(file=c["file"], text=c["text"][:200])
        for c in chunks[:3]
    ]

    return ChatResponse(answer=answer, sources=sources)


# -----------------------------------------------------------------------------
# Run directly
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
