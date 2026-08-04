#!/bin/bash
set -e

# QAssure Platform Deployment Script
# Usage: ./deploy.sh [environment] [version]

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
NAMESPACE="qassure"
HELM_RELEASE="qassure"

echo "=========================================="
echo "QAssure Platform Deployment"
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"
echo "=========================================="

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo "Error: Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# Set namespace based on environment
if [ "$ENVIRONMENT" == "staging" ]; then
    NAMESPACE="qassure-staging"
fi

# Check kubectl connection
echo "Checking Kubernetes connection..."
kubectl cluster-info > /dev/null 2>&1 || {
    echo "Error: Cannot connect to Kubernetes cluster"
    exit 1
}

# Check if namespace exists, create if not
if ! kubectl get namespace $NAMESPACE > /dev/null 2>&1; then
    echo "Creating namespace $NAMESPACE..."
    kubectl create namespace $NAMESPACE
fi

# Deploy using Helm
echo "Deploying QAssure Platform..."
helm upgrade --install $HELM_RELEASE ./helm/qassure \
    --namespace $NAMESPACE \
    --set api.image.tag=$VERSION \
    --set global.environment=$ENVIRONMENT \
    --wait \
    --timeout 10m

# Verify deployment
echo "Verifying deployment..."
kubectl rollout status deployment/qassure-api -n $NAMESPACE --timeout=5m

# Get service info
echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
kubectl get pods -n $NAMESPACE
echo ""
kubectl get svc -n $NAMESPACE

echo ""
echo "To check logs: kubectl logs -f deployment/qassure-api -n $NAMESPACE"
