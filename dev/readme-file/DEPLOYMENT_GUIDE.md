# QAssure Platform - DevOps Deployment Guide

<p align="center">
  <img src="https://img.shields.io/badge/Docker-20.10+-blue" alt="Docker">
  <img src="https://img.shields.io/badge/Kubernetes-1.28+-blue" alt="Kubernetes">
  <img src="https://img.shields.io/badge/Helm-3.x-blue" alt="Helm">
  <img src="https://img.shields.io/badge/AWS-EKS-orange" alt="AWS">
  <img src="https://img.shields.io/badge/GCP-GKE-blue" alt="GCP">
</p>

This document provides complete deployment instructions for the QAssure Platform backend API, including containerization, orchestration, CI/CD, and monitoring setup.

---

## 📚 Table of Contents

1. [Infrastructure Overview](#infrastructure-overview)
2. [Prerequisites](#prerequisites)
3. [Docker Configuration](#docker-configuration)
4. [Docker Compose (Development)](#docker-compose-development)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Helm Charts](#helm-charts)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Environment Configuration](#environment-configuration)
9. [Database Management](#database-management)
10. [Secrets Management](#secrets-management)
11. [Monitoring & Alerting](#monitoring--alerting)
12. [Logging](#logging)
13. [Scaling Strategy](#scaling-strategy)
14. [Security Considerations](#security-considerations)
15. [Disaster Recovery](#disaster-recovery)
16. [Runbooks](#runbooks)

---

## Infrastructure Overview

### Architecture Diagram

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                        INTERNET                              │
                                    └─────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                    LOAD BALANCER                             │
                                    │              (AWS ALB / GCP LB / Nginx)                      │
                                    │                    SSL Termination                           │
                                    └─────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                    INGRESS CONTROLLER                        │
                                    │                  (nginx-ingress / traefik)                   │
                                    └─────────────────────────────────────────────────────────────┘
                                                              │
                            ┌─────────────────────────────────┼─────────────────────────────────┐
                            │                                 │                                 │
                            ▼                                 ▼                                 ▼
              ┌───────────────────────┐       ┌───────────────────────┐       ┌───────────────────────┐
              │   QAssure API Pod 1   │       │   QAssure API Pod 2   │       │   QAssure API Pod N   │
              │                       │       │                       │       │                       │
              │  ┌─────────────────┐  │       │  ┌─────────────────┐  │       │  ┌─────────────────┐  │
              │  │  Node.js App    │  │       │  │  Node.js App    │  │       │  │  Node.js App    │  │
              │  │  Port 3000      │  │       │  │  Port 3000      │  │       │  │  Port 3000      │  │
              │  └─────────────────┘  │       │  └─────────────────┘  │       │  └─────────────────┘  │
              └───────────────────────┘       └───────────────────────┘       └───────────────────────┘
                            │                                 │                                 │
                            └─────────────────────────────────┼─────────────────────────────────┘
                                                              │
                    ┌─────────────────────────────────────────┴─────────────────────────────────────────┐
                    │                                                                                   │
                    ▼                                                                                   ▼
      ┌───────────────────────────────────┐                                       ┌───────────────────────────────────┐
      │           PostgreSQL              │                                       │            Redis                   │
      │      (Primary + Replicas)         │                                       │     (Cluster / Sentinel)           │
      │                                   │                                       │                                   │
      │  ┌─────────┐    ┌─────────┐      │                                       │  ┌─────────┐    ┌─────────┐      │
      │  │ Primary │───►│ Replica │      │                                       │  │ Master  │───►│ Replica │      │
      │  └─────────┘    └─────────┘      │                                       │  └─────────┘    └─────────┘      │
      └───────────────────────────────────┘                                       └───────────────────────────────────┘
                                                              │
                                                              ▼
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                      KAFKA CLUSTER                           │
                                    │              (3 Brokers + Zookeeper/KRaft)                   │
                                    └─────────────────────────────────────────────────────────────┘
```

### Component Summary

| Component | Technology | Purpose | Min Instances |
|-----------|------------|---------|---------------|
| API Server | Node.js 18 | Backend API | 3 |
| Database | PostgreSQL 15 | Primary data store | 1 Primary + 2 Replicas |
| Cache | Redis 7 | Sessions, caching | 3 (Sentinel/Cluster) |
| Message Queue | Kafka 3.5 | Event streaming | 3 Brokers |
| Load Balancer | ALB/Nginx | Traffic distribution | 2 (HA) |
| Ingress | nginx-ingress | K8s ingress | 2 |

---

## Prerequisites

### Required Tools

```bash
# Docker
docker --version  # 20.10+

# Kubernetes CLI
kubectl version --client  # 1.28+

# Helm
helm version  # 3.x

# AWS CLI (if using AWS)
aws --version  # 2.x

# GCP CLI (if using GCP)
gcloud --version
```

### Cloud Account Setup

#### AWS
- EKS cluster provisioned
- RDS PostgreSQL instance
- ElastiCache Redis cluster
- MSK (Managed Kafka) or self-managed
- ECR repository for images
- IAM roles configured

#### GCP
- GKE cluster provisioned
- Cloud SQL PostgreSQL
- Memorystore Redis
- Confluent Kafka or self-managed
- Artifact Registry for images
- Service accounts configured

---

## Docker Configuration

### Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# ============================================
# QAssure Platform - Production Dockerfile
# ============================================

# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Run any build steps (if needed)
# RUN npm run build

# Stage 3: Production
FROM node:18-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 qassure

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY --chown=qassure:nodejs . .

# Remove unnecessary files
RUN rm -rf .git .env.example tests docs

# Switch to non-root user
USER qassure

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Start application
CMD ["node", "server.js"]
```

### .dockerignore

Create `.dockerignore`:

```
# Dependencies
node_modules
npm-debug.log

# Git
.git
.gitignore

# IDE
.idea
.vscode
*.swp
*.swo

# Environment
.env
.env.*
!.env.example

# Documentation
docs
*.md
!README.md

# Tests
tests
coverage
.nyc_output

# Build artifacts
dist
build

# Docker
Dockerfile*
docker-compose*
.docker

# Misc
.DS_Store
*.log
tmp
```

### Build and Push Image

```bash
# Set variables
export REGISTRY="your-registry.com"
export IMAGE_NAME="qassure-api"
export VERSION="1.0.0"

# Build image
docker build -t ${REGISTRY}/${IMAGE_NAME}:${VERSION} .
docker tag ${REGISTRY}/${IMAGE_NAME}:${VERSION} ${REGISTRY}/${IMAGE_NAME}:latest

# Push to registry
docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}
docker push ${REGISTRY}/${IMAGE_NAME}:latest
```

---

## Docker Compose (Development)

Create `docker-compose.yml` for local development and testing:

```yaml
version: '3.8'

services:
  # ===========================================
  # QAssure API
  # ===========================================
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: qassure-api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=qassure_dev
      - DB_USER=postgres
      - DB_PASSWORD=postgres123
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=dev-secret-change-in-production
      - JWT_ACCESS_EXPIRY=24h
      - JWT_REFRESH_EXPIRY=7d
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      kafka:
        condition: service_started
    networks:
      - qassure-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # ===========================================
  # PostgreSQL Database
  # ===========================================
  postgres:
    image: postgres:15-alpine
    container_name: qassure-postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres123
      - POSTGRES_DB=qassure_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d:ro
    networks:
      - qassure-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ===========================================
  # Redis Cache
  # ===========================================
  redis:
    image: redis:7-alpine
    container_name: qassure-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - qassure-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ===========================================
  # Zookeeper (for Kafka)
  # ===========================================
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: qassure-zookeeper
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    volumes:
      - zookeeper_data:/var/lib/zookeeper/data
      - zookeeper_log:/var/lib/zookeeper/log
    networks:
      - qassure-network
    restart: unless-stopped

  # ===========================================
  # Kafka
  # ===========================================
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: qassure-kafka
    ports:
      - "9092:9092"
      - "29092:29092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    depends_on:
      - zookeeper
    volumes:
      - kafka_data:/var/lib/kafka/data
    networks:
      - qassure-network
    restart: unless-stopped

  # ===========================================
  # Kafka UI (Optional - for debugging)
  # ===========================================
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: qassure-kafka-ui
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: qassure
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
      KAFKA_CLUSTERS_0_ZOOKEEPER: zookeeper:2181
    depends_on:
      - kafka
    networks:
      - qassure-network
    profiles:
      - debug

  # ===========================================
  # Prometheus (Monitoring)
  # ===========================================
  prometheus:
    image: prom/prometheus:v2.47.0
    container_name: qassure-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./deploy/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
    networks:
      - qassure-network
    restart: unless-stopped
    profiles:
      - monitoring

  # ===========================================
  # Grafana (Dashboards)
  # ===========================================
  grafana:
    image: grafana/grafana:10.1.0
    container_name: qassure-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./deploy/grafana/provisioning:/etc/grafana/provisioning:ro
    depends_on:
      - prometheus
    networks:
      - qassure-network
    restart: unless-stopped
    profiles:
      - monitoring

networks:
  qassure-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  zookeeper_data:
  zookeeper_log:
  kafka_data:
  prometheus_data:
  grafana_data:
```

### Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# Start with monitoring
docker-compose --profile monitoring up -d

# Start with debug tools
docker-compose --profile debug up -d

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: deletes data)
docker-compose down -v

# Rebuild and restart API
docker-compose up -d --build api
```

---

## Kubernetes Deployment

### Directory Structure

```
deploy/
├── kubernetes/
│   ├── base/
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   ├── secret.yaml
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── ingress.yaml
│   │   ├── hpa.yaml
│   │   ├── pdb.yaml
│   │   └── networkpolicy.yaml
│   └── overlays/
│       ├── development/
│       │   └── kustomization.yaml
│       ├── staging/
│       │   └── kustomization.yaml
│       └── production/
│           └── kustomization.yaml
```

### Namespace

`deploy/kubernetes/base/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: qassure
  labels:
    app.kubernetes.io/name: qassure
    app.kubernetes.io/component: platform
```

### ConfigMap

`deploy/kubernetes/base/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: qassure-config
  namespace: qassure
  labels:
    app.kubernetes.io/name: qassure-api
data:
  NODE_ENV: "production"
  PORT: "3000"
  API_PREFIX: "/api/v1"
  LOG_LEVEL: "info"
  LOG_REQUESTS: "true"
  
  # Database
  DB_HOST: "postgres-primary.qassure.svc.cluster.local"
  DB_PORT: "5432"
  DB_NAME: "qassure"
  DB_POOL_MIN: "5"
  DB_POOL_MAX: "20"
  
  # Redis
  REDIS_URL: "redis://redis-master.qassure.svc.cluster.local:6379"
  
  # Kafka
  KAFKA_BROKERS: "kafka-0.kafka.qassure.svc.cluster.local:9092,kafka-1.kafka.qassure.svc.cluster.local:9092,kafka-2.kafka.qassure.svc.cluster.local:9092"
  
  # JWT
  JWT_ACCESS_EXPIRY: "24h"
  JWT_REFRESH_EXPIRY: "7d"
  
  # Rate Limiting
  RATE_LIMIT_WINDOW_MS: "900000"
  RATE_LIMIT_MAX: "100"
  
  # Email
  EMAIL_PROVIDER: "smtp"
  EMAIL_FROM: "noreply@qassure.ai"
```

### Secret

`deploy/kubernetes/base/secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: qassure-secrets
  namespace: qassure
  labels:
    app.kubernetes.io/name: qassure-api
type: Opaque
stringData:
  # Database credentials
  DB_USER: "qassure_app"
  DB_PASSWORD: "${DB_PASSWORD}"  # Replace in CI/CD
  
  # JWT Secret
  JWT_SECRET: "${JWT_SECRET}"  # Replace in CI/CD
  
  # SMTP credentials
  SMTP_HOST: "smtp.sendgrid.net"
  SMTP_PORT: "587"
  SMTP_USER: "apikey"
  SMTP_PASS: "${SMTP_PASSWORD}"  # Replace in CI/CD

---
# External secrets (if using AWS Secrets Manager / HashiCorp Vault)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: qassure-external-secrets
  namespace: qassure
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: qassure-secrets-external
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: qassure/production/database
        property: password
    - secretKey: JWT_SECRET
      remoteRef:
        key: qassure/production/jwt
        property: secret
```

### Deployment

`deploy/kubernetes/base/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qassure-api
  namespace: qassure
  labels:
    app.kubernetes.io/name: qassure-api
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/component: api
spec:
  replicas: 3
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app.kubernetes.io/name: qassure-api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: qassure-api
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/api/v1/metrics"
    spec:
      serviceAccountName: qassure-api
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
      
      # Anti-affinity for HA
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app.kubernetes.io/name: qassure-api
                topologyKey: kubernetes.io/hostname
      
      # Topology spread for zone distribution
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: qassure-api
      
      containers:
        - name: api
          image: your-registry.com/qassure-api:1.0.0
          imagePullPolicy: Always
          
          ports:
            - name: http
              containerPort: 3000
              protocol: TCP
          
          envFrom:
            - configMapRef:
                name: qassure-config
            - secretRef:
                name: qassure-secrets
          
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"
          
          # Liveness probe - is the container running?
          livenessProbe:
            httpGet:
              path: /api/v1/health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          
          # Readiness probe - is the container ready for traffic?
          readinessProbe:
            httpGet:
              path: /api/v1/health/detailed
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          
          # Startup probe - for slow-starting containers
          startupProbe:
            httpGet:
              path: /api/v1/health
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 30
          
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: logs
              mountPath: /app/logs
      
      volumes:
        - name: tmp
          emptyDir: {}
        - name: logs
          emptyDir: {}
      
      # Graceful shutdown
      terminationGracePeriodSeconds: 30
      
      # Image pull secrets (if using private registry)
      imagePullSecrets:
        - name: registry-credentials
```

### Service

`deploy/kubernetes/base/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: qassure-api
  namespace: qassure
  labels:
    app.kubernetes.io/name: qassure-api
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3000"
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 80
      targetPort: http
      protocol: TCP
  selector:
    app.kubernetes.io/name: qassure-api
```

### Ingress

`deploy/kubernetes/base/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: qassure-api
  namespace: qassure
  labels:
    app.kubernetes.io/name: qassure-api
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.qassure.ai
      secretName: qassure-api-tls
  rules:
    - host: api.qassure.ai
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: qassure-api
                port:
                  name: http
```

### Horizontal Pod Autoscaler

`deploy/kubernetes/base/hpa.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: qassure-api
  namespace: qassure
  labels:
    app.kubernetes.io/name: qassure-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: qassure-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    # Scale based on CPU
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    # Scale based on memory
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    # Scale based on requests per second (custom metric)
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Pods
          value: 2
          periodSeconds: 30
        - type: Percent
          value: 100
          periodSeconds: 30
      selectPolicy: Max
```

### Pod Disruption Budget

`deploy/kubernetes/base/pdb.yaml`:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: qassure-api
  namespace: qassure
  labels:
    app.kubernetes.io/name: qassure-api
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: qassure-api
```

### Network Policy

`deploy/kubernetes/base/networkpolicy.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: qassure-api
  namespace: qassure
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: qassure-api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
    # Allow from Prometheus
    - from:
        - namespaceSelector:
            matchLabels:
              name: monitoring
      ports:
        - protocol: TCP
          port: 3000
  egress:
    # Allow to PostgreSQL
    - to:
        - podSelector:
            matchLabels:
              app: postgresql
      ports:
        - protocol: TCP
          port: 5432
    # Allow to Redis
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
    # Allow to Kafka
    - to:
        - podSelector:
            matchLabels:
              app: kafka
      ports:
        - protocol: TCP
          port: 9092
    # Allow DNS
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
```

### Service Account

`deploy/kubernetes/base/serviceaccount.yaml`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: qassure-api
  namespace: qassure
  labels:
    app.kubernetes.io/name: qassure-api
  annotations:
    # AWS IAM role (if using IRSA)
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/qassure-api-role
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: qassure-api
  namespace: qassure
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: qassure-api
  namespace: qassure
subjects:
  - kind: ServiceAccount
    name: qassure-api
    namespace: qassure
roleRef:
  kind: Role
  name: qassure-api
  apiGroup: rbac.authorization.k8s.io
```

---

## Helm Charts

### Chart Structure

```
deploy/helm/qassure/
├── Chart.yaml
├── values.yaml
├── values-dev.yaml
├── values-staging.yaml
├── values-prod.yaml
├── templates/
│   ├── _helpers.tpl
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   ├── serviceaccount.yaml
│   └── networkpolicy.yaml
└── charts/
    └── (subcharts if needed)
```

### Chart.yaml

```yaml
apiVersion: v2
name: qassure
description: QAssure Platform Helm Chart
type: application
version: 1.0.0
appVersion: "1.0.0"
keywords:
  - qassure
  - qms
  - quality-management
maintainers:
  - name: QAssure Team
    email: devops@qassure.ai
```

### values.yaml (Default)

```yaml
# Default values for QAssure Platform

# Namespace
namespace: qassure

# Image configuration
image:
  repository: your-registry.com/qassure-api
  tag: "1.0.0"
  pullPolicy: Always
  pullSecrets:
    - name: registry-credentials

# Replica configuration
replicaCount: 3

# Service configuration
service:
  type: ClusterIP
  port: 80
  targetPort: 3000

# Ingress configuration
ingress:
  enabled: true
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.qassure.ai
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: qassure-api-tls
      hosts:
        - api.qassure.ai

# Resource limits
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 512Mi

# Autoscaling
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

# Pod disruption budget
podDisruptionBudget:
  enabled: true
  minAvailable: 2

# Security context
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  fsGroup: 1001

# Probes
livenessProbe:
  enabled: true
  path: /api/v1/health
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  enabled: true
  path: /api/v1/health/detailed
  initialDelaySeconds: 10
  periodSeconds: 5

# Environment configuration
config:
  nodeEnv: production
  port: "3000"
  logLevel: info
  
  # Database
  dbHost: postgres-primary.qassure.svc.cluster.local
  dbPort: "5432"
  dbName: qassure
  
  # Redis
  redisUrl: redis://redis-master.qassure.svc.cluster.local:6379
  
  # Kafka
  kafkaBrokers: kafka-0.kafka:9092,kafka-1.kafka:9092,kafka-2.kafka:9092

# Secrets (use external secrets in production)
secrets:
  dbUser: qassure_app
  dbPassword: ""  # Set via --set or external secrets
  jwtSecret: ""   # Set via --set or external secrets

# External secrets (AWS Secrets Manager / Vault)
externalSecrets:
  enabled: false
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore

# Network policy
networkPolicy:
  enabled: true

# Service account
serviceAccount:
  create: true
  annotations: {}
  # AWS IRSA
  # eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/qassure-api-role

# Node selector
nodeSelector: {}

# Tolerations
tolerations: []

# Affinity
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: qassure-api
          topologyKey: kubernetes.io/hostname
```

### values-prod.yaml (Production Overrides)

```yaml
# Production values

replicaCount: 5

image:
  tag: "1.0.0"

ingress:
  hosts:
    - host: api.qassure.ai
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: qassure-api-tls
      hosts:
        - api.qassure.ai

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 1Gi

autoscaling:
  minReplicas: 5
  maxReplicas: 50

config:
  logLevel: warn

externalSecrets:
  enabled: true
```

### Helm Commands

```bash
# Add repository (if using remote charts)
helm repo add qassure https://charts.qassure.ai
helm repo update

# Install/upgrade development
helm upgrade --install qassure-dev ./deploy/helm/qassure \
  --namespace qassure-dev \
  --create-namespace \
  -f ./deploy/helm/qassure/values-dev.yaml \
  --set secrets.dbPassword=$DB_PASSWORD \
  --set secrets.jwtSecret=$JWT_SECRET

# Install/upgrade production
helm upgrade --install qassure-prod ./deploy/helm/qassure \
  --namespace qassure-prod \
  --create-namespace \
  -f ./deploy/helm/qassure/values-prod.yaml

# Rollback
helm rollback qassure-prod 1 --namespace qassure-prod

# Uninstall
helm uninstall qassure-prod --namespace qassure-prod
```

---

## CI/CD Pipeline

### GitHub Actions

`.github/workflows/ci-cd.yaml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  release:
    types: [published]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ==========================================
  # Test
  # ==========================================
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: qassure_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm test
        env:
          NODE_ENV: test
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: qassure_test
          DB_USER: postgres
          DB_PASSWORD: postgres
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  # ==========================================
  # Security Scan
  # ==========================================
  security:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  # ==========================================
  # Build and Push
  # ==========================================
  build:
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.event_name != 'pull_request'
    
    permissions:
      contents: read
      packages: write
    
    outputs:
      image_tag: ${{ steps.meta.outputs.tags }}
      image_digest: ${{ steps.build.outputs.digest }}
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=sha,prefix=
      
      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64

  # ==========================================
  # Deploy to Development
  # ==========================================
  deploy-dev:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: development
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name qassure-dev --region us-east-1
      
      - name: Deploy with Helm
        run: |
          helm upgrade --install qassure-dev ./deploy/helm/qassure \
            --namespace qassure-dev \
            --create-namespace \
            -f ./deploy/helm/qassure/values-dev.yaml \
            --set image.tag=${{ github.sha }} \
            --wait --timeout 5m

  # ==========================================
  # Deploy to Staging
  # ==========================================
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: staging
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name qassure-staging --region us-east-1
      
      - name: Deploy with Helm
        run: |
          helm upgrade --install qassure-staging ./deploy/helm/qassure \
            --namespace qassure-staging \
            --create-namespace \
            -f ./deploy/helm/qassure/values-staging.yaml \
            --set image.tag=${{ github.sha }} \
            --wait --timeout 5m

  # ==========================================
  # Deploy to Production
  # ==========================================
  deploy-prod:
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'release'
    environment: production
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name qassure-prod --region us-east-1
      
      - name: Deploy with Helm
        run: |
          helm upgrade --install qassure-prod ./deploy/helm/qassure \
            --namespace qassure-prod \
            --create-namespace \
            -f ./deploy/helm/qassure/values-prod.yaml \
            --set image.tag=${{ github.event.release.tag_name }} \
            --wait --timeout 10m
      
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚀 QAssure ${{ github.event.release.tag_name }} deployed to production!"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Environment Configuration

### Environment Matrix

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `NODE_ENV` | development | staging | production |
| `LOG_LEVEL` | debug | info | warn |
| `DB_HOST` | localhost | staging-db.internal | prod-db.internal |
| `REDIS_URL` | redis://localhost:6379 | redis://staging-redis:6379 | redis://prod-redis-cluster:6379 |
| `RATE_LIMIT_MAX` | 1000 | 500 | 100 |
| `JWT_ACCESS_EXPIRY` | 24h | 12h | 1h |

### Environment-Specific Notes

#### Development
- Console email provider
- Debug logging enabled
- Relaxed rate limits
- Single database instance

#### Staging
- SMTP email (sandbox)
- Info-level logging
- Production-like rate limits
- Single database with replicas

#### Production
- Production SMTP
- Warning-level logging
- Strict rate limits
- HA database cluster
- Redis cluster
- Kafka cluster

---

## Database Management

### Migration Strategy

```bash
# Run migrations (inside container or CI/CD)
npm run migrate

# Or manually:
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/001_initial_schema.sql
```

### Backup Configuration

```yaml
# CronJob for database backup
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: qassure
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:15
              command:
                - /bin/sh
                - -c
                - |
                  pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | \
                  gzip | \
                  aws s3 cp - s3://qassure-backups/postgres/$(date +%Y%m%d_%H%M%S).sql.gz
              envFrom:
                - secretRef:
                    name: qassure-secrets
          restartPolicy: OnFailure
```

### Connection Pooling

For production, use PgBouncer:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: pgbouncer
          image: edoburu/pgbouncer:1.20.0
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: qassure-secrets
                  key: DATABASE_URL
            - name: POOL_MODE
              value: transaction
            - name: MAX_CLIENT_CONN
              value: "1000"
            - name: DEFAULT_POOL_SIZE
              value: "20"
```

---

## Secrets Management

### AWS Secrets Manager

```bash
# Create secrets
aws secretsmanager create-secret \
  --name qassure/production/database \
  --secret-string '{"username":"qassure_app","password":"super-secret-password"}'

aws secretsmanager create-secret \
  --name qassure/production/jwt \
  --secret-string '{"secret":"your-jwt-secret-key"}'
```

### HashiCorp Vault

```bash
# Enable KV secrets engine
vault secrets enable -path=qassure kv-v2

# Store secrets
vault kv put qassure/production/database \
  username=qassure_app \
  password=super-secret-password

vault kv put qassure/production/jwt \
  secret=your-jwt-secret-key
```

---

## Monitoring & Alerting

### Prometheus Configuration

`deploy/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  - job_name: 'qassure-api'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - qassure
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

### Alert Rules

`deploy/prometheus/rules/qassure.yml`:

```yaml
groups:
  - name: qassure
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(qassure_http_requests_total{status_code=~"5.."}[5m])) /
          sum(rate(qassure_http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"
      
      # High latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, rate(qassure_http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value | humanizeDuration }}"
      
      # Pod not ready
      - alert: PodNotReady
        expr: |
          kube_pod_status_ready{namespace="qassure", condition="true"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod not ready"
          description: "Pod {{ $labels.pod }} is not ready"
      
      # Database connection issues
      - alert: DatabaseConnectionFailed
        expr: |
          qassure_db_pool_size{state="waiting"} > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool exhausted"
```

### Grafana Dashboard

Import the QAssure dashboard from `deploy/grafana/dashboards/qassure.json`.

Key panels:
- Request rate
- Error rate
- Latency percentiles
- Active sessions
- Database connections
- Redis operations
- Memory/CPU usage

---

## Logging

### Log Aggregation (ELK/EFK)

```yaml
# Fluent Bit DaemonSet for log collection
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  template:
    spec:
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:2.1
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: config
              mountPath: /fluent-bit/etc/
          env:
            - name: ELASTICSEARCH_HOST
              value: elasticsearch.logging.svc.cluster.local
```

### Log Format

Application logs should be JSON formatted:

```json
{
  "timestamp": "2025-12-24T08:00:00.000Z",
  "level": "info",
  "correlationId": "1703424000000-a1b2c3d4",
  "message": "Request completed",
  "method": "POST",
  "path": "/api/v1/auth/login",
  "statusCode": 200,
  "duration": 125,
  "userId": "uuid",
  "tenantId": "uuid"
}
```

---

## Scaling Strategy

### Horizontal Scaling

| Metric | Scale Up Threshold | Scale Down Threshold | Cooldown |
|--------|-------------------|---------------------|----------|
| CPU | 70% | 30% | 5 min |
| Memory | 80% | 40% | 5 min |
| RPS | 100/pod | 20/pod | 3 min |

### Vertical Scaling Guidelines

| Load Level | CPU Request | Memory Request |
|------------|-------------|----------------|
| Low (<100 RPS) | 250m | 256Mi |
| Medium (100-500 RPS) | 500m | 512Mi |
| High (500-1000 RPS) | 1000m | 1Gi |
| Very High (>1000 RPS) | 2000m | 2Gi |

---

## Security Considerations

### Checklist

- [ ] TLS enabled for all external traffic
- [ ] Network policies configured
- [ ] Pod security policies/standards enforced
- [ ] Secrets stored in external secrets manager
- [ ] Container images scanned for vulnerabilities
- [ ] RBAC configured with least privilege
- [ ] Audit logging enabled
- [ ] Rate limiting configured
- [ ] WAF rules configured (if applicable)

### Security Headers

Configured via Helmet.js:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

---

## Disaster Recovery

### RTO/RPO Targets

| Tier | RTO | RPO | Strategy |
|------|-----|-----|----------|
| Tier 1 (Critical) | 1 hour | 5 min | Multi-region active-active |
| Tier 2 (Standard) | 4 hours | 1 hour | Multi-AZ with standby |
| Tier 3 (Low) | 24 hours | 24 hours | Single region with backups |

### Backup Schedule

| Component | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| PostgreSQL | Daily full, Hourly incremental | 30 days | S3/GCS |
| Redis | Hourly RDB | 7 days | S3/GCS |
| Kafka | Continuous | 7 days | Native replication |

### Recovery Procedures

See [Runbooks](#runbooks) section.

---

## Runbooks

### 1. Application Not Starting

```bash
# Check pod status
kubectl get pods -n qassure -l app.kubernetes.io/name=qassure-api

# Check pod logs
kubectl logs -n qassure -l app.kubernetes.io/name=qassure-api --tail=100

# Check events
kubectl get events -n qassure --sort-by='.lastTimestamp'

# Common issues:
# - Database connection: Check DB_HOST, DB_PASSWORD
# - Redis connection: Check REDIS_URL
# - Image pull: Check registry credentials
```

### 2. High Latency

```bash
# Check current latency
curl -w "@curl-format.txt" -s -o /dev/null https://api.qassure.ai/api/v1/health

# Check database connections
kubectl exec -n qassure deploy/qassure-api -- \
  curl -s localhost:3000/api/v1/health/detailed | jq '.services.postgres'

# Check Redis
kubectl exec -n qassure deploy/qassure-api -- \
  redis-cli -h redis-master PING

# Scale up if needed
kubectl scale deployment qassure-api -n qassure --replicas=10
```

### 3. Database Recovery

```bash
# Restore from backup
aws s3 cp s3://qassure-backups/postgres/20251224_020000.sql.gz - | \
  gunzip | \
  psql -h $DB_HOST -U $DB_USER -d qassure_restore

# Promote read replica (RDS)
aws rds promote-read-replica --db-instance-identifier qassure-replica
```

### 4. Rollback Deployment

```bash
# Helm rollback
helm rollback qassure-prod 1 -n qassure-prod

# Or kubectl rollback
kubectl rollout undo deployment/qassure-api -n qassure-prod

# Check rollback status
kubectl rollout status deployment/qassure-api -n qassure-prod
```

---

## Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| On-Call DevOps | devops@qassure.ai | PagerDuty |
| Platform Lead | platform@qassure.ai | Slack #platform |
| Security | security@qassure.ai | Slack #security |

---

**Last Updated**: December 24, 2025
**Version**: 1.0.0
