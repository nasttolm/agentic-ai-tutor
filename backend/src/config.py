"""
Configuration and settings
"""
import os
import yaml
from pathlib import Path

# Paths
# Default to ./data relative to backend/ for local development
_default_data = Path(__file__).parent.parent / "data"
BASE_DIR = Path(os.getenv("DATA_DIR", str(_default_data)))
ADAPTERS_DIR = BASE_DIR / "adapters"
RAG_DIR = BASE_DIR / "rag"
CONFIG_PATH = Path(__file__).parent.parent / "subjects.yaml"

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
TEMPERATURE = 0.1  # Lower temperature = more factual, less creative
REPETITION_PENALTY = 1.1
LOAD_IN_4BIT = True

# System prompt
SYSTEM_PROMPT = (
    "You are a helpful tutor. Answer clearly and step-by-step when appropriate. "
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
        print(f"[Config] Single-subject mode: {SUBJECT}")
        return {SUBJECT: all_subjects[SUBJECT]}

    print(f"[Config] Multi-subject mode: {list(all_subjects.keys())}")
    return all_subjects
