#!/usr/bin/env bash
# Creates the GHCR image pull secret in the ai-tutor namespace for minikube.
# Run this once before applying manifests.
#
# Usage:
#   export GITHUB_USER=nasttolm
#   export GITHUB_TOKEN=<your PAT with read:packages scope>
#   ./k8s/setup-minikube-secrets.sh

set -euo pipefail

NAMESPACE="ai-tutor"
SECRET_NAME="ghcr-secret"
REGISTRY="ghcr.io"

: "${GITHUB_USER:?Set GITHUB_USER to your GitHub username}"
: "${GITHUB_TOKEN:?Set GITHUB_TOKEN to a PAT with read:packages scope}"

echo "Creating namespace ${NAMESPACE} if it does not exist..."
kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1 || \
  kubectl create namespace "${NAMESPACE}"

echo "Creating/updating ${SECRET_NAME} in namespace ${NAMESPACE}..."
kubectl create secret docker-registry "${SECRET_NAME}" \
  --namespace="${NAMESPACE}" \
  --docker-server="${REGISTRY}" \
  --docker-username="${GITHUB_USER}" \
  --docker-password="${GITHUB_TOKEN}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Done. Secret ${SECRET_NAME} is ready."
