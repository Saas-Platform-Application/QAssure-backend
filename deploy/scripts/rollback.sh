#!/bin/bash
set -e

# QAssure Platform Rollback Script
# Usage: ./rollback.sh [environment] [revision]

ENVIRONMENT=${1:-staging}
REVISION=${2:-}
NAMESPACE="qassure"
HELM_RELEASE="qassure"

echo "=========================================="
echo "QAssure Platform Rollback"
echo "Environment: $ENVIRONMENT"
echo "=========================================="

# Set namespace based on environment
if [ "$ENVIRONMENT" == "staging" ]; then
    NAMESPACE="qassure-staging"
fi

# Show release history
echo "Release History:"
helm history $HELM_RELEASE -n $NAMESPACE

# If no revision specified, rollback to previous
if [ -z "$REVISION" ]; then
    echo ""
    echo "Rolling back to previous release..."
    helm rollback $HELM_RELEASE -n $NAMESPACE
else
    echo ""
    echo "Rolling back to revision $REVISION..."
    helm rollback $HELM_RELEASE $REVISION -n $NAMESPACE
fi

# Verify rollback
echo ""
echo "Verifying rollback..."
kubectl rollout status deployment/qassure-api -n $NAMESPACE --timeout=5m

echo ""
echo "=========================================="
echo "Rollback Complete!"
echo "=========================================="
kubectl get pods -n $NAMESPACE
