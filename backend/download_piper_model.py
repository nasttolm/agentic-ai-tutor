"""
Download Piper TTS voice model from HuggingFace.

Usage:
    python download_piper_model.py
    python download_piper_model.py --voice en_US-lessac-medium

Model is saved to: backend/data/piper/
"""
import argparse
import urllib.request
from pathlib import Path

VOICES = {
    "en_US-lessac-medium": {
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium",
        "files": ["en_US-lessac-medium.onnx", "en_US-lessac-medium.onnx.json"],
        "size_mb": 63,
    },
    "en_US-ryan-medium": {
        "url": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/medium",
        "files": ["en_US-ryan-medium.onnx", "en_US-ryan-medium.onnx.json"],
        "size_mb": 63,
    },
}

OUT_DIR = Path(__file__).parent / "data" / "piper"


def download(voice: str) -> None:
    if voice not in VOICES:
        print(f"Unknown voice: {voice}")
        print(f"Available: {', '.join(VOICES)}")
        return

    info = VOICES[voice]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Voice: {voice} (~{info['size_mb']}MB)")

    for filename in info["files"]:
        out_path = OUT_DIR / filename
        if out_path.exists():
            print(f"  Already exists: {filename}")
            continue
        url = f"{info['url']}/{filename}"
        print(f"  Downloading {filename} ...")
        urllib.request.urlretrieve(url, out_path)
        print(f"  Saved to {out_path}")

    print(f"\nDone! Models saved to {OUT_DIR}")
    print(f"Set env var PIPER_VOICE={voice} if using a non-default voice.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", default="en_US-lessac-medium", choices=list(VOICES))
    args = parser.parse_args()
    download(args.voice)
