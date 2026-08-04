#!/bin/bash
set -e

# QAssure Platform Secrets Setup Script
# Usage: ./setup-secrets.sh [environment]

ENVIRONMENT=${1:-staging}
NAMESPACE="qassure"

echo "=========================================="
echo "QAssure Platform Secrets Setup"
echo "Environment: $ENVIRONMENT"
echo "=========================================="

# Set namespace based on environment
if [ "$ENVIRONMENT" == "staging" ]; then
    NAMESPACE="qassure-staging"
fi

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE > /dev/null 2>&1; then
    echo "Creating namespace $NAMESPACE..."
    kubectl create namespace $NAMESPACE
fi

# Prompt for secrets
echo ""
echo "Enter the following secrets (input will be hidden):"
echo ""

read -sp "Database Password: " DB_PASSWORD
echo ""
read -sp "JWT Secret (min 32 chars): " JWT_SECRET
echo ""
read -sp "JWT Refresh Secret (min 32 chars): " JWT_REFRESH_SECRET
echo ""
read -sp "Redis Password: " REDIS_PASSWORD
echo ""
read -sp "OpenAI API Key (optional, press Enter to skip): " OPENAI_API_KEY
echo ""
read -sp "Anthropic API Key (optional, press Enter to skip): " ANTHROPIC_API_KEY
echo ""

# Create or update secret
echo ""
echo "Creating Kubernetes secret..."

kubectl create secret generic qassure-secrets \
    --namespace $NAMESPACE \
    --from-literal=DB_PASSWORD="$DB_PASSWORD" \
    --from-literal=JWT_SECRET="$JWT_SECRET" \
    --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
    --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" \
    --from-literal=OPENAI_API_KEY="$OPENAI_API_KEY" \
    --from-literal=ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
    --from-literal=DATABASE_URL="postgresql://qassure_admin:${DB_PASSWORD}@postgres-service:5432/qassure_prod?sslmode=require" \
    --from-literal=REDIS_URL="redis://:${REDIS_PASSWORD}@redis-service:6379" \
    --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo "=========================================="
echo "Secrets configured successfully!"
echo "=========================================="
kubectl get secret qassure-secrets -n $NAMESPACE
