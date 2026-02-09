# Scalable Agentic AI Tutor (SLMs + LoRA + RAG + MLOps)

MSc dissertation project — London South Bank University

## Overview

AI Tutor system built from subject-specific Small Language Models (SLMs) for three academic modules:
- **FSD** — Fundamentals of Software Development
- **FCS** — Fundamentals of Computer Science
- **DMA** — Discrete Mathematics

## Technology Stack

### Model & Training

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Base Model | **Phi-4-mini-instruct** (4.2B params) | Best accuracy/efficiency ratio, MIT license, 0.83kg CO2 |
| Fine-tuning | **LoRA** via Unsloth/PEFT | Parameter-efficient, fits 12GB VRAM |
| QA Generation | Phi-3-mini-4k-instruct | Synthetic dataset creation |
| Training Env | Google Colab (Tesla T4) | Free GPU access |

### RAG Pipeline

| Component | Technology |
|-----------|------------|
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 |
| Vector Database | ChromaDB (persistent, per-subject) |
| Chunking | Token-based (1200 tokens, 120 overlap) |

### MLOps & Infrastructure

| Component | Technology |
|-----------|------------|
| Containerisation | **Docker** + Docker Compose |
| Orchestration | **Kubernetes** / EKS |
| CI/CD | **GitHub Actions** + **Argo CD** |

### Application Layer

| Component | Technology |
|-----------|------------|
| Backend API | **FastAPI** (Python) |
| Frontend | **Next.js** + React + TypeScript |
| TTS | **Piper** (MIT license) |
| Talking-head | **SadTalker** (Apache 2.0) |

### Evaluation Metrics (Completed)

| Metric | Purpose |
|--------|---------|
| BLEU | N-gram precision |
| ROUGE-L | Sequence overlap |
| METEOR | Semantic similarity |
| BERTScore | Embedding-based similarity |

Results available in `dissertation/chapters/plan.tex` (Model evaluation section).

## Project Structure

```
agentic-ai-tutor/
├── backend/               # FastAPI backend
│   ├── src/
│   │   ├── main.py        # API endpoints
│   │   ├── inference.py   # Model inference + LoRA
│   │   ├── rag.py         # ChromaDB retrieval
│   │   ├── config.py      # Configuration
│   │   └── schemas.py     # Pydantic models
│   ├── data/              # LoRA adapters + RAG indices
│   └── requirements.txt
├── frontend/              # Next.js frontend
│   ├── app/
│   │   ├── page.tsx       # Main chat page
│   │   └── components/    # React components
│   └── lib/api.ts         # API client
├── dissertation/          # LaTeX source
│   ├── main.tex
│   ├── chapters/
│   └── figs/
├── notebooks/             # Colab notebooks
│   ├── FinalProject.ipynb         # Full pipeline
│   └── FinalProject_metrics.ipynb # Evaluation
├── docker-compose.yml
└── README.md
```

## Architecture

### Training Pipeline
```
┌─────────────────────────────────────────────────────────────┐
│                     COURSE MATERIALS                         │
│                  (PDF, PPTX, DOCX from Moodle)               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA PROCESSING                            │
│         Topic extraction → Chunking → QA Generation          │
└─────────────────────────┬───────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
┌───────────────────────┐   ┌───────────────────────┐
│    LoRA FINE-TUNING   │   │     RAG INDEXING      │
│  (Phi-4-mini + PEFT)  │   │ (ChromaDB + embeddings)│
└───────────────────────┘   └───────────────────────┘
```

### CI/CD Pipeline
```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│    GitHub    │      │    GHCR      │      │   Argo CD    │
│   Actions    │ ───► │   (Images)   │ ───► │   (GitOps)   │
│   (CI)       │      │              │      │   (CD)       │
└──────────────┘      └──────────────┘      └──────────────┘
```

### Deployment (Microservices)
```
┌─────────────────────────────────────────────────────────────────────┐
│                        KUBERNETES / EKS                              │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                        INGRESS                               │    │
│  └───────────┬─────────────────┬─────────────────┬─────────────┘    │
│              │                 │                 │                   │
│      ┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐          │
│      │  FSD Service  │ │  FCS Service  │ │  DMA Service  │          │
│      │  (FastAPI)    │ │  (FastAPI)    │ │  (FastAPI)    │          │
│      ├───────────────┤ ├───────────────┤ ├───────────────┤          │
│      │ Phi-4-mini    │ │ Phi-4-mini    │ │ Phi-4-mini    │          │
│      │ + LoRA (FSD)  │ │ + LoRA (FCS)  │ │ + LoRA (DMA)  │          │
│      │ + RAG (FSD)   │ │ + RAG (FCS)   │ │ + RAG (DMA)   │          │
│      │ + Piper TTS   │ │ + Piper TTS   │ │ + Piper TTS   │          │
│      └───────┬───────┘ └───────┬───────┘ └───────┬───────┘          │
│              │                 │                 │                   │
│              ▼                 ▼                 ▼                   │
│      ┌─────────────────────────────────────────────────────┐        │
│      │                  GPU NODE (CUDA)                     │        │
│      └─────────────────────────────────────────────────────┘        │
│                                                                      │
│  ┌─────────────────┐      ┌─────────────────┐                       │
│  │    Frontend     │      │   SadTalker     │                       │
│  │   (Next.js)     │      │  (Video Gen)    │                       │
│  └─────────────────┘      └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Author

**Anastasia Tolmacheva**
Supervisor: Brahim El Boudani
London South Bank University, 2026
