# AI Tutor Backend

FastAPI backend for the Agentic AI Tutor system with **Phi-4-mini-instruct**, LoRA fine-tuning, and RAG retrieval.

## Features

- **Phi-4-mini-instruct** (4.2B params) base model
- **LoRA adapters** for 3 subjects: FSD, FCS, DMA
- **RAG retrieval** using ChromaDB for contextual answers
- **GPU acceleration** with CUDA support (RTX 4070 Ti tested)
- **REST API** with automatic documentation

## Requirements

- Python 3.10+
- NVIDIA GPU with 12GB+ VRAM
- CUDA 12.1+
- Windows/Linux

## Setup

### 1. Create virtual environment

```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows Git Bash
# or: venv\Scripts\activate.bat  # Windows CMD
# or: source venv/bin/activate   # Linux/Mac
```

### 2. Install PyTorch with CUDA

**GPU (NVIDIA CUDA 12.1):**
```bash
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

**CPU only (not recommended):**
```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Data Structure

Ensure your data directory has this structure:

```
backend/data/
├── adapters/
│   ├── lora_phi4mini_FSD/
│   ├── lora_phi4mini_FCS/
│   └── lora_phi4mini_DMA/
└── rag/
    ├── fsd/chroma_store/
    ├── fcs/chroma_store/
    └── dma/chroma_store/
```

### 5. Run the Server

**Development mode (with auto-reload):**
```bash
export DATA_DIR="./data"  # or: set DATA_DIR=./data (Windows CMD)
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

**Production mode:**
```bash
export DATA_DIR="./data"
uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check + loaded subjects |
| GET | `/api/subjects` | List available subjects |
| POST | `/api/chat` | Chat with AI tutor |

### Example: Chat Request

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "fsd",
    "question": "What is object-oriented programming?",
    "messages": []
  }'
```

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Configuration

Edit `src/config.py` to modify:
- `MAX_NEW_TOKENS = 512` - Max response length
- `TEMPERATURE = 0.3` - Generation randomness
- `TOP_K = 6` - Number of RAG chunks to retrieve

Edit `subjects.yaml` to add/modify subjects.

## Performance

- **First request**: ~60-90 seconds (model loading into GPU)
- **Subsequent requests**: ~5-15 seconds
- **GPU Memory**: ~9-10GB VRAM
- **Model**: Phi-4-mini (~8GB in float16)

## Troubleshooting

### GPU not detected
```bash
nvidia-smi
python -c "import torch; print(torch.cuda.is_available())"
```

### ChromaDB errors
Ensure correct version:
```bash
pip install chromadb==0.4.24
```

### Out of memory
- Reduce `MAX_NEW_TOKENS`
- Close other GPU applications

## Technology Stack

- FastAPI 0.115.0 - Web framework
- Transformers 4.49.0 - Model inference
- PEFT 0.14.0+ - LoRA adapters
- ChromaDB 0.4.24 - Vector database
- Sentence-Transformers 3.0.0+ - Embeddings

## License

MIT
