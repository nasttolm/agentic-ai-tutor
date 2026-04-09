"""
Text-to-Speech using Piper TTS (https://github.com/rhasspy/piper)

Voice model must be downloaded before use:
    python backend/download_piper_model.py

Models are stored in: backend/data/piper/
Controlled via env vars:
    TTS_ENABLED=true|false   (default: true)
    PIPER_VOICE=<voice-name> (default: en_US-lessac-medium)
    PIPER_MODELS_DIR=<path>  (default: backend/data/piper/)
"""
import io
import logging
import os
import wave
from pathlib import Path

logger = logging.getLogger(__name__)

TTS_ENABLED = os.getenv("TTS_ENABLED", "true").lower() == "true"
PIPER_VOICE = os.getenv("PIPER_VOICE", "en_US-lessac-medium")
PIPER_MODELS_DIR = Path(
    os.getenv(
        "PIPER_MODELS_DIR",
        str(Path(__file__).parent.parent / "data" / "piper"),
    )
)

_voice = None


def init_tts() -> bool:
    """Initialise Piper TTS. Returns True if successfully loaded."""
    global _voice

    if not TTS_ENABLED:
        logger.info("TTS disabled via TTS_ENABLED=false")
        return False

    try:
        from piper import PiperVoice  # type: ignore
    except ImportError:
        logger.warning("piper-tts not installed — TTS disabled. Run: pip install piper-tts")
        return False

    model_path = PIPER_MODELS_DIR / f"{PIPER_VOICE}.onnx"
    config_path = PIPER_MODELS_DIR / f"{PIPER_VOICE}.onnx.json"

    if not model_path.exists():
        logger.warning(
            "Piper model not found at %s — TTS disabled. Run: python download_piper_model.py",
            model_path,
        )
        return False

    logger.info("Loading Piper voice: %s", PIPER_VOICE)
    _voice = PiperVoice.load(str(model_path), config_path=str(config_path))
    logger.info("Piper TTS ready")
    return True


def is_tts_available() -> bool:
    return _voice is not None


def _prepend_silence(wav_bytes: bytes, duration_ms: int = 250) -> bytes:
    """Prepend silence to a WAV file to allow audio device initialisation."""
    buf_in = io.BytesIO(wav_bytes)
    with wave.open(buf_in, "rb") as wav_in:
        params = wav_in.getparams()
        frames = wav_in.readframes(wav_in.getnframes())

    silence_frame_count = int(params.framerate * duration_ms / 1000)
    silence = b"\x00" * silence_frame_count * params.nchannels * params.sampwidth

    buf_out = io.BytesIO()
    with wave.open(buf_out, "wb") as wav_out:
        wav_out.setparams(params)
        wav_out.writeframes(silence + frames)
    return buf_out.getvalue()


def run_rhubarb(wav_bytes: bytes, dialogue: str = "") -> list[dict]:
    """Run Rhubarb on WAV bytes, return mouth cues [{start, end, value}].
    Returns empty list if Rhubarb is not installed or fails.
    """
    import subprocess, json, tempfile, os, shutil

    if not shutil.which("rhubarb"):
        return []

    tmp_wav = tmp_txt = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(wav_bytes)
            tmp_wav = f.name

        cmd = ["rhubarb", "-f", "json", "--machineReadable", "-q", tmp_wav]
        if dialogue:
            with tempfile.NamedTemporaryFile(suffix=".txt", delete=False,
                                             mode="w", encoding="utf-8") as f:
                f.write(dialogue)
                tmp_txt = f.name
            cmd += ["-d", tmp_txt]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if result.returncode != 0:
            logger.warning("Rhubarb failed: %s", result.stderr[:200])
            return []
        return json.loads(result.stdout).get("mouthCues", [])
    except Exception as exc:
        logger.warning("Rhubarb error: %s", exc)
        return []
    finally:
        for p in [tmp_wav, tmp_txt]:
            if p:
                try:
                    os.unlink(p)
                except OSError:
                    pass


def split_sentences(text: str) -> list[str]:
    """Split text into sentences for streaming synthesis."""
    import re
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in parts if s.strip()]


def synthesize_sentences(text: str):
    """Yield (wav_bytes, cues) for each sentence. Used for streaming TTS."""
    sentences = split_sentences(text)
    if not sentences:
        sentences = [text]
    for sentence in sentences:
        wav = synthesize(sentence)
        cues = run_rhubarb(wav, sentence)
        yield wav, cues


def synthesize(text: str) -> bytes:
    """Synthesize text to WAV audio bytes. Raises RuntimeError if TTS not available."""
    if not is_tts_available():
        raise RuntimeError("TTS not available — Piper model not loaded")

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav_file:
        _voice.synthesize_wav(text, wav_file)

    return _prepend_silence(buf.getvalue())
