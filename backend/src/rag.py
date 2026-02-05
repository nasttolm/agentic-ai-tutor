"""
RAG retrieval using ChromaDB
"""
import re

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

    client = chromadb.PersistentClient(
        path=str(rag_path),
        settings=Settings(anonymized_telemetry=False),
    )

    # Log available collections
    try:
        collections = client.list_collections()
        print(f"  Collections in {subject}: {[c.name for c in collections]}")
    except Exception as e:
        print(f"  Error listing collections: {e}")

    rag_clients[subject] = client
    return True


def retrieve_chunks(subject: str, query: str, top_k: int = TOP_K) -> list[dict]:
    """Retrieve relevant chunks from ChromaDB."""
    client = rag_clients.get(subject)
    if not client or not embedder:
        print(f"[RAG] No client or embedder for {subject}")
        return []

    try:
        coll = client.get_collection("rag")
        print(f"[RAG] Found collection 'rag' for {subject}, count: {coll.count()}")
    except Exception as e:
        print(f"[RAG] Error getting collection for {subject}: {e}")
        # Try to list available collections
        try:
            collections = client.list_collections()
            print(f"[RAG] Available collections: {[c.name for c in collections]}")
        except:
            pass
        return []

    q_emb = embedder.encode([query], normalize_embeddings=True).tolist()[0]
    res = coll.query(
        query_embeddings=[q_emb],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    distances = res.get("distances", [[]])[0]

    print(f"[RAG] Retrieved {len(docs)} chunks for query: {query[:50]}...")
    for i, (doc, dist) in enumerate(zip(docs[:3], distances[:3])):
        print(f"  [{i+1}] similarity={1-dist:.3f}, preview: {doc[:80]}...")

    results = []
    for doc, meta in zip(docs, metas):
        # Extract file names from source_files metadata
        source_files = meta.get("source_files", "")
        file_name = meta.get("topic_id", "unknown")

        if source_files:
            try:
                # Extract file names with extensions (handles malformed JSON)
                matches = re.findall(r"(Topic_[^,]+\.(?:pdf|docx|pptx))", source_files, re.IGNORECASE)
                if matches:
                    # Get unique file names, take first 2
                    unique_files = list(dict.fromkeys(matches))[:2]
                    file_name = ", ".join(unique_files)
            except Exception:
                pass

        similarity = 1 - distances[len(results)]  # Convert distance to similarity
        results.append({"text": doc, "file": file_name, "similarity": similarity})
    return results


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
