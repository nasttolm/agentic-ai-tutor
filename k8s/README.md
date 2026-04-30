# Kubernetes Deployment

Kubernetes manifests for the AI Tutor microservices stack.

## Structure

- `base/` - shared resources for all environments
- `overlays/aws/` - AWS-compatible deployment with ALB ingress
- `overlays/local/` - local deployment without cloud-specific ingress assumptions
- `argo/` - Argo CD `AppProject` and `Application`

The repository root `k8s/kustomization.yaml` is kept as the AWS-compatible default for GitOps (`path: k8s`).

## Quick Start

### Local Kubernetes (Docker Desktop / Minikube)

```bash
kubectl apply -k k8s/overlays/local
kubectl -n ai-tutor get pods
kubectl -n ai-tutor port-forward svc/frontend 3000:80
```

Open `http://localhost:3000`.

### AWS-compatible mode

```bash
kubectl apply -k k8s/overlays/aws
kubectl -n ai-tutor get ingress
```

## Argo CD

```bash
kubectl apply -f k8s/argo/project.yaml
kubectl apply -f k8s/argo/application.yaml
```

For local UI access:

```bash
kubectl -n argocd port-forward svc/argocd-server 8080:443
```

Open `https://localhost:8080`.
