"""
RAG retrieval using ChromaDB
"""
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

from .config import RAG_DIR, EMBED_MODEL, TOP_K, MAX_CONTEXT_TOKENS

# Global embedder
embedder: SentenceTransformer = None
rag_clients: dict = {}


def init_embedder():
    """Initialize the embedding model."""
    global embedder
    embedder = SentenceTransformer(EMBED_MODEL)


def init_rag_client(subject: str, rag_name: str) -> bool:
    """Initialize ChromaDB client for a subject."""
    rag_path = RAG_DIR / rag_name / "chroma_store"
    if not rag_path.exists():
        print(f"  Warning: RAG not found at {rag_path}")
        return False

    rag_clients[subject] = chromadb.PersistentClient(
        path=str(rag_path),
        settings=Settings(anonymized_telemetry=False),
    )
    return True


def retrieve_chunks(subject: str, query: str, top_k: int = TOP_K) -> list[dict]:
    """Retrieve relevant chunks from ChromaDB."""
    client = rag_clients.get(subject)
    if not client or not embedder:
        return []

    try:
        coll = client.get_collection("rag")
    except Exception:
        return []

    q_emb = embedder.encode([query], normalize_embeddings=True).tolist()[0]
    res = coll.query(
        query_embeddings=[q_emb],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]

    return [
        {"text": doc, "file": meta.get("source", "unknown")}
        for doc, meta in zip(docs, metas)
    ]


def build_context(chunks: list[dict], max_tokens: int = MAX_CONTEXT_TOKENS) -> str:
    """Build context string from chunks within token budget."""
    parts = []
    total = 0
    for chunk in chunks:
        tokens = len(chunk["text"]) // 4  # approximate
        if total + tokens > max_tokens:
            break
        parts.append(chunk["text"])
        total += tokens
    return "\n\n---\n\n".join(parts)
