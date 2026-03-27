"""
SadTalker HTTP service — wraps SadTalker inference as a REST API.

Models are loaded once at startup. Avatar image is pre-processed once.
Per-request cost: audio2coeff + render only (~20-40s on GPU).

POST /generate  — accepts audio/wav file, returns video/mp4
GET  /health    — returns service status
GET  /avatar    — returns avatar image
"""
import os
import shutil
import sys
import tempfile
import threading
from pathlib import Path
from contextlib import asynccontextmanager
from time import strftime

import torch
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response

sys.path.insert(0, '/sadtalker')

from src.utils.preprocess import CropAndExtract
from src.test_audio2coeff import Audio2Coeff
from src.facerender.animate import AnimateFromCoeff
from src.generate_batch import get_data
from src.generate_facerender_batch import get_facerender_data
from src.utils.init_path import init_path

SADTALKER_DIR = Path('/sadtalker')
AVATAR_PATH = Path('/app/avatar.jpg')
CHECKPOINT_DIR = '/sadtalker/checkpoints'
AVATAR_CACHE_DIR = Path('/tmp/avatar_cache')
SIZE = 256
PREPROCESS = 'crop'

# Global state
_models: dict = {}
_lock = threading.Lock()


def _init_models():
    """Load SadTalker models and pre-process avatar. Called once at startup."""
    device = os.getenv('SADTALKER_DEVICE', 'cpu')
    if device == 'cuda' and not torch.cuda.is_available():
        device = 'cpu'
    print(f'[SadTalker] Loading models on {device}...')

    sadtalker_paths = init_path(
        CHECKPOINT_DIR,
        str(SADTALKER_DIR / 'src/config'),
        SIZE, False, PREPROCESS,
    )
    # Point gfpgan to the mounted volume so weights aren't re-downloaded each restart
    os.environ.setdefault('GFPGAN_MODEL_PATH', '/sadtalker/gfpgan/weights')

    preprocess_model = CropAndExtract(sadtalker_paths, device)
    audio_to_coeff = Audio2Coeff(sadtalker_paths, device)
    animate_from_coeff = AnimateFromCoeff(sadtalker_paths, device)

    # Pre-process avatar image once (static — never changes)
    AVATAR_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    first_frame_dir = AVATAR_CACHE_DIR / 'first_frame_dir'
    first_frame_dir.mkdir(exist_ok=True)

    print('[SadTalker] Pre-processing avatar image...')
    first_coeff_path, crop_pic_path, crop_info = preprocess_model.generate(
        str(AVATAR_PATH), str(first_frame_dir), PREPROCESS,
        source_image_flag=True, pic_size=SIZE,
    )
    if first_coeff_path is None:
        raise RuntimeError('SadTalker: failed to extract coefficients from avatar image')

    print('[SadTalker] Ready.')
    return {
        'device': device,
        'sadtalker_paths': sadtalker_paths,
        'preprocess_model': preprocess_model,
        'audio_to_coeff': audio_to_coeff,
        'animate_from_coeff': animate_from_coeff,
        'first_coeff_path': first_coeff_path,
        'crop_pic_path': crop_pic_path,
        'crop_info': crop_info,
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _models
    _models = _init_models()
    yield


app = FastAPI(title='SadTalker Service', lifespan=lifespan)


@app.get('/health')
def health():
    return {
        'status': 'ok',
        'avatar': AVATAR_PATH.exists(),
        'sadtalker': (SADTALKER_DIR / 'inference.py').exists(),
        'models_loaded': bool(_models),
    }


@app.get('/avatar')
def get_avatar():
    if not AVATAR_PATH.exists():
        raise HTTPException(status_code=404, detail='Avatar not found')
    return FileResponse(str(AVATAR_PATH), media_type='image/jpeg')


@app.post('/generate')
async def generate_video(audio: UploadFile):
    """Generate talking-head video from uploaded WAV audio."""
    if not _models:
        raise HTTPException(status_code=503, detail='Models not loaded yet')

    audio_bytes = await audio.read()

    with _lock:
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            audio_path = tmp / 'input.wav'
            audio_path.write_bytes(audio_bytes)
            save_dir = tmp / strftime('%Y_%m_%d_%H.%M.%S')
            save_dir.mkdir()

            try:
                # Audio → coefficients
                batch = get_data(
                    _models['first_coeff_path'], str(audio_path),
                    _models['device'], None, still=True,
                )
                coeff_path = _models['audio_to_coeff'].generate(
                    batch, str(save_dir), 0, None,
                )

                # Coefficients → video frames → MP4
                data = get_facerender_data(
                    coeff_path, _models['crop_pic_path'],
                    _models['first_coeff_path'], str(audio_path),
                    batch_size=2,
                    input_yaw_list=None, input_pitch_list=None, input_roll_list=None,
                    expression_scale=1.0, still_mode=True,
                    preprocess=PREPROCESS, size=SIZE,
                )
                result = _models['animate_from_coeff'].generate(
                    data, str(save_dir), str(AVATAR_PATH), _models['crop_info'],
                    enhancer=None, background_enhancer=None,
                    preprocess=PREPROCESS, img_size=SIZE,
                )

                # SadTalker moves result to save_dir + '.mp4'
                mp4_path = Path(str(save_dir) + '.mp4')
                if not mp4_path.exists():
                    # Try to find inside save_dir
                    mp4_files = list(tmp.rglob('*.mp4'))
                    if not mp4_files:
                        raise HTTPException(status_code=500, detail='No output video generated')
                    mp4_path = mp4_files[0]

                return Response(content=mp4_path.read_bytes(), media_type='video/mp4')

            except HTTPException:
                raise
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f'SadTalker failed: {str(exc)[:300]}') from exc
