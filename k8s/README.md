# Kubernetes Deployment

Kubernetes manifests for deploying the AI Tutor microservices architecture.

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │            INGRESS                   │
                    │     ai-tutor.example.com            │
                    └──────────┬──────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  FSD Service  │    │  FCS Service  │    │  DMA Service  │
│   (Backend)   │    │   (Backend)   │    │   (Backend)   │
└───────────────┘    └───────────────┘    └───────────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    GPU Node Pool    │
                    │   (nvidia.com/gpu)  │
                    └─────────────────────┘
```

## Prerequisites

- Kubernetes cluster (EKS, GKE, or local)
- kubectl configured
- GPU node pool with NVIDIA drivers
- Container images pushed to registry

## Quick Start

```bash
# Apply all manifests
kubectl apply -k k8s/

# Check status
kubectl get all -n ai-tutor

# View logs
kubectl logs -n ai-tutor -l subject=fsd
```

## Files

| File | Description |
|------|-------------|
| `namespace.yaml` | Creates `ai-tutor` namespace |
| `storage.yaml` | PVC for model data |
| `fsd/` | FSD subject service |
| `fcs/` | FCS subject service |
| `dma/` | DMA subject service |
| `frontend/` | Next.js frontend |
| `ingress.yaml` | Ingress routing rules |
| `kustomization.yaml` | Kustomize config |

## Configuration

### Update Docker Images

Edit `kustomization.yaml`:
```yaml
images:
  - name: ghcr.io/your-username/ai-tutor-backend
    newName: your-registry/ai-tutor-backend
    newTag: v1.0.0
```

### Update Domain

Edit `ingress.yaml`:
```yaml
spec:
  rules:
    - host: your-domain.com
```

## GPU Requirements

Each backend service requires 1 GPU. For 3 subjects:
- Minimum: 3 GPUs (1 per service)
- Node selector: `nvidia.com/gpu: "true"`

## Scaling

```bash
# Scale frontend
kubectl scale deployment frontend -n ai-tutor --replicas=3

# Note: Backend services should remain at 1 replica per GPU
```
