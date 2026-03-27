"""
SadTalker client — calls the SadTalker Docker service via HTTP.

Configure via env vars:
    SADTALKER_URL=http://localhost:7860   (default: disabled)
    SADTALKER_TIMEOUT=180                 (seconds, default: 180)
"""
import logging
import os

import httpx

logger = logging.getLogger(__name__)

SADTALKER_URL = os.getenv("SADTALKER_URL", "")
SADTALKER_TIMEOUT = float(os.getenv("SADTALKER_TIMEOUT", "180"))


def is_sadtalker_available() -> bool:
    return bool(SADTALKER_URL)


def generate_video(audio_bytes: bytes) -> bytes:
    """Send WAV audio to SadTalker service, returns MP4 bytes."""
    if not is_sadtalker_available():
        raise RuntimeError("SadTalker not available — set SADTALKER_URL env var")

    try:
        response = httpx.post(
            f"{SADTALKER_URL}/generate",
            files={"audio": ("input.wav", audio_bytes, "audio/wav")},
            timeout=SADTALKER_TIMEOUT,
        )
        response.raise_for_status()
        return response.content
    except httpx.TimeoutException as exc:
        raise RuntimeError("SadTalker timed out") from exc
    except httpx.HTTPStatusError as exc:
        raise RuntimeError(f"SadTalker error: {exc.response.text[:200]}") from exc
