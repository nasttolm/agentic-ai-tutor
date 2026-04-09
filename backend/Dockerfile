FROM pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime

WORKDIR /app

# Install system dependencies for bitsandbytes
RUN apt-get update && apt-get install -y \
    build-essential wget unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install torchvision from PyTorch CUDA wheels to match conda torch in base image
RUN pip install --no-cache-dir \
    "torchvision==0.17.0" \
    --index-url https://download.pytorch.org/whl/cu121 \
    --extra-index-url https://pypi.org/simple

# Copy application
COPY src/ ./src/
COPY subjects.yaml .
COPY data/adapters/ ./adapters/

# Environment
ENV ADAPTERS_DIR=/app/adapters
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
