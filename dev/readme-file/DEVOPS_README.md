# QAssure Platform - DevOps & Infrastructure Guide

This document provides a comprehensive guide to deploying, managing, and developing with the QAssure Platform.

## 📁 Directory Structure
```
QAssure-Project/
├── k8s/                        # Kubernetes manifests
│   ├── base/                   # Base configurations
│   │   ├── namespace.yaml      # Namespace definition
│   │   ├── configmap.yaml      # Environment configuration
│   │   ├── secrets.yaml        # Secrets template
│   │   └── ingress.yaml        # Ingress & TLS
│   ├── deployments/            # Deployment manifests
│   │   ├── api-deployment.yaml # Main API deployment
│   │   ├── redis-deployment.yaml
│   │   └── hpa.yaml            # Horizontal Pod Autoscaler
│   └── services/
│       └── services.yaml       # Service definitions
├── helm/
│   └── qassure/                # Helm chart
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
├── .github/
│   └── workflows/              # CI/CD pipelines
│       ├── ci.yml              # Continuous Integration
│       └── cd.yml              # Continuous Deployment
├── deploy/
│   ├── scripts/                # Deployment scripts
│   │   ├── deploy.sh
│   │   ├── rollback.sh
│   │   ├── health-check.sh
│   │   └── setup-secrets.sh
│   └── docker/                 # Docker files
│       ├── Dockerfile
│       ├── docker-compose.yml
│       └── .dockerignore
├── sdk/
│   ├── javascript/             # JavaScript/Node.js SDK
│   └── python/                 # Python SDK
└── cli/                        # Command Line Interface
```

## 🚀 Quick Start

### Option 1: Docker Compose (Development)
```bash
cd deploy/docker
docker-compose up -d
```

Access API at: http://localhost:3000

### Option 2: Kubernetes (Production)
```bash
# Apply base configurations
kubectl apply -f k8s/base/

# Apply deployments
kubectl apply -f k8s/deployments/

# Apply services
kubectl apply -f k8s/services/
```

### Option 3: Helm (Recommended for Production)
```bash
# Add dependencies
cd helm/qassure
helm dependency update

# Install
helm install qassure ./helm/qassure \
  --namespace qassure \
  --create-namespace \
  -f helm/qassure/values.yaml
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | production |
| PORT | API port | 3000 |
| DATABASE_URL | PostgreSQL connection | - |
| REDIS_URL | Redis connection | - |
| JWT_SECRET | JWT signing secret | - |
| KAFKA_BROKERS | Kafka broker list | - |
| ELASTICSEARCH_URL | Elasticsearch URL | - |

### Secrets Setup
```bash
# Interactive secrets setup
./deploy/scripts/setup-secrets.sh production

# Or manually create Kubernetes secret
kubectl create secret generic qassure-secrets \
  --from-literal=DB_PASSWORD=xxx \
  --from-literal=JWT_SECRET=xxx \
  --from-literal=REDIS_PASSWORD=xxx \
  -n qassure
```

## 🔄 CI/CD Pipeline

### Continuous Integration (ci.yml)

Triggered on: `push` to main/develop, `pull_request`

Jobs:
1. **Lint** - ESLint, format check
2. **Test** - Unit tests with PostgreSQL/Redis
3. **Security** - npm audit, vulnerability scan
4. **Build** - Docker image build & push to GHCR

### Continuous Deployment (cd.yml)

Triggered on: `push` to main (staging), `tag v*` (production)

Jobs:
1. **Deploy Staging** - Auto-deploy to staging environment
2. **Deploy Production** - Deploy to production with approval
3. **Smoke Tests** - Verify deployment health
4. **Rollback** - Automatic rollback on failure

### Required GitHub Secrets
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
CODECOV_TOKEN
SLACK_WEBHOOK_URL
```

## 📦 Deployment

### Using Deploy Scripts
```bash
# Deploy to staging
./deploy/scripts/deploy.sh staging v1.0.0

# Deploy to production
./deploy/scripts/deploy.sh production v1.0.0

# Rollback
./deploy/scripts/rollback.sh production

# Health check
./deploy/scripts/health-check.sh production
```

### Using Helm
```bash
# Install/Upgrade
helm upgrade --install qassure ./helm/qassure \
  --namespace qassure \
  --set api.image.tag=v1.0.0 \
  --set global.environment=production

# Rollback
helm rollback qassure -n qassure

# Uninstall
helm uninstall qassure -n qassure
```

## 🔍 Monitoring & Health

### Health Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api/v1/health | Basic health check |
| GET /api/v1/health/detailed | Detailed service status |
| GET /api/v1/health/ready | Readiness probe |
| GET /api/v1/health/live | Liveness probe |

### Using CLI
```bash
# Basic health check
qassure health check

# Detailed status
qassure health detailed

# Continuous monitoring
qassure health watch -i 10
```

### Kubernetes Monitoring
```bash
# Check pod status
kubectl get pods -n qassure

# View logs
kubectl logs -f deployment/qassure-api -n qassure

# Check events
kubectl get events -n qassure --sort-by='.lastTimestamp'

# Resource usage
kubectl top pods -n qassure
```

## 🛠️ SDK Usage

### JavaScript SDK
```javascript
const { QAssureClient } = require('@qassure/sdk');

const client = new QAssureClient({
  baseUrl: 'https://api.qassure.ai',
  tenantId: 'your-tenant-id'
});

await client.login('user@example.com', 'password');

// List modules
const modules = await client.modules.list();

// Register module
const module = await client.modules.register({
  module_id: 'my-module',
  name: 'My Module',
  version: '1.0.0',
  base_url: 'http://my-module:3001',
  health_endpoint: '/health'
});

// Start module
await client.modules.start(module.data.id);
```

### Python SDK
```python
from qassure_sdk import QAssureClient

client = QAssureClient(
    base_url="https://api.qassure.ai",
    tenant_id="your-tenant-id"
)

client.login("user@example.com", "password")

# List modules
modules = client.modules.list()

# Register module
module = client.modules.register({
    "module_id": "my-module",
    "name": "My Module",
    "version": "1.0.0",
    "base_url": "http://my-module:3001",
    "health_endpoint": "/health"
})

# Start module
client.modules.start(module["data"]["id"])
```

## 🖥️ CLI Usage
```bash
# Install CLI
npm install -g @qassure/cli

# Configure
qassure config init

# Login
qassure auth login

# Module operations
qassure modules list
qassure modules register -i
qassure modules start <id>
qassure modules health <id>

# CAPA operations
qassure capas list
qassure capas create -i
qassure capas close <id>
```

## 🔒 Security

### Pod Security

- Runs as non-root user (UID 1000)
- Read-only root filesystem
- No privilege escalation
- Dropped all capabilities

### Network Security

- Network policies enabled
- TLS termination at ingress
- Internal service communication only

### Secrets Management

- Kubernetes Secrets (base64 encoded)
- External Secrets Operator support
- Never commit secrets to git

## 📈 Scaling

### Horizontal Pod Autoscaler
```yaml
minReplicas: 3
maxReplicas: 10
metrics:
  - cpu: 70%
  - memory: 80%
```

### Manual Scaling
```bash
# Scale deployment
kubectl scale deployment qassure-api --replicas=5 -n qassure

# Using Helm
helm upgrade qassure ./helm/qassure --set api.replicaCount=5
```

## 🐛 Troubleshooting

### Common Issues

**Pod CrashLoopBackOff**
```bash
kubectl logs <pod-name> -n qassure --previous
kubectl describe pod <pod-name> -n qassure
```

**Database Connection Failed**
```bash
# Check if postgres is running
kubectl get pods -l app=postgres -n qassure

# Test connection from API pod
kubectl exec -it <api-pod> -n qassure -- nc -zv postgres-service 5432
```

**Health Check Failing**
```bash
# Check service endpoints
kubectl get endpoints -n qassure

# Test health endpoint
kubectl exec -it <api-pod> -n qassure -- curl localhost:3000/api/v1/health
```

### Debug Mode
```bash
# Start debug pod
kubectl run debug --rm -it --image=busybox -n qassure -- sh

# View all resources
kubectl get all -n qassure
```

## 📋 Checklist

### Pre-Deployment
- [ ] Secrets configured
- [ ] Database migrated
- [ ] Docker image built and pushed
- [ ] Helm values reviewed
- [ ] Resource limits set appropriately

### Post-Deployment
- [ ] Health checks passing
- [ ] Logs showing no errors
- [ ] Metrics collecting
- [ ] Alerts configured
- [ ] Smoke tests passing

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [QAssure API Documentation](https://docs.qassure.ai)

## 📞 Support

- GitHub Issues: https://github.com/qassure/platform/issues
- Email: devops@qassure.ai
- Slack: #qassure-platform
