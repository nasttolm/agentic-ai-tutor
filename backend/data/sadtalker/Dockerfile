# SadTalker service — Python 3.10 + PyTorch 2.0 + CUDA 11.7
FROM pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime

WORKDIR /app

# Prevent tzdata interactive prompt
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# System dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg git wget \
    libgl1-mesa-glx libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Clone SadTalker
RUN git clone https://github.com/OpenTalker/SadTalker.git /sadtalker

# Install SadTalker requirements (numpy pin overridden for Python 3.10 compat)
RUN pip install "numpy>=1.24,<2.0" && \
    pip install -r /sadtalker/requirements.txt

# API server
RUN pip install fastapi uvicorn python-multipart

# App and avatar (avatar.jpg must be present in build context)
COPY app.py /app/app.py
COPY avatar.jpg /app/avatar.jpg

# SadTalker checkpoints mounted at runtime via volume:
#   -v ./checkpoints:/sadtalker/checkpoints
# Download them once with: bash /sadtalker/scripts/download_models.sh

EXPOSE 7860

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
