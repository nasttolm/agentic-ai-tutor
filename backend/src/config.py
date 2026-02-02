"""
Configuration and settings
"""
import os
import yaml
from pathlib import Path

# Paths
BASE_DIR = Path(os.getenv("DATA_DIR", "/data"))
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
TEMPERATURE = 0.3

# System prompt
SYSTEM_PROMPT = (
    "You are a helpful tutor. Answer clearly and step-by-step when appropriate. "
    "Use the provided course materials to give accurate answers."
)


def load_subjects() -> dict:
    """Load subjects configuration from YAML."""
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)["subjects"]
