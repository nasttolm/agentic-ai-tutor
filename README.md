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

| Component | Technology | Alternative Considered |
|-----------|------------|------------------------|
| Containerisation | **Docker** | Podman |
| Orchestration | **Kubernetes** / EKS | AWS ECS, Docker Swarm |
| CI/CD | **GitHub Actions** + **Argo CD** | Jenkins, Tekton |

### Application Layer

| Component | Technology |
|-----------|------------|
| Backend API | **FastAPI** (Python) |
| Frontend | **Next.js** |
| TTS | **Piper** (MIT license) |
| Talking-head | **SadTalker** (Apache 2.0) |

### Evaluation Metrics

| Metric | Purpose |
|--------|---------|
| BLEU-2 | N-gram precision |
| ROUGE-L | Sequence overlap |
| METEOR | Semantic similarity |
| BERTScore | Embedding-based similarity |

## Project Structure

```
agentic-ai-tutor/
├── dissertation/          # LaTeX source
│   ├── main.tex
│   ├── chapters/
│   └── figs/
├── notebooks/             # Colab notebooks
│   ├── FinalProject.ipynb         # Full pipeline
│   └── FinalProject_metrics.ipynb # Evaluation
└── README.md
```

## Architecture

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
└───────────┬───────────┘   └───────────┬───────────┘
            │                           │
            └─────────────┬─────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   INFERENCE PIPELINE                         │
│       Query → RAG Retrieval → LoRA Model → Response          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT (MLOps)                         │
│     Docker → Kubernetes → GitHub Actions → Argo CD           │
└─────────────────────────────────────────────────────────────┘
```

## Author

**Anastasia Tolmacheva**
Supervisor: Brahim El Boudani
London South Bank University, 2026
