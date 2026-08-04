#!/bin/bash
set -e

# QAssure Platform Health Check Script
# Usage: ./health-check.sh [environment]

ENVIRONMENT=${1:-staging}
NAMESPACE="qassure"

echo "=========================================="
echo "QAssure Platform Health Check"
echo "Environment: $ENVIRONMENT"
echo "=========================================="

# Set namespace and URL based on environment
if [ "$ENVIRONMENT" == "staging" ]; then
    NAMESPACE="qassure-staging"
    API_URL="https://staging-api.qassure.ai"
elif [ "$ENVIRONMENT" == "production" ]; then
    NAMESPACE="qassure"
    API_URL="https://api.qassure.ai"
else
    NAMESPACE="qassure-staging"
    API_URL="http://localhost:3000"
fi

# Check Kubernetes resources
echo ""
echo "Checking Kubernetes Resources..."
echo "--------------------------------"

echo "Pods:"
kubectl get pods -n $NAMESPACE

echo ""
echo "Services:"
kubectl get svc -n $NAMESPACE

echo ""
echo "Deployments:"
kubectl get deployments -n $NAMESPACE

# Check API health endpoint
echo ""
echo "Checking API Health..."
echo "----------------------"

if command -v curl &> /dev/null; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null || echo "000")
    
    if [ "$HTTP_STATUS" == "200" ]; then
        echo "✅ API Health: OK (HTTP $HTTP_STATUS)"
        
        # Get detailed health info
        echo ""
        echo "Detailed Health Response:"
        curl -s "$API_URL/api/v1/health" | jq . 2>/dev/null || curl -s "$API_URL/api/v1/health"
    elif [ "$HTTP_STATUS" == "000" ]; then
        echo "⚠️  API Health: Cannot connect to $API_URL"
    else
        echo "❌ API Health: FAILED (HTTP $HTTP_STATUS)"
    fi
else
    echo "Warning: curl not installed, skipping API health check"
fi

# Check pod logs for errors
echo ""
echo "Recent Pod Logs (last 20 lines):"
echo "---------------------------------"
kubectl logs deployment/qassure-api -n $NAMESPACE --tail=20 2>/dev/null || echo "Could not retrieve logs"

echo ""
echo "=========================================="
echo "Health Check Complete"
echo "=========================================="
