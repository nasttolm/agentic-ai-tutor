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

# Model settings
BASE_MODEL = "microsoft/Phi-4-mini-instruct"
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
MAX_SEQ_LEN = 2048

# RAG settings
TOP_K = 6
MAX_CONTEXT_TOKENS = 1400

# Generation settings
MAX_NEW_TOKENS = 512
TEMPERATURE = 0.1  # Lower temperature = more factual, less creative

# System prompt
SYSTEM_PROMPT = (
    "You are a helpful tutor for university courses. "
    "IMPORTANT: Answer questions ONLY based on the course materials provided below. "
    "Do NOT use external knowledge. If the answer is not in the course materials, say so. "
    "Always cite specific examples from the provided materials."
)


def load_subjects() -> dict:
    """Load subjects configuration from YAML."""
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)["subjects"]
