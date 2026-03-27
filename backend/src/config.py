"""
Configuration and settings
"""
import logging
import os
import yaml
from pathlib import Path

logger = logging.getLogger(__name__)

# Paths
_default_adapters = Path(__file__).parent.parent / "data" / "adapters"
ADAPTERS_DIR = Path(os.getenv("ADAPTERS_DIR", str(_default_adapters)))
CONFIG_PATH = Path(__file__).parent.parent / "subjects.yaml"

# ChromaDB connection
# Option 1 (local): CHROMA_DATA_PATH=./data/rag — uses PersistentClient directly (no HTTP server needed)
# Option 2 (docker/k8s): CHROMA_HOST + CHROMA_PORT — uses HttpClient
CHROMA_DATA_PATH = os.getenv("CHROMA_DATA_PATH", "")  # e.g. ./data/rag
CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8000"))

# Single-subject mode (for microservices)
# If SUBJECT env var is set, only load that subject
SUBJECT = os.getenv("SUBJECT", None)  # e.g., "fsd", "fcs", "dma"

# Model settings
BASE_MODEL = "microsoft/Phi-4-mini-instruct"
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
MAX_SEQ_LEN = 2048

# RAG settings
TOP_K = 6
MAX_CONTEXT_TOKENS = 1400

# Generation settings
MAX_NEW_TOKENS = 192
REPETITION_PENALTY = 1.1
NO_REPEAT_NGRAM_SIZE = 4
LOAD_IN_4BIT = True

# System prompt (context is appended at runtime when available)
SYSTEM_PROMPT = (
    "You are a helpful tutor. Answer clearly and step-by-step when appropriate. "
    "When course materials are provided, use them to answer the question. "
    "Output ONLY the answer to the question. "
    "Do NOT include repository names, metadata tags, or unrelated code. "
    "If code is required, output only minimal code relevant to the question."
)


def load_subjects() -> dict:
    """Load subjects configuration from YAML.

    If SUBJECT env var is set, returns only that subject.
    Otherwise, returns all subjects (backward compatible).
    """
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        all_subjects = yaml.safe_load(f)["subjects"]

    if SUBJECT:
        if SUBJECT not in all_subjects:
            raise ValueError(f"Unknown subject: {SUBJECT}. Available: {list(all_subjects.keys())}")
        logger.info("Single-subject mode: %s", SUBJECT)
        return {SUBJECT: all_subjects[SUBJECT]}

    logger.info("Multi-subject mode: %s", list(all_subjects.keys()))
    return all_subjects
