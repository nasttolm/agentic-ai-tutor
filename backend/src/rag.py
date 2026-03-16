"""
RAG retrieval using ChromaDB
"""
import logging
import re

import chromadb
from sentence_transformers import SentenceTransformer

from .config import EMBED_MODEL, TOP_K, MAX_CONTEXT_TOKENS, CHROMA_HOST, CHROMA_PORT

logger = logging.getLogger(__name__)

# Global embedder
embedder: SentenceTransformer = None
rag_clients: dict = {}


def init_embedder():
    """Initialize the embedding model."""
    global embedder
    embedder = SentenceTransformer(EMBED_MODEL)


def init_rag_client(subject: str) -> bool:
    """Initialize ChromaDB HTTP client for a subject."""
    try:
        client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
        collections = client.list_collections()
        logger.info("ChromaDB [%s]: connected, collections=%s", subject, [c.name for c in collections])
    except Exception as e:
        logger.warning("Could not connect to ChromaDB at %s:%s: %s", CHROMA_HOST, CHROMA_PORT, e)
        return False

    rag_clients[subject] = client
    return True


def retrieve_chunks(subject: str, query: str, top_k: int = TOP_K) -> list[dict]:
    """Retrieve relevant chunks from ChromaDB."""
    client = rag_clients.get(subject)
    if not client or not embedder:
        logger.warning("No RAG client or embedder for subject '%s'", subject)
        return []

    try:
        coll = client.get_collection("rag")
        logger.debug("RAG [%s]: collection 'rag' has %d documents", subject, coll.count())
    except Exception as e:
        logger.error("RAG [%s]: could not get collection: %s", subject, e)
        try:
            collections = client.list_collections()
            logger.debug("RAG [%s]: available collections: %s", subject, [c.name for c in collections])
        except Exception:
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

    logger.info("RAG [%s]: retrieved %d chunks for query: %s...", subject, len(docs), query[:50])
    for i, (doc, dist) in enumerate(zip(docs[:3], distances[:3])):
        logger.debug("  [%d] similarity=%.3f, preview: %s...", i + 1, 1 - dist, doc[:80])

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
