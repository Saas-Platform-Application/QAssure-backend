# QAssure Platform
# Deployment Guide

| **Document ID**     | QASSURE-DEP-001          |
| ------------------- | ------------------------ |
| **Version**         | 1.2.0                    |
| **Release Date**    | 16 July 2026             |
| **Prepared For**    | L&T Technology Services  |
| **Prepared By**     | QAssure Development Team |
| **Status**          | Final Draft              |
| **Classification**  | CONFIDENTIAL             |

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Architecture Overview](#2-architecture-overview)
3. [Environment Configuration](#3-environment-configuration)
4. [Docker Compose Deployment (Development)](#4-docker-compose-deployment-development)
5. [Kubernetes Deployment (Production)](#5-kubernetes-deployment-production)
6. [Database Migrations](#6-database-migrations)
7. [CI/CD Pipeline](#7-cicd-pipeline)
8. [Health Checks & Monitoring](#8-health-checks--monitoring)
9. [Backup & Disaster Recovery](#9-backup--disaster-recovery)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

### Infrastructure Requirements

| Component | Minimum | Recommended (Production) |
|-----------|---------|------------------------|
| CPU | 4 vCPUs | 16 vCPUs |
| RAM | 8 GB | 32 GB |
| Storage | 100 GB SSD | 1 TB SSD |
| Network | 100 Mbps | 1 Gbps |

### Software Requirements

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | 24.x+ | Container runtime |
| Docker Compose | 2.x+ | Local development orchestration |
| Kubernetes | 1.27+ | Production orchestration |
| Helm | 3.x+ | Kubernetes package manager |
| Node.js | 20 LTS | Runtime (inside container) |
| PostgreSQL | 15+ | Primary database |
| Redis | 7.x+ | Cache & session store |
| Kafka | 3.x+ | Event streaming |

### Cloud Provider Requirements

The platform is cloud-agnostic but tested on:
- **AWS:** EKS, RDS (PostgreSQL), ElastiCache (Redis), MSK (Kafka), S3
- **Azure:** AKS, Azure Database for PostgreSQL, Azure Cache for Redis, Event Hubs, Blob Storage
- **GCP:** GKE, Cloud SQL, Memorystore, Pub/Sub, Cloud Storage

---

## 2. Architecture Overview

```
                    ┌─────────────────────────────────┐
                    │        Load Balancer / Ingress   │
                    │         (NGINX / AWS ALB)        │
                    └────────────────┬────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
     ┌────────▼───────┐   ┌─────────▼──────┐   ┌──────────▼──────┐
     │  Frontend SPA  │   │  Backend API   │   │  Backend API    │
     │  (Static CDN)  │   │   Pod 1/N      │   │   Pod 2/N       │
     └────────────────┘   └─────────┬──────┘   └──────────┬──────┘
                                    │                      │
                          ┌─────────▼──────────────────────▼──────┐
                          │          Infrastructure Layer          │
                          │                                        │
                          │  ┌──────────┐ ┌────────┐ ┌─────────┐  │
                          │  │PostgreSQL│ │ Redis  │ │  Kafka  │  │
                          │  │(Primary +│ │Cluster │ │ Cluster │  │
                          │  │Replicas) │ │        │ │         │  │
                          │  └──────────┘ └────────┘ └─────────┘  │
                          │                                        │
                          │  ┌────────────────────────────────┐   │
                          │  │    Object Storage (S3/Blob)    │   │
                          │  └────────────────────────────────┘   │
                          └────────────────────────────────────────┘
```

---

## 3. Environment Configuration

### 3.1 Required Environment Variables

Create a `.env` file (never commit to source control):

```bash
# ─────────────────────────────────────────
# Application
# ─────────────────────────────────────────
NODE_ENV=production
PORT=3000
APP_NAME=QAssure Platform

# ─────────────────────────────────────────
# Database
# ─────────────────────────────────────────
DATABASE_URL=postgresql://qassure_user:password@db-host:5432/qassure_prod
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_SSL=true

# ─────────────────────────────────────────
# Redis
# ─────────────────────────────────────────
REDIS_URL=redis://:password@redis-host:6379/0
REDIS_KEY_PREFIX=qassure:

# ─────────────────────────────────────────
# Kafka
# ─────────────────────────────────────────
KAFKA_BROKERS=kafka1:9092,kafka2:9092,kafka3:9092
KAFKA_CLIENT_ID=qassure-backend
KAFKA_GROUP_ID=qassure-consumers
KAFKA_SSL=true
KAFKA_SASL_USERNAME=qassure
KAFKA_SASL_PASSWORD=your-kafka-password

# ─────────────────────────────────────────
# Authentication
# ─────────────────────────────────────────
JWT_SECRET=your-256-bit-secret-key-minimum-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=another-256-bit-secret-key
JWT_REFRESH_EXPIRES_IN=7d
SSO_TOKEN_EXPIRATION=30s

# ─────────────────────────────────────────
# Idle Session / Auto-Logout
# ─────────────────────────────────────────
# Total idle time (minutes) before session is revoked at token refresh time.
# Recommended for production: 30. Max effective idle = IDLE_TIMEOUT_MINUTES + JWT_EXPIRES_IN.
IDLE_TIMEOUT_MINUTES=30
# Set to false only during development/debugging to bypass idle enforcement.
IDLE_TIMEOUT_ENABLED=true

# ─────────────────────────────────────────
# File Storage
# ─────────────────────────────────────────
STORAGE_PROVIDER=s3       # s3 | azure-blob | gcs | local
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=qassure-files-prod
FILE_UPLOAD_MAX_SIZE=104857600  # 100MB in bytes

# ─────────────────────────────────────────
# AI Gateway
# ─────────────────────────────────────────
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
AI_PROVIDER_TIMEOUT=120000      # 120 seconds
AI_PROVIDER_MAX_RETRIES=3

# ─────────────────────────────────────────
# Email (SMTP)
# ─────────────────────────────────────────
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=notifications@qassure.com
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=QAssure Platform <notifications@qassure.com>

# ─────────────────────────────────────────
# CORS & Security
# ─────────────────────────────────────────
ALLOWED_ORIGINS=https://app.qassure.com,https://admin.qassure.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
BCRYPT_ROUNDS=12
```

### 3.2 Secrets Management

In production, use a secrets manager — **never** store secrets in environment files on disk:

```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name qassure/production/env \
  --secret-string file://.env

# Kubernetes Secret
kubectl create secret generic qassure-env \
  --from-env-file=.env \
  --namespace=qassure-prod
```

---

## 4. Docker Compose Deployment (Development)

### 4.1 Directory Structure

```
QAssur-backend/
├── docker-compose.yml
├── docker-compose.override.yml   # Local overrides (gitignored)
├── Dockerfile
└── .env                          # Local environment (gitignored)
```

### 4.2 Start All Services

```bash
# Clone the repository
git clone https://github.com/your-org/qassure-backend.git
cd qassure-backend

# Copy example env file
cp .env.example .env
# Edit .env with your local values

# Build and start all services
docker compose up -d

# Run database migrations
docker compose exec api npm run migrate

# Run seeds (development data)
docker compose exec api npm run seed

# View logs
docker compose logs -f api
```

### 4.3 Service Ports (Local Development)

| Service | Port | URL |
|---------|------|-----|
| Backend API | 3000 | http://localhost:3000 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| Kafka | 9092 | localhost:9092 |
| Kafka UI | 8080 | http://localhost:8080 |
| PgAdmin | 5050 | http://localhost:5050 |

### 4.4 docker-compose.yml Reference

```yaml
version: '3.9'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      kafka:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: qassure_dev
      POSTGRES_USER: qassure
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U qassure"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    depends_on: [zookeeper]
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    healthcheck:
      test: ["CMD", "kafka-topics", "--bootstrap-server", "localhost:9092", "--list"]
      interval: 30s

volumes:
  postgres_data:
  redis_data:
```

---

## 5. Kubernetes Deployment (Production)

### 5.1 Namespace Setup

```bash
# Create namespace
kubectl create namespace qassure-prod

# Add Helm repositories
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add cert-manager https://charts.jetstack.io
helm repo update
```

### 5.2 Deploy with Helm

```bash
# Install NGINX Ingress
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# Install Cert-Manager (for TLS)
helm install cert-manager cert-manager/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true

# Deploy QAssure
helm install qassure ./helm/qassure \
  --namespace qassure-prod \
  --values helm/values-production.yaml \
  --set image.tag=v1.0.0
```

### 5.3 Kubernetes Deployment Manifest

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qassure-api
  namespace: qassure-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: qassure-api
  template:
    metadata:
      labels:
        app: qassure-api
    spec:
      containers:
        - name: api
          image: your-registry/qassure-backend:v1.0.0
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: qassure-env
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "2"
              memory: "2Gi"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 5
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: qassure-api-hpa
  namespace: qassure-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: qassure-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### 5.4 Ingress Configuration

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: qassure-ingress
  namespace: qassure-prod
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.qassure.com
      secretName: qassure-tls
  rules:
    - host: api.qassure.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: qassure-api
                port:
                  number: 3000
```

---

## 6. Database Migrations

### 6.1 Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:undo

# Rollback all migrations
npm run migrate:undo:all
```

### 6.2 Kubernetes Init Container for Migrations

```yaml
initContainers:
  - name: migration
    image: your-registry/qassure-backend:v1.0.0
    command: ["npm", "run", "migrate"]
    envFrom:
      - secretRef:
          name: qassure-env
```

### 6.3 Migration Best Practices

- **Never** modify existing migration files — create new ones
- All migrations must be reversible (up/down)
- Test migrations against a production data snapshot in staging first
- Run migrations before deploying new application code (zero-downtime strategy)

### 6.4 Seeding Platform Roles & Users

For production and staging deployments, the database must be seeded with default platform and tenant roles:

```bash
# Seed default roles, permissions, and initial platform/tenant users
npm run seed
```

This script ensures the `platform` scope roles and default permissions are populated in the database, allowing platform administrators to immediately manage the system configuration.

---

## 7. CI/CD Pipeline

### 7.1 Pipeline Stages (GitHub Actions / Jenkins)

```
┌─────────┐   ┌──────────┐   ┌────────┐   ┌─────────┐   ┌──────────┐
│  Push   │──▶│  Lint &  │──▶│  Unit  │──▶│  Build  │──▶│  Deploy  │
│  Code   │   │  Format  │   │ Tests  │   │ Docker  │   │ Staging  │
└─────────┘   └──────────┘   └────────┘   └─────────┘   └──────────┘
                                                              │
                                                    ┌─────────▼──────┐
                                                    │ Integration    │
                                                    │ Tests / E2E    │
                                                    └─────────┬──────┘
                                                              │
                                                    ┌─────────▼──────┐
                                                    │ Approval Gate  │
                                                    └─────────┬──────┘
                                                              │
                                                    ┌─────────▼──────┐
                                                    │ Deploy Prod    │
                                                    │ (Rolling)      │
                                                    └────────────────┘
```

### 7.2 Jenkins Pipeline (Jenkinsfile excerpt)

```groovy
pipeline {
  agent any
  stages {
    stage('Test') {
      steps {
        sh 'npm ci'
        sh 'npm run lint'
        sh 'npm test -- --coverage'
      }
    }
    stage('Build') {
      steps {
        sh 'docker build -t ${IMAGE_NAME}:${GIT_COMMIT} .'
        sh 'docker push ${IMAGE_NAME}:${GIT_COMMIT}'
      }
    }
    stage('Deploy Staging') {
      steps {
        sh 'helm upgrade qassure ./helm/qassure --set image.tag=${GIT_COMMIT} -n qassure-staging'
        sh 'kubectl rollout status deployment/qassure-api -n qassure-staging'
      }
    }
    stage('Deploy Production') {
      when { branch 'main' }
      input { message 'Deploy to production?' }
      steps {
        sh 'kubectl exec -n qassure-prod deploy/qassure-api -- npm run migrate'
        sh 'helm upgrade qassure ./helm/qassure --set image.tag=${GIT_COMMIT} -n qassure-prod'
        sh 'kubectl rollout status deployment/qassure-api -n qassure-prod'
      }
    }
  }
}
```

---

## 8. Health Checks & Monitoring

### 8.1 Health Endpoints

| Endpoint | Description | Expected Response |
|---------|-------------|------------------|
| `GET /health` | Liveness check | `200 OK { status: "ok" }` |
| `GET /health/ready` | Readiness (DB + Redis connected) | `200 OK { status: "ready" }` |
| `GET /metrics` | Prometheus metrics | Prometheus text format |

### 8.2 Prometheus + Grafana Setup

```bash
# Install Prometheus stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# Apply ServiceMonitor for QAssure
kubectl apply -f k8s/monitoring/service-monitor.yaml
```

### 8.3 Key Metrics to Monitor

| Metric | Alert Threshold |
|--------|----------------|
| API Response Time (P95) | > 500ms |
| Error Rate (5xx) | > 1% |
| Database Connection Pool | > 80% utilized |
| Redis Memory Usage | > 80% |
| Kafka Consumer Lag | > 1,000 messages |
| Pod CPU Usage | > 80% |
| Pod Memory Usage | > 85% |

### 8.4 Log Aggregation (ELK Stack)

```bash
# Install Elasticsearch + Kibana
helm install elasticsearch elastic/elasticsearch -n logging
helm install kibana elastic/kibana -n logging

# Install Filebeat for log collection
helm install filebeat elastic/filebeat -n logging \
  --set daemonset.tolerations[0].operator=Exists
```

---

## 9. Backup & Disaster Recovery

### 9.1 Database Backup Schedule

```bash
# Automated daily backup (cron job on Kubernetes)
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "0 2 * * *"   # 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:15-alpine
              command:
                - pg_dump
                - -Fc
                - -h $(DB_HOST)
                - -U $(DB_USER)
                - -d qassure_prod
              env:
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: qassure-env
                      key: DB_PASSWORD
```

### 9.2 RTO/RPO Targets

| Scenario | Target |
|---------|--------|
| Recovery Time Objective (RTO) | ≤ 1 hour |
| Recovery Point Objective (RPO) | ≤ 15 minutes (with WAL streaming) |
| Backup Retention | 30 days |
| Disaster Recovery Test Frequency | Quarterly |

---

## 10. Troubleshooting

### Common Issues

| Issue | Cause | Resolution |
|-------|-------|-----------|
| `ECONNREFUSED` to database | Database not ready / wrong credentials | Check `DATABASE_URL` and DB health |
| `JWT_EXPIRED` errors | JWT_EXPIRATION set too low | Verify `JWT_EXPIRES_IN` env variable |
| File upload failures | S3 credentials wrong / bucket policy | Verify AWS credentials and bucket permissions |
| Kafka consumer lag | Consumer not running / rebalancing | Check Kafka consumer group status |
| Redis connection timeout | Redis memory full | Check Redis `maxmemory` policy |
| AI 504 timeouts | `AI_PROVIDER_TIMEOUT` too low | Increase to 120000ms (120s) |
| Users logged out unexpectedly | `IDLE_TIMEOUT_MINUTES` too low or `IDLE_TIMEOUT_ENABLED=true` in dev | Increase `IDLE_TIMEOUT_MINUTES` or set `IDLE_TIMEOUT_ENABLED=false` in non-prod environments |
| `SESSION_IDLE_TIMEOUT` in logs | Expected — user was idle beyond configured threshold | Verify value via `config.session.idleTimeoutMinutes` in `src/config/config.js` |

### Useful Debug Commands

```bash
# Check API pod logs
kubectl logs -f deploy/qassure-api -n qassure-prod

# Check recent errors only
kubectl logs deploy/qassure-api -n qassure-prod | grep ERROR

# Enter a running pod for debugging
kubectl exec -it deploy/qassure-api -n qassure-prod -- /bin/sh

# Check database connections
kubectl exec -it deploy/qassure-api -n qassure-prod -- \
  node -e "const {Sequelize} = require('sequelize'); ..."

# Check Kafka consumer lag
kubectl exec -it kafka-0 -n qassure-prod -- \
  kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group qassure-consumers --describe
```

---

*End of QASSURE-DEP-001*
