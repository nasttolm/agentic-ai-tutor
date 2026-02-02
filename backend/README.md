# AI Tutor Backend

FastAPI backend with LoRA + RAG inference.

## Setup

### 1. Create virtual environment

```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows Git Bash
# or: venv\Scripts\activate.bat  # Windows CMD
# or: source venv/bin/activate   # Linux/Mac
```

### 2. Install PyTorch

**GPU (NVIDIA CUDA 12.1):**
```bash
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

**CPU only:**
```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run

```bash
DATA_DIR=../data uvicorn src.main:app --reload
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/subjects` | List subjects |
| POST | `/api/chat` | Chat with tutor |

## API Docs

Open http://localhost:8000/docs for Swagger UI.
