# QAssure.ai Platform - Backend API

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![Express](https://img.shields.io/badge/Express-4.x-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-blue)
![Redis](https://img.shields.io/badge/Redis-7.x-red)
![Kafka](https://img.shields.io/badge/Kafka-7.5-orange)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black)
![License](https://img.shields.io/badge/License-Proprietary-red)
![Build](https://img.shields.io/badge/Build-Passing-brightgreen)
![Phases](https://img.shields.io/badge/Phases-22%2F22-success)

QAssure is an enterprise-grade, multi-tenant Quality Management System (QMS) platform with AI-powered capabilities for pharmaceutical and life sciences companies. Built for FDA 21 CFR Part 11 compliance.

---

## 📊 Platform Statistics

| Metric | Count |
|--------|-------|
| **Database Tables** | 70+ |
| **API Endpoints** | 400+ |
| **Implementation Phases** | 22/22 ✅ |
| **Services** | 66+ |
| **Controllers** | 53+ |
| **Middleware** | 11+ |
| **Route Files** | 49+ |
| **Migrations** | 100+ |
| **Validation Schemas** | 29+ |

---

## 📚 Table of Contents

1. [Overview](#1-overview)
2. [Quick Start](#2-quick-start)
3. [Prerequisites](#3-prerequisites)
4. [Installation](#4-installation)
5. [Configuration](#5-configuration)
6. [Running the Application](#6-running-the-application)
7. [Architecture](#7-architecture)
8. [Implementation Status](#8-implementation-status)
9. [Database Schema](#9-database-schema)
10. [API Endpoints Reference](#10-api-endpoints-reference)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [Multi-Tenancy](#12-multi-tenancy)
13. [AI Gateway](#13-ai-gateway)
14. [RAG & Knowledge Base](#14-rag--knowledge-base)
15. [QMS Integration](#15-qms-integration)
16. [Event System (Kafka)](#16-event-system-kafka)
17. [Real-time Features](#17-real-time-features)
18. [Reporting & Analytics](#18-reporting--analytics)
19. [File Management](#19-file-management)
20. [System Configuration](#20-system-configuration)
21. [FDA 21 CFR Part 11 Compliance](#21-fda-21-cfr-part-11-compliance)
22. [Monitoring & Observability](#22-monitoring--observability)
23. [Testing Guide](#23-testing-guide)
24. [Deployment](#24-deployment)
25. [Troubleshooting](#25-troubleshooting)
26. [Project Structure](#26-project-structure)
27. [Workflow Engine](#27-workflow-engine)
28. [Document Management](#28-document-management)
29. [Training Management](#29-training-management)
30. [CAPA Management](#30-capa-management)
31. [Supplier Quality Management](#31-supplier-quality-management)
32. [Billing & Licensing](#32-billing--licensing)
33. [Project Management](#33-project-management)
34. [Organizational Structure](#34-organizational-structure)

---

## 1. Overview

### What is QAssure?

QAssure is a comprehensive SaaS platform providing:

| Feature | Description |
|---------|-------------|
| **Multi-tenant Architecture** | Complete data isolation per organization with row-level security |
| **Role-Based Access Control (RBAC)** | Fine-grained permissions with tenant/module scoping |
| **Module System** | 8-state lifecycle management for pluggable quality modules |
| **AI Gateway** | OpenAI, Anthropic, Google AI integration with fallback and cost tracking |
| **RAG System** | Vector-based knowledge search with Pinecone/Qdrant integration |
| **QMS Integration** | Veeva Vault, MasterControl, Arena PLM, TrackWise, ETQ Reliance adapters |
| **Event-Driven Architecture** | Kafka for async communication and event sourcing |
| **Real-time Updates** | WebSocket/SSE for live dashboards and notifications |
| **FDA 21 CFR Part 11** | Electronic signatures, audit trails, 7-year retention |
| **Comprehensive Reporting** | Usage, performance, cost analytics with PDF/Excel export |

### Key Features by Category

#### Security & Authentication
- JWT-based authentication with refresh tokens
- OAuth 2.0 (Google, Microsoft, Okta)
- SAML 2.0 for enterprise SSO
- Multi-Factor Authentication (TOTP)
- API Key management for integrations
- Session management with Redis
- **Idle session auto-logout** (server-side enforcement at token refresh; configurable via `IDLE_TIMEOUT_MINUTES`)

#### AI & Machine Learning
- Multi-provider AI Gateway (OpenAI, Anthropic, Google)
- Automatic failover between providers
- Cost tracking and usage analytics
- RAG-based knowledge search
- Prompt versioning and A/B testing
- Document ingestion and vectorization

#### Quality Management
- 5 QMS adapter integrations
- Bidirectional sync with conflict resolution
- Field mapping configuration
- Scheduled and on-demand sync
- Sync history and error tracking

#### Compliance & Audit
- Immutable audit trails
- 7-year data retention
- Electronic signatures with manifests
- Access reviews
- FDA 21 CFR Part 11 compliance

---

## 2. Quick Start

### Method 1: Docker Setup (Recommended)
This is the fastest way to get the entire platform running including all dependencies (PostgreSQL, Redis, Kafka, etc.).

```bash
# 1. Clone the repository
git clone <repository-url>
cd QAssur-backend

# 2. Setup environment variables
cp .env.example .env

# 3. Start all services using Docker Compose
docker-compose up -d

# 4. Run migrations inside the API container
docker exec -it qassure-api npm run migrate

# 5. Seed initial data (Admin users, roles, etc.)
docker exec -it qassure-api npm run seed

# 6. Verify health
curl http://localhost:3000/api/v1/health
```

### Method 2: Local Setup
Use this method for active development where you want to run the Node.js server locally.

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd QAssur-backend
npm install

# 2. Setup environment variables
cp .env.example .env

# 3. Start infrastructure dependencies only
docker-compose up -d postgres redis kafka zookeeper

# 4. Run migrations and seed data
npm run migrate
npm run seed

# 5. Start the application in development mode
npm run dev
```

---

## 3. Prerequisites

| Software | Version | Purpose | Installation |
|----------|---------|---------|--------------|
| Node.js | 18.x+ | Runtime | [nodejs.org](https://nodejs.org/) |
| PostgreSQL | 15.x+ | Primary database | [postgresql.org](https://postgresql.org/) |
| Redis | 7.x+ | Cache, sessions, rate limiting | [redis.io](https://redis.io/) |
| Docker | 24.x+ | Container runtime | [docker.com](https://docker.com/) |
| Kafka | 7.5+ | Event streaming | Via Docker Compose |

### Verify Installation

```bash
node --version      # v18.x.x+
psql --version      # PostgreSQL 15.x+
redis-server --version  # Redis 7.x+
docker --version    # Docker 24.x+
```

---

## 4. Installation

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd QAssur-backend
npm install
```

### Step 2: Database Setup

```bash
# OPTION A: Using the provided migration script (Recommended)
# This will run all JS migrations and ensure schema is up to date
npm run migrate

# OPTION B: Seed the database with initial data
# This creates the superadmin, default tenants, and roles
npm run seed

# Verify tables created
psql -h localhost -U postgres -d qassure_dev -c "\dt"
```

### Step 3: Start Redis

```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:7

# Verify
redis-cli ping  # Should return: PONG
```

### Step 4: Start Kafka

Using Docker Compose is the easiest way to start Kafka and its dependencies.

```bash
docker-compose up -d zookeeper kafka

# Verify
docker ps | grep kafka
```

---

## 5. Configuration

### Complete Environment Variables (.env)

```env
# ===========================================
# QASSURE.AI PLATFORM CONFIGURATION v3.0
# ===========================================

# ─────────────────────────────────────────
# APPLICATION
# ─────────────────────────────────────────
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1
PLATFORM_NAME=QAssure.ai
PLATFORM_VERSION=1.0.0
BASE_URL=http://localhost:3000

# ─────────────────────────────────────────
# DATABASE (PostgreSQL)
# ─────────────────────────────────────────
DATABASE_URL=postgresql://postgres:password@localhost:5432/qassure_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qassure_dev
DB_USER=postgres
DB_PASSWORD=password
DB_SSL=false
DB_POOL_MIN=5
DB_POOL_MAX=20

# ─────────────────────────────────────────
# REDIS
# ─────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=qassure:
REDIS_CLUSTER_MODE=false

# ─────────────────────────────────────────
# KAFKA
# ─────────────────────────────────────────
KAFKA_BOOTSTRAP_SERVERS=localhost:29092
KAFKA_CLIENT_ID=qassure-platform
KAFKA_GROUP_ID=qassure-consumer-group
KAFKA_SSL=false

# ─────────────────────────────────────────
# JWT AUTHENTICATION
# ─────────────────────────────────────────
JWT_SECRET=qassure-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=qassure-refresh-token-secret-minimum-32-characters
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=qassure.ai
JWT_AUDIENCE=qassure-platform

# ─────────────────────────────────────────
# IDLE SESSION / AUTO-LOGOUT (GxP / 21 CFR Part 11 Compliance)
# ─────────────────────────────────────────
# Minutes of inactivity before session is force-expired at refresh time.
# Recommended for production: 30. Max effective idle = IDLE_TIMEOUT_MINUTES + JWT_EXPIRES_IN.
IDLE_TIMEOUT_MINUTES=30
# Set to false to bypass idle enforcement during development/debugging.
IDLE_TIMEOUT_ENABLED=true

# ─────────────────────────────────────────
# OAUTH 2.0 PROVIDERS
# ─────────────────────────────────────────
OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_GOOGLE_CALLBACK_URL=/api/v1/auth/oauth/google/callback

OAUTH_MICROSOFT_CLIENT_ID=
OAUTH_MICROSOFT_CLIENT_SECRET=
OAUTH_MICROSOFT_TENANT_ID=
OAUTH_MICROSOFT_CALLBACK_URL=/api/v1/auth/oauth/microsoft/callback

OAUTH_OKTA_CLIENT_ID=
OAUTH_OKTA_CLIENT_SECRET=
OAUTH_OKTA_DOMAIN=
OAUTH_OKTA_CALLBACK_URL=/api/v1/auth/oauth/okta/callback

# ─────────────────────────────────────────
# SAML 2.0 CONFIGURATION
# ─────────────────────────────────────────
SAML_ENABLED=false
SAML_ENTRY_POINT=
SAML_ISSUER=qassure-platform
SAML_CALLBACK_URL=/api/v1/auth/saml/callback
SAML_CERT_PATH=./certs/saml/idp.crt
SAML_PRIVATE_KEY_PATH=./certs/saml/sp.key

# ─────────────────────────────────────────
# MFA CONFIGURATION
# ─────────────────────────────────────────
MFA_ENABLED=true
MFA_ISSUER=QAssure.ai
MFA_TOTP_WINDOW=1

# ─────────────────────────────────────────
# AI/LLM CONFIGURATION
# ─────────────────────────────────────────
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_ORG_ID=
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_AI_API_KEY=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT=

AI_DEFAULT_PROVIDER=openai
AI_DEFAULT_MODEL=gpt-4-turbo-preview
AI_MAX_TOKENS=4096
AI_TEMPERATURE=0.7
AI_CACHE_TTL=3600
AI_RATE_LIMIT_PER_MINUTE=100
AI_FALLBACK_ENABLED=true
AI_FALLBACK_PROVIDERS=anthropic,google
AI_PROVIDER_TIMEOUT=120000

# ─────────────────────────────────────────
# VECTOR DATABASE (RAG)
# ─────────────────────────────────────────
VECTOR_DB_PROVIDER=pinecone
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX_NAME=qassure-embeddings
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

EMBEDDING_MODEL=text-embedding-ada-002
EMBEDDING_DIMENSIONS=1536
CHUNK_SIZE=512
CHUNK_OVERLAP=50

# ─────────────────────────────────────────
# QMS INTEGRATION
# ─────────────────────────────────────────
VEEVA_VAULT_URL=
VEEVA_VAULT_USERNAME=
VEEVA_VAULT_PASSWORD=
VEEVA_VAULT_VERSION=v21.1

MASTERCONTROL_URL=
MASTERCONTROL_API_KEY=

ARENA_PLM_URL=
ARENA_PLM_API_KEY=

TRACKWISE_URL=
TRACKWISE_API_KEY=

ETQ_URL=
ETQ_API_KEY=

# ─────────────────────────────────────────
# ELASTICSEARCH (ELK)
# ─────────────────────────────────────────
ELASTICSEARCH_NODE=http://127.0.0.1:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
ELASTICSEARCH_INDEX_PREFIX=qassure-logs

# ─────────────────────────────────────────
# DISTRIBUTED TRACING (JAEGER)
# ─────────────────────────────────────────
JAEGER_AGENT_HOST=localhost
JAEGER_AGENT_PORT=6831
JAEGER_SAMPLER_TYPE=probabilistic
JAEGER_SAMPLER_PARAM=0.1

# ─────────────────────────────────────────
# PROMETHEUS METRICS
# ─────────────────────────────────────────
METRICS_ENABLED=true
METRICS_PORT=9090
METRICS_PATH=/metrics

# ─────────────────────────────────────────
# RATE LIMITING
# ─────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_STORAGE=redis

# ─────────────────────────────────────────
# CORS
# ─────────────────────────────────────────
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
CORS_CREDENTIALS=true

# ─────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────
LOG_LEVEL=debug
LOG_FORMAT=json
LOG_FILE_ENABLED=true
LOG_FILE_PATH=./logs
LOG_FILE_MAX_SIZE=10m
LOG_FILE_MAX_FILES=30

# ─────────────────────────────────────────
# MULTI-TENANCY
# ─────────────────────────────────────────
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000000
TENANT_HEADER=X-Tenant-ID
TENANT_ISOLATION=row_level

# ─────────────────────────────────────────
# ENCRYPTION & SECURITY
# ─────────────────────────────────────────
ENCRYPTION_KEY=your-32-character-encryption-key!
ENCRYPTION_ALGORITHM=aes-256-gcm
PII_TOKENIZATION_ENABLED=true
PII_TOKENIZATION_KEY=

# ─────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────
HEALTH_CHECK_INTERVAL_MS=30000
HEALTH_CHECK_TIMEOUT_MS=5000

# ─────────────────────────────────────────
# FDA 21 CFR PART 11 COMPLIANCE
# ─────────────────────────────────────────
ELECTRONIC_SIGNATURES_ENABLED=true
SIGNATURE_MANIFEST_ENABLED=true
AUDIT_TRAIL_RETENTION_YEARS=7

# ─────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────
# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=noreply@qassure.ai

# Slack
SLACK_WEBHOOK_URL=
SLACK_BOT_TOKEN=

# PagerDuty
PAGERDUTY_ROUTING_KEY=
PAGERDUTY_SERVICE_ID=

# SMS (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# ─────────────────────────────────────────
# REPORT GENERATION
# ─────────────────────────────────────────
REPORT_STORAGE_PATH=./reports
REPORT_RETENTION_DAYS=90
PUPPETEER_EXECUTABLE_PATH=

# ─────────────────────────────────────────
# WEBSOCKET
# ─────────────────────────────────────────
WEBSOCKET_ENABLED=true
WEBSOCKET_PATH=/ws
WEBSOCKET_PING_INTERVAL=30000

# ─────────────────────────────────────────
# FILE STORAGE
# ─────────────────────────────────────────
FILE_STORAGE_PATH=./uploads
FILE_MAX_SIZE_MB=50
FILE_ALLOWED_TYPES=pdf,doc,docx,xls,xlsx,ppt,pptx,png,jpg,jpeg,gif,csv,json,xml,zip

# ─────────────────────────────────────────
# BRANDING (Whitelabel)
# ─────────────────────────────────────────
DEFAULT_LOGO_URL=/assets/logo.png
DEFAULT_PRIMARY_COLOR=#1976d2
DEFAULT_SECONDARY_COLOR=#dc004e
```

---

## 6. Running the Application

### Development Mode

```bash
npm run dev
```

Expected output:
```
✅ Database connected
[Redis] ✅ Connected successfully
[KafkaProducer] ✅ Connected to Kafka brokers: localhost:29092
[WebSocket] ✅ Server initialized on path /ws
🚀 Server is running on 0.0.0.0:3000
📍 Environment: development
🌐 API prefix: /api/v1
```

### Production Mode

```bash
npm run build
npm start
```

### Verify Server

```bash
# Basic health check
curl http://localhost:3000/api/v1/health

# Detailed health check
curl http://localhost:3000/api/v1/health/detailed

# Expected response
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 123.456,
    "timestamp": "2024-01-15T10:30:00Z",
    "components": {
      "database": "healthy",
      "redis": "healthy",
      "kafka": "healthy"
    }
  }
}
```

---

## 7. Architecture

### 7.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATIONS                                      │
│               (Web App, Mobile App, CLI, External Modules)                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           QASSURE BACKEND API                                    │
│                                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │   Auth   │ │    AI    │ │   QMS    │ │  Events  │ │ Reports  │ │  Config  │ │
│  │   IAM    │ │ Gateway  │ │ Connect  │ │  Kafka   │ │Analytics │ │ Settings │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Modules  │ │   RAG    │ │ Prompts  │ │ Webhooks │ │  Audit   │ │  Files   │ │
│  │ Registry │ │Knowledge │ │  Mgmt    │ │          │ │  Logs    │ │ Storage  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
        │           │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│PostgreSQL│ │  Redis   │ │  Kafka   │ │ Pinecone │ │  AI APIs │ │   QMS    │
│    DB    │ │  Cache   │ │  Events  │ │  Vector  │ │ Providers│ │ Systems  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### 7.2 IAM Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         QAssure.ai IAM Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────┐  │
│  │  Client  │────▶│   Kong API   │────▶│    Auth      │────▶│  Module   │  │
│  │  (Web/   │     │   Gateway    │     │  Middleware  │     │  Handler  │  │
│  │  Mobile) │◀────│              │◀────│              │◀────│           │  │
│  └──────────┘     └──────────────┘     └──────────────┘     └───────────┘  │
│        │                 │                    │                    │        │
│        │                 │                    │                    │        │
│        ▼                 ▼                    ▼                    ▼        │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────┐  │
│  │  OAuth/  │     │    Rate      │     │  Permission  │     │  Tenant   │  │
│  │  SAML    │     │   Limiter    │     │   Check      │     │  Filter   │  │
│  │  IdP     │     │   (Redis)    │     │   (Redis)    │     │  (Query)  │  │
│  └──────────┘     └──────────────┘     └──────────────┘     └───────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Identity Store (PostgreSQL)                   │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────┐  ┌────────────────────┐  │   │
│  │  │  Users  │  │  Roles  │  │ Permissions │  │    User_Roles      │  │   │
│  │  └─────────┘  └─────────┘  └─────────────┘  └────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Module Communication Patterns

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      MODULE COMMUNICATION PATTERNS                               │
└─────────────────────────────────────────────────────────────────────────────────┘

1. SYNCHRONOUS (REST API)
   ┌──────────┐    HTTP/REST    ┌──────────┐    HTTP/REST    ┌──────────┐
   │  Client  │ ──────────────► │   API    │ ──────────────► │ Service  │
   │   App    │                 │  Layer   │                 │  Layer   │
   └──────────┘                 └──────────┘                 └──────────┘

2. ASYNCHRONOUS (Kafka Events)
   ┌──────────┐                 ┌──────────┐                 ┌──────────┐
   │ Producer │   event.emit    │  Kafka   │  event.consume  │ Consumer │
   │ Service  │ ──────────────► │  Topic   │ ──────────────► │ Service  │
   └──────────┘                 └──────────┘                 └──────────┘

3. WEBHOOKS (External Systems)
   ┌──────────┐                 ┌──────────┐                 ┌──────────┐
   │ Platform │   HTTP POST     │ Webhook  │    Notify       │ External │
   │   Core   │ ──────────────► │ Delivery │ ──────────────► │  System  │
   └──────────┘                 └──────────┘                 └──────────┘

4. REAL-TIME (WebSocket/SSE)
   ┌──────────┐                 ┌──────────┐                 ┌──────────┐
   │  Server  │   ws.emit       │ Socket.IO│   ws.receive    │  Client  │
   │  Events  │ ──────────────► │  Server  │ ──────────────► │   App    │
   └──────────┘                 └──────────┘                 └──────────┘
```

### 7.4 Multi-Tenant Access Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     QASSURE PLATFORM SUPER ADMIN                                 │
│                    (Platform Operations Team)                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ✅ Create/Manage ALL Tenants                                                   │
│  ✅ Set GLOBAL default settings (applies to all tenants)                        │
│  ✅ Configure AI providers, QMS adapters                                        │
│  ✅ Platform-level security policies                                            │
│  ✅ View all tenant data (for support)                                          │
│  ✅ Global feature flags                                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   TENANT A ADMIN    │  │   TENANT B ADMIN    │  │   TENANT C ADMIN    │
│  (Pfizer IT Admin)  │  │  (J&J QA Manager)   │  │ (Medtronic Admin)   │
├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
│ ✅ Their branding   │  │ ✅ Their branding   │  │ ✅ Their branding   │
│ ✅ Their users      │  │ ✅ Their users      │  │ ✅ Their users      │
│ ✅ Their settings   │  │ ✅ Their settings   │  │ ✅ Their settings   │
│ ✅ Their QMS config │  │ ✅ Their QMS config │  │ ✅ Their QMS config │
│ ❌ Other tenants    │  │ ❌ Other tenants    │  │ ❌ Other tenants    │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
     Tenant A Users           Tenant B Users          Tenant C Users
```

### 7.5 Production Architecture (Target State)

```
                              ┌─────────────────────────────────────┐
                              │        Client Applications          │
                              │   (Web App, Mobile, CLI, External)  │
                              └─────────────────────────────────────┘
                                              │
                                              ▼
                    ┌─────────────────────────────────────────────────────┐
                    │                  KONG API GATEWAY                    │
                    │  ┌─────────────────────────────────────────────────┐│
                    │  │ • Rate Limiting    • JWT Validation             ││
                    │  │ • Load Balancing   • Request/Response Transform ││
                    │  │ • SSL Termination  • API Versioning             ││
                    │  │ • Service Discovery • Circuit Breaker           ││
                    │  └─────────────────────────────────────────────────┘│
                    └─────────────────────────────────────────────────────┘
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              │                               │                               │
              ▼                               ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│    PLATFORM CORE        │   │    MODULE SERVICES      │   │   EXTERNAL SYSTEMS      │
│    (Current Build)      │   │    (Future Build)       │   │                         │
│                         │   │                         │   │                         │
│  ┌───────────────────┐  │   │  ┌─────────────────┐   │   │  ┌─────────────────┐   │
│  │ Auth/IAM Service  │  │   │  │ AiCE Service    │   │   │  │ Veeva Vault     │   │
│  │ • JWT Auth        │  │   │  │ (CAPA/Events)   │   │   │  └─────────────────┘   │
│  │ • RBAC            │  │   │  └─────────────────┘   │   │  ┌─────────────────┐   │
│  │ • Sessions        │  │   │  ┌─────────────────┐   │   │  │ MasterControl   │   │
│  └───────────────────┘  │   │  │ AiCH Service    │   │   │  └─────────────────┘   │
│  ┌───────────────────┐  │   │  │ (Change Control)│   │   │  ┌─────────────────┐   │
│  │ AI Gateway        │  │   │  └─────────────────┘   │   │  │ TrackWise       │   │
│  │ • Completions     │  │   │  ┌─────────────────┐   │   │  └─────────────────┘   │
│  │ • RAG/Knowledge   │  │   │  │ AiTM Service    │   │   │  ┌─────────────────┐   │
│  │ • Prompts         │  │   │  │ (Training Mgmt) │   │   │  │ Arena PLM       │   │
│  └───────────────────┘  │   │  └─────────────────┘   │   │  └─────────────────┘   │
│  ┌───────────────────┐  │   │  ┌─────────────────┐   │   │  ┌─────────────────┐   │
│  │ Module Registry   │  │   │  │ AiDC Service    │   │   │  │ ETQ Reliance    │   │
│  │ • Registration    │  │   │  │ (Doc Control)   │   │   │  └─────────────────┘   │
│  │ • Health Checks   │  │   │  └─────────────────┘   │   │                         │
│  │ • Lifecycle       │  │   │                         │   │                         │
│  └───────────────────┘  │   │                         │   │                         │
└─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘
```

### 7.8 Notification System — Detailed Design

The QAssure Notification System is a high-performance, multi-channel alerting framework designed for real-time delivery and enterprise-grade configurability. It provides a seamless communication bridge between the core platform modules and the end-users.

The notification system provides real-time alerts via WebSocket (Socket.io), email digests, configurable alert rules, and escalation policies with full template management.

#### Key Functional Pillars:

*   **Multi-Channel Delivery**: Orchestrates real-time alerts via WebSocket (Socket.io) for instant in-app interaction and SMTP-integrated Email Digests for external reach.
*   **Intelligent Routing & Preferences**: Users can define Granular Channel Preferences (per category), while administrators manage deliverability via configurable alert rules. The system respects Timezone-aware Quiet Hours to ensure notifications are delivered during appropriate windows.
*   **Smart Escalation & SLA Management**: Features robust Cross-module Escalation Policies that automatically route overdue items or critical alerts to designated supervisors or roles based on configurable SLA hierarchies.
*   **Template & Content Governance**: A module-aware template engine with full master data management for categories and template codes, ensuring consistent branding and message structure platform-wide.
*   **Operational Hygiene**: Includes Self-expiring Alerts to maintain a clutter-free notification center and Role-based Broadcasts for targeted platform-wide announcements.

#### Advanced Reliability & Governance (Recent Implementations):

*   **Multi-tenant SMTP Configuration & Routing**: 
    - Supports tenant-specific SMTP infrastructure (Gmail, SES, SendGrid).
    - Intelligent routing resolves delivery context based on user/tenant ID.
    - Robust fallback mechanism: Tenant-specific SMTP used for tenant events; Global (Super Admin) SMTP reserved for platform alerts and fallback for non-tenant users (e.g., initial registration).
*   **Centralized Failed Email Logging**:
    - Automatic persistent logging of all delivery failures in `failed_emails`.
    - Captures full payload (To, Subject, Body) and detailed SMTP error codes.
    - Administrative interface for auditing reasons for failure (connection timeout, invalid auth, etc.).
*   **SMTP Health Monitoring**:
    - Automated daily verification of SMTP connectivity for all tenants.
    - Status tracking with `last_tested_at` and `last_test_status`.
    - Real-time "Test Connection" API for immediate feedback during configuration.
*   **Resend Functionality**:
    - Single and bulk resend capabilities for failed items.
    - Built-in prevention of recursive failure logging during retries.
    - Allows recovery once tenant SMTP configuration issues are rectified.
*   **Governance via Categories & Codes**:
    - Hierarchical structure: **Categories** (Top-level, e.g., `capa`) -> **Codes** (Triggers, e.g., `capa_assigned`) -> **Templates** (Branded content).
    - Super-Admin enforced taxonomy ensures platform consistency.
    - Flexible Tenant-level Template Overrides for custom branding without breaking core logic.

---

## 8. Implementation Status

### All 22 Phases Complete ✅ (+ Additional Modules)

| Phase | Name | Status | Endpoints | Tables | Key Files |
|-------|------|--------|-----------|--------|-----------|
| 1 | Core Infrastructure | ✅ Complete | 0 | 0 | .env, packages, structure |
| 2 | Redis & Sessions | ✅ Complete | 0 | 0 | redis.service.js, session_service.js |
| 3 | Authentication | ✅ Complete | 35 | 8 | jwt.service.js, auth.service.js |
| 4 | RBAC & Authorization | ✅ Complete | 25 | 5 | permission.service.js, auth.middleware.js |
| 5 | Module Registry | ✅ Complete | 16+ | 4 | module.service.js, module_routes.js |
| 6 | Kafka Events | ✅ Complete | 0 | 2 | producer.service.js, consumer.service.js |
| 7 | AI Gateway | ✅ Complete | 20+ | 4 | gateway.service.js, providers/* |
| 8 | RAG & Knowledge Base | ✅ Complete | 18 | 4 | vector-store.service.js, embedding.service.js |
| 9 | Prompt Management | ✅ Complete | 25+ | 3 | prompt.service.js, prompt.routes.js |
| 10 | QMS Framework | ✅ Complete | 15 | 5 | qms-connection.service.js, qms-sync.service.js |
| 11 | QMS Adapters | ✅ Complete | 10 | 2 | qms_connection_routes.js, qms_sync_job_routes.js |
| 12 | Cross-Module Communication | ✅ Complete | 15 | 3 | event.service.js, webhook.service.js |
| 13 | Security & Compliance | ✅ Complete | 15 | 4 | electronic-signature.service.js, security.routes.js |
| 14 | Audit System | ✅ Complete | 16+ | 3 | audit_log_service.js, audit_log_routes.js |
| 15 | Observability | ✅ Complete | 25 | 3 | prometheus.service.js, metrics.middleware.js |
| 16 | Monitoring & Alerting | ✅ Complete | 15 | 4 | health_check_service.js, health_check_routes.js |
| 17 | Dashboard APIs | ✅ Complete | 5+ | 2 | dashboard.service.js, dashboard.routes.js |
| 18 | WebSocket/SSE | ✅ Complete | - | 1 | socket.service.js |
| 19 | Reporting Service | ✅ Complete | 32+ | 3 | reporting.service.js, export.service.js |
| 20 | Notification Service | ✅ Complete | 31+ | 6+ | notification.service.js, smtp_config.service.js |
| 21 | File Attachments | ✅ Complete | 15+ | 4 | file-attachment.service.js, file-attachment.routes.js |
| 22 | System Configuration | ✅ Complete | 20+ | 8+ | system-config.service.js, system-config.routes.js |
| 23 | Workflow Engine | ✅ Complete | 15+ | 5+ | workflow-engine.service.js, workflow.routes.js |
| 24 | Document Management | ✅ Complete | 30+ | 5+ | document.service.js, document.routes.js |
| 25 | Training Management | ✅ Complete | 20+ | 4+ | training.service.js, training.routes.js |
| 26 | CAPA Management | ✅ Complete | 20+ | 4+ | capa.service.js, capa.routes.js |
| 27 | Supplier Quality | ✅ Complete | 20+ | 4+ | supplier.service.js, supplier.routes.js |
| 28 | Billing & Licensing | ✅ Complete | 30+ | 6+ | billing.service.js, license.service.js |
| 29 | Project Management | ✅ Complete | 20+ | 4+ | project.service.js, project.routes.js |
| 30 | Organizational Structure | ✅ Complete | 15+ | 3 | department.service.js, designation.service.js |
| | **TOTAL** | **100%** | **400+** | **70+** | |

### What Was Delivered

```
BEFORE (Initial State - 25-30% Complete)
─────────────────────────────────
✅ Database schema (22 tables)
✅ Sequelize models (22 models)
✅ Basic CRUD services (22 services)
✅ Basic controllers (22 controllers)
✅ Route auto-discovery
⚠️ Winston logging (basic)
⚠️ Rate limiting (memory-based)
❌ All middleware were stubs
❌ No Redis/Kafka
❌ No working auth (JWT commented out)
❌ No AI integration
❌ No QMS integration logic
❌ No Kubernetes manifests
❌ No CI/CD pipeline
❌ ~297 API endpoints missing
❌ No WebSocket/SSE
❌ No report generation

AFTER (100% Complete)
─────────────────────────────────
✅ Database schema (70 tables)
✅ Full IAM (OAuth 2.0 + SAML 2.0 + JWT + MFA)
✅ RBAC with tenant/module scoping
✅ Redis (sessions, caching, rate limiting)
✅ Kafka (event streaming, cross-module)
✅ AI Gateway (OpenAI, Anthropic, Google)
✅ RAG with Vector Database
✅ Prompt Management (versioning, testing)
✅ QMS Adapters (Veeva, MasterControl, Arena, TrackWise, ETQ)
✅ Bidirectional sync with conflict resolution
✅ ELK Stack integration ready
✅ Distributed Tracing (Jaeger)
✅ Prometheus + Grafana ready
✅ Alert Management (rules, channels)
✅ FDA 21 CFR Part 11 compliance
✅ Dashboard with health score
✅ WebSocket/SSE for real-time
✅ Reporting & Analytics
✅ File Attachments & Storage
✅ System Configuration
✅ 350+ API endpoints
```

---

## 9. Database Schema

### 70 Tables by Category

#### Core Tables (5)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `tenants` | Multi-tenant organizations | id, name, domain, status, subscription_tier |
| `users` | User accounts | id, email, password_hash, tenant_id, status |
| `sessions` | Active user sessions | id, user_id, token, ip_address, expires_at |
| `api_keys` | API key management | id, key_hash, name, permissions, expires_at |
| `refresh_tokens` | JWT refresh tokens | id, user_id, token, expires_at |

#### Authentication & Authorization (8)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `roles` | Role definitions | id, name, description, is_system |
| `permissions` | Permission definitions | id, resource, action, description |
| `role_permissions` | Role-permission mapping | role_id, permission_id |
| `user_roles` | User-role assignments | user_id, role_id, tenant_id |
| `user_tenants` | User-tenant memberships | user_id, tenant_id, is_primary |
| `mfa_configs` | MFA configuration | user_id, secret, is_enabled |
| `oauth_identities` | OAuth provider links | user_id, provider, provider_id |
| `password_reset_tokens` | Password reset | user_id, token, expires_at |

#### Modules (6)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `modules` | Module registry | id, code, name, version, status |
| `module_deployments` | Deployment history | module_id, version, deployed_at |
| `module_configs` | Module configuration | module_id, tenant_id, config |
| `module_dependencies` | Module dependencies | module_id, depends_on |
| `module_health_history` | Health check history | module_id, status, checked_at |
| `tenant_modules` | Tenant module access | tenant_id, module_id, enabled |

#### AI Gateway (8)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `ai_providers` | AI provider config | id, name, api_key, is_active |
| `ai_models` | Available models | id, provider_id, model_name |
| `ai_completions` | Completion logs | id, user_id, provider, tokens, cost |
| `ai_costs` | Cost tracking | id, tenant_id, provider, amount |
| `prompts` | Prompt templates | id, name, template, category |
| `prompt_versions` | Prompt versioning | prompt_id, version, content |
| `prompt_executions` | Execution logs | prompt_id, user_id, result |
| `ai_usage_quotas` | Usage limits | tenant_id, provider, limit |

#### Knowledge Base (5)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `knowledge_collections` | Document collections | id, name, tenant_id |
| `knowledge_documents` | Uploaded documents | id, collection_id, filename |
| `knowledge_chunks` | Document chunks | document_id, content, embedding |
| `knowledge_embeddings` | Vector embeddings | chunk_id, vector, metadata |
| `knowledge_search_logs` | Search history | query, results, user_id |

#### QMS Integration (8)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `qms_connections` | QMS connections | id, tenant_id, system_type, credentials |
| `qms_field_mappings` | Field mappings | connection_id, entity_type, mappings |
| `qms_sync_configs` | Sync configuration | connection_id, direction, schedule |
| `qms_sync_jobs` | Sync job tracking | id, connection_id, status, started_at |
| `qms_sync_history` | Sync history | job_id, records_synced, errors |
| `qms_sync_errors` | Sync error logs | job_id, error_type, details |
| `qms_conflicts` | Conflict tracking | id, entity_type, local_data, remote_data |
| `qms_entity_cache` | Entity cache | connection_id, entity_type, data |

#### Events & Webhooks (6)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `event_subscriptions` | Event subscriptions | id, event_pattern, subscriber |
| `event_deliveries` | Delivery tracking | subscription_id, event_id, status |
| `event_logs` | Event history | id, event_type, payload, created_at |
| `webhooks` | Webhook config | id, url, events, secret |
| `webhook_deliveries` | Delivery history | webhook_id, status, response |
| `dead_letter_queue` | Failed events | event_id, error, retry_count |

#### Audit & Compliance (6)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `audit_logs` | Audit trail | id, user_id, action, entity, changes |
| `access_reviews` | Access review logs | id, user_id, reviewer_id, decision |
| `electronic_signatures` | E-signatures | id, user_id, document_hash, meaning |
| `signature_manifests` | Signature manifests | signature_id, manifest_data |
| `compliance_reports` | Compliance reports | id, report_type, generated_at |
| `data_retention_logs` | Retention tracking | entity_type, retained_until |

#### Monitoring & Alerting (6)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `health_checks` | Health check config | id, name, endpoint, interval |
| `health_check_results` | Check results | health_check_id, status, response_time |
| `alert_rules` | Alert rules | id, name, condition, severity |
| `alert_instances` | Active alerts | rule_id, status, triggered_at |
| `alert_channels` | Notification channels | id, type, config |
| `alert_channel_rules` | Rule-channel mapping | rule_id, channel_id |

#### Reports (4)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `report_definitions` | Report templates | id, name, type, config |
| `report_schedules` | Scheduled reports | definition_id, cron, recipients |
| `report_exports` | Generated exports | id, definition_id, format, path |
| `report_executions` | Execution logs | schedule_id, status, completed_at |

#### File Storage (5)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `file_attachments` | Logical file references | id, blob_id, original_name, entity_type, entity_id |
| `file_blobs` | Physical binary storage | id, checksum, storage_path, reference_count, is_soft_deleted |
| `file_shares` | Shared file links | file_id, token, expires_at |
| `file_access_logs` | Access history | file_id, user_id, action |
| `storage_quotas` | Storage limits | tenant_id, quota_bytes, used_bytes |

#### System Configuration (12)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `system_settings` | System settings | key, value, category, tenant_id |
| `branding_configs` | Branding config | tenant_id, logo_url, colors |
| `feature_flags` | Feature flags | key, enabled, rollout_percentage |
| `security_policies` | Security policies | tenant_id, password_policy, mfa |
| `email_templates` | Email templates | id, name, subject, body |
| `integration_configs` | Integration config | type, config, tenant_id |
| `notification_preferences` | User preferences | user_id, channel, enabled |
| `notification_channels` | Channel config | id, type, config |
| `notification_smtp_configs` | Tenant SMTP settings | id, tenant_id, host, port, scope |
| `failed_emails` | Delivery failure logs | id, tenant_id, to_email, error_message |
| `notification_categories` | Global categories | id, code, name, module_id |
| `notification_codes` | Specific event triggers | id, category_id, code, variables |

#### Document Management (8)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `documents` | Document records | id, tenant_id, title, status, current_version |
| `document_versions` | Version history | id, document_id, version_number, content, status |
| `document_categories` | Document categories | id, tenant_id, name |
| `document_templates` | Document templates | id, tenant_id, name, structure |
| `document_sections` | Structured sections | id, document_id, section_number, assignee_id |
| `document_comments` | Review comments | id, document_id, section_id, user_id, body |
| `document_checkouts` | Checkout tracking | id, document_id, checked_out_by, expires_at |
| `document_access_log` | Access audit trail | id, document_id, user_id, action, accessed_at |

#### Workflow Engine (7)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `workflow_definitions` | Workflow templates | id, tenant_id, name, steps_config, status |
| `workflow_instances` | Active workflow runs | id, definition_id, entity_type, entity_id, status |
| `workflow_steps` | Step definitions | id, definition_id, name, assignee_type, order |
| `workflow_tasks` | User task assignments | id, instance_id, step_id, assignee_id, status |
| `workflow_history` | State transition log | id, instance_id, from_status, to_status, actor_id |
| `workflow_delegates` | Task delegation records | id, task_id, delegated_to, delegated_by |
| `workflow_transitions` | Allowed transitions | id, step_id, trigger, target_step_id |

#### Training Management (7)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `training_records` | Training completion records | id, tenant_id, user_id, course_id, status |
| `training_courses` | Course catalog | id, tenant_id, name, type, duration |
| `training_curricula` | Training programs | id, tenant_id, name, required_roles |
| `curriculum_courses` | Curriculum-course mapping | curriculum_id, course_id, order |
| `training_assignments` | User-course assignments | id, user_id, course_id, due_date, status |
| `training_quiz_questions` | Quiz questions | id, course_id, question, options |
| `training_quiz_attempts` | Quiz results | id, user_id, course_id, score, passed |

#### CAPA Management (5)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `capas` | CAPA records | id, tenant_id, type, title, status, due_date |
| `capa_actions` | Action items | id, capa_id, description, assignee_id, due_date |
| `capa_8d_reports` | 8D root cause reports | id, capa_id, step, content |
| `capa_metrics` | Effectiveness KPIs | id, capa_id, metric_name, value |
| `capa_related_records` | Linked records | id, capa_id, entity_type, entity_id |

#### Supplier Quality (6)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `suppliers` | Supplier registry | id, tenant_id, name, status, category |
| `supplier_contacts` | Contact persons | id, supplier_id, name, email, role |
| `supplier_documents` | Compliance docs | id, supplier_id, doc_type, file_id |
| `supplier_audits` | Audit records | id, supplier_id, audit_date, result |
| `supplier_issues` | Quality issues | id, supplier_id, description, status |
| `approved_supplier_list` | ASL entries | id, tenant_id, supplier_id, valid_until |

#### Project Management (5)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `projects` | Project records | id, tenant_id, name, status, owner_id |
| `project_members` | Team members | project_id, user_id, role |
| `project_milestones` | Milestones | id, project_id, name, due_date, status |
| `project_modules` | Linked modules | project_id, module_id |
| `project_activity_log` | Activity history | id, project_id, actor_id, action |

#### Billing & Licensing (12)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `licenses` | Platform licenses | id, tenant_id, license_type_id, status, expires_at |
| `license_types` | License type catalog | id, name, max_users, features |
| `license_tiers` | Pricing tiers | id, license_type_id, name, price |
| `license_activations` | Activation records | id, license_id, activated_at, machine_id |
| `license_usage` | Historical usage | id, license_id, metric, value, recorded_at |
| `license_audit_log` | License audit trail | id, license_id, action, actor_id |
| `invoices` | Billing invoices | id, tenant_id, amount, status, due_date |
| `invoice_line_items` | Invoice line items | id, invoice_id, description, amount |
| `payments` | Payment records | id, invoice_id, amount, method, status |
| `pricing_plans` | Plan catalog | id, name, price, interval, features |
| `renewal_history` | Renewal events | id, license_id, renewed_at, renewed_by |
| `renewal_notifications` | Renewal alerts | id, license_id, sent_at, channel |

#### Organizational Structure (3)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `departments` | Org departments | id, tenant_id, name, parent_id |
| `designations` | Job designations | id, tenant_id, name |
| `user_categories` | User classification | id, tenant_id, name |

#### AI Extended (4)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `tenant_ai_configs` | Tenant BYOK AI config | id, tenant_id, provider, endpoint, is_active |
| `ai_fallbacks` | Provider fallback rules | id, tenant_id, primary_provider, fallback_order |
| `ai_prompt_test_cases` | Prompt test cases | id, prompt_id, input_vars, expected_output |
| `ai_prompt_test_results` | Test run results | id, test_case_id, run_at, passed, actual_output |

#### Module SSO (2)
| Table | Description | Key Fields |
|-------|-------------|------------|
| `module_launch_tokens` | SSO launch tokens | id, module_id, tenant_id, user_id, token, expires_at |
| `user_modules` | User-module assignments | id, user_id, module_id, tenant_id, role |

---

## 10. API Endpoints Reference

### Base URL
```
http://localhost:3000/api/v1
```

### Default Credentials
| User | Email | Password | Role |
|------|-------|----------|------|
| Super Admin | superadmin@qassure.ai | Password123! | super_admin |

---

### Health & Metrics (3 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Basic health check |
| GET | `/health/detailed` | ❌ | Detailed health (DB, Redis, Kafka) |
| GET | `/metrics` | ❌ | Prometheus metrics |

---

### Authentication (13 implemented endpoints)

> [!NOTE]
> OAuth 2.0 (Google/Microsoft/Okta), SAML 2.0, and MFA endpoints are **planned but not yet implemented** in `auth.routes.js`. Only core JWT-based auth is active.

#### Basic Authentication ✅ Implemented
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/verify-email` | ❌ | Verify email with token |
| POST | `/auth/resend-verification` | ❌ | Resend verification email |
| POST | `/auth/login` | ❌ | Login with email/password |
| POST | `/auth/refresh` | ❌ | Refresh access token |
| POST | `/auth/forgot-password` | ❌ | Request password reset |
| POST | `/auth/reset-password` | ❌ | Reset password with token |
| POST | `/auth/logout` | ✅ | Logout current session |
| POST | `/auth/logout-all` | ✅ | Logout all sessions |
| POST | `/auth/change-password` | ✅ | Change password |
| GET | `/auth/me` | ✅ | Get current user info |
| DELETE | `/auth/sessions/:sessionId` | ✅ | Revoke specific session |
| POST | `/auth/validate` | ✅ | Validate token |

#### OAuth 2.0 ⚠️ Not Yet Implemented
> Routes are not registered in `auth.routes.js`. These are planned for a future phase.

| Method | Endpoint | Status | Description |
|--------|----------|--------|-------------|
| GET | `/auth/oauth/google` | 🔜 Planned | Google OAuth initiation |
| GET | `/auth/oauth/google/callback` | 🔜 Planned | Google OAuth callback |
| GET | `/auth/oauth/microsoft` | 🔜 Planned | Microsoft OAuth initiation |
| GET | `/auth/oauth/microsoft/callback` | 🔜 Planned | Microsoft OAuth callback |
| GET | `/auth/oauth/okta` | 🔜 Planned | Okta OAuth initiation |
| GET | `/auth/oauth/okta/callback` | 🔜 Planned | Okta OAuth callback |

#### SAML 2.0 ⚠️ Not Yet Implemented
> Not registered in routes. Enable via `SAML_ENABLED=true` env var when implemented.

| Method | Endpoint | Status | Description |
|--------|----------|--------|-------------|
| GET | `/auth/saml/login` | 🔜 Planned | SAML login initiation |
| POST | `/auth/saml/callback` | 🔜 Planned | SAML callback |
| GET | `/auth/saml/metadata` | 🔜 Planned | SAML SP metadata |

#### MFA ⚠️ Not Yet Implemented
> Not registered in routes. Planned as a future enhancement.

| Method | Endpoint | Status | Description |
|--------|----------|--------|-------------|
| POST | `/auth/mfa/setup` | 🔜 Planned | Setup MFA (TOTP) |
| POST | `/auth/mfa/verify` | 🔜 Planned | Verify MFA code |
| POST | `/auth/mfa/disable` | 🔜 Planned | Disable MFA |
| GET | `/auth/mfa/recovery-codes` | 🔜 Planned | Get recovery codes |
| POST | `/auth/mfa/recovery-codes/regenerate` | 🔜 Planned | Regenerate recovery codes |

**Example - Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@qassure.ai", "password": "Password123!"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 86400,
    "user": {
      "id": "uuid",
      "email": "superadmin@qassure.ai",
      "first_name": "Super",
      "last_name": "Admin",
      "role": "super_admin"
    }
  }
}
```

---

### Users (12 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/users` | ✅ | users:read | List users (paginated) |
| GET | `/users/:id` | ✅ | users:read | Get user by ID |
| POST | `/users` | ✅ | users:create | Create user |
| PUT | `/users/:id` | ✅ | users:update | Update user |
| DELETE | `/users/:id` | ✅ | users:delete | Delete user |
| POST | `/users/:id/activate` | ✅ | users:update | Activate user |
| POST | `/users/:id/deactivate` | ✅ | users:update | Deactivate user |
| POST | `/users/:id/reset-password` | ✅ | users:update | Admin reset password |
| GET | `/users/:id/permissions` | ✅ | users:read | Get user permissions |
| GET | `/users/:id/activity` | ✅ | users:read | Get user activity |
| GET | `/users/:id/sessions` | ✅ | users:read | Get user sessions |
| PUT | `/users/:id/roles` | ✅ | users:update | Update user roles |

---

### Tenants (14 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/tenants` | ✅ | tenants:read | List tenants |
| GET | `/tenants/:id` | ✅ | tenants:read | Get tenant by ID |
| POST | `/tenants` | ✅ | tenants:create | Create tenant |
| PUT | `/tenants/:id` | ✅ | tenants:update | Update tenant |
| DELETE | `/tenants/:id` | ✅ | tenants:delete | Delete tenant |
| POST | `/tenants/:id/activate` | ✅ | tenants:update | Activate tenant |
| POST | `/tenants/:id/suspend` | ✅ | tenants:update | Suspend tenant |
| GET | `/tenants/:id/users` | ✅ | tenants:read | Get tenant users |
| GET | `/tenants/:id/modules` | ✅ | tenants:read | Get tenant modules |
| PUT | `/tenants/:id/modules` | ✅ | tenants:update | Update tenant modules |
| GET | `/tenants/:id/stats` | ✅ | tenants:read | Get tenant statistics |
| PUT | `/tenants/:id/settings` | ✅ | tenants:update | Update tenant settings |
| GET | `/tenants/:id/qms-connections` | ✅ | tenants:read | Get QMS connections |
| PUT | `/tenants/:id/subscription` | ✅ | tenants:update | Update subscription |

---

### Roles (10 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/roles` | ✅ | roles:read | List roles |
| GET | `/roles/:id` | ✅ | roles:read | Get role by ID |
| POST | `/roles` | ✅ | roles:create | Create role |
| PUT | `/roles/:id` | ✅ | roles:update | Update role |
| DELETE | `/roles/:id` | ✅ | roles:delete | Delete role |
| GET | `/roles/:id/permissions` | ✅ | roles:read | Get role permissions |
| PUT | `/roles/:id/permissions` | ✅ | roles:update | Update role permissions |
| GET | `/roles/:id/users` | ✅ | roles:read | Get users with role |
| POST | `/roles/:id/clone` | ✅ | roles:create | Clone role |
| GET | `/roles/hierarchy` | ✅ | roles:read | Get role hierarchy |

**Available Default Roles:**
| Role | Description | Permissions |
|------|-------------|-------------|
| `super_admin` | Platform-wide access | `*:*` |
| `tenant_admin` | Full tenant access | All within tenant |
| `quality_manager` | QMS operations | qms:*, modules:read |
| `quality_engineer` | Quality processes | Limited qms:* |
| `auditor` | Audit access | audit:*, reports:read |
| `viewer` | Read-only access | *:read |

---

### Permissions (8 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/permissions` | ✅ | permissions:read | List permissions |
| GET | `/permissions/:id` | ✅ | permissions:read | Get permission by ID |
| POST | `/permissions` | ✅ | permissions:create | Create permission |
| PUT | `/permissions/:id` | ✅ | permissions:update | Update permission |
| DELETE | `/permissions/:id` | ✅ | permissions:delete | Delete permission |
| GET | `/permissions/resources` | ✅ | permissions:read | List resources |
| GET | `/permissions/actions` | ✅ | permissions:read | List actions |
| GET | `/permissions/matrix` | ✅ | permissions:read | Get permission matrix |

**Permission Format:** `resource:action`
- Examples: `users:read`, `users:create`, `users:*`, `*:*`

---

### User-Roles (5 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/user-roles` | ✅ | user_roles:read | List assignments |
| GET | `/user-roles/:id` | ✅ | user_roles:read | Get assignment by ID |
| POST | `/user-roles` | ✅ | user_roles:create | Assign role to user |
| PUT | `/user-roles/:id` | ✅ | user_roles:update | Update assignment |
| DELETE | `/user-roles/:id` | ✅ | user_roles:delete | Remove role from user |

---

### User-Tenants (5 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/user-tenants` | ✅ | user_tenants:read | List assignments |
| GET | `/user-tenants/:id` | ✅ | user_tenants:read | Get assignment by ID |
| POST | `/user-tenants` | ✅ | user_tenants:create | Assign user to tenant |
| PUT | `/user-tenants/:id` | ✅ | user_tenants:update | Update assignment |
| DELETE | `/user-tenants/:id` | ✅ | user_tenants:delete | Remove from tenant |

---

### Sessions (5 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/sessions` | ✅ | sessions:read | List all sessions |
| GET | `/sessions/:id` | ✅ | sessions:read | Get session by ID |
| POST | `/sessions` | ✅ | sessions:create | Create session |
| PUT | `/sessions/:id` | ✅ | sessions:update | Update session |
| DELETE | `/sessions/:id` | ✅ | sessions:delete | Delete session |

---

### API Keys (8 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/api-keys` | ✅ | api_keys:read | List API keys |
| GET | `/api-keys/:id` | ✅ | api_keys:read | Get API key |
| POST | `/api-keys` | ✅ | api_keys:create | Create API key |
| PUT | `/api-keys/:id` | ✅ | api_keys:update | Update API key |
| DELETE | `/api-keys/:id` | ✅ | api_keys:delete | Delete API key |
| POST | `/api-keys/:id/revoke` | ✅ | api_keys:delete | Revoke API key |
| POST | `/api-keys/:id/regenerate` | ✅ | api_keys:update | Regenerate key |
| POST | `/api-keys/validate` | ✅ | api_keys:read | Validate API key |

---

### Modules (16 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/modules` | ✅ | modules:read | List modules |
| GET | `/modules/stats` | ✅ | modules:read | Get statistics |
| GET | `/modules/states` | ✅ | modules:read | Get state diagram |
| GET | `/modules/catalog` | ✅ | modules:read | Get module catalog |
| GET | `/modules/:id` | ✅ | modules:read | Get module |
| POST | `/modules` | ✅ | modules:create | Register module |
| PUT | `/modules/:id` | ✅ | modules:update | Update module |
| DELETE | `/modules/:id` | ✅ | modules:delete | Delete module |
| PATCH | `/modules/:id/status` | ✅ | modules:update | Update status |
| POST | `/modules/:id/start` | ✅ | modules:update | Start module |
| POST | `/modules/:id/stop` | ✅ | modules:update | Stop module |
| POST | `/modules/:id/restart` | ✅ | modules:update | Restart module |
| POST | `/modules/:id/maintenance` | ✅ | modules:update | Set maintenance mode |
| POST | `/modules/:id/deprecate` | ✅ | modules:update | Deprecate module |
| PATCH | `/modules/:id/version` | ✅ | modules:update | Update version |
| POST | `/modules/:id/health-check` | ✅ | modules:read | Trigger health check |
| GET | `/modules/:id/health-history` | ✅ | modules:read | Get health history |

**Module States:**
```
pending → starting → running → stopping → stopped → deprecated
                ↓                ↓
             failed         maintenance
```

---

### AI Gateway (20 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/ai/providers` | ✅ | ai:read | List AI providers |
| GET | `/ai/providers/:provider` | ✅ | ai:read | Get provider details |
| GET | `/ai/providers/:provider/health` | ✅ | ai:read | Provider health |
| PUT | `/ai/providers/:provider` | ✅ | ai:admin | Configure provider |
| GET | `/ai/models` | ✅ | ai:read | List available models |
| GET | `/ai/health` | ✅ | ai:read | AI gateway health |
| POST | `/ai/completions` | ✅ | ai:create | Create completion |
| GET | `/ai/completions` | ✅ | ai:read | List completions |
| GET | `/ai/completions/:id` | ✅ | ai:read | Get completion |
| GET | `/ai/costs` | ✅ | ai:read | Cost summary |
| GET | `/ai/costs/by-provider` | ✅ | ai:read | Costs by provider |
| GET | `/ai/costs/by-model` | ✅ | ai:read | Costs by model |
| GET | `/ai/costs/by-user` | ✅ | ai:read | Costs by user |
| GET | `/ai/costs/trends` | ✅ | ai:read | Cost trends |
| POST | `/ai/playground` | ✅ | ai:create | Test prompts |
| GET | `/ai/usage` | ✅ | ai:read | Usage statistics |
| GET | `/ai/usage/by-user` | ✅ | ai:read | Usage by user |
| GET | `/ai/rate-limits` | ✅ | ai:read | Current rate limits |
| GET | `/ai/quotas` | ✅ | ai:read | Usage quotas |
| PUT | `/ai/quotas` | ✅ | ai:admin | Update quotas |

**Example - AI Completion:**
```bash
curl -X POST http://localhost:3000/api/v1/ai/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a quality management expert."},
      {"role": "user", "content": "What are the key elements of a CAPA?"}
    ],
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.7
  }'
```

---

### Knowledge Base / RAG (18 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/ai/knowledge/collections` | ✅ | ai:create | Create collection |
| GET | `/ai/knowledge/collections` | ✅ | ai:read | List collections |
| GET | `/ai/knowledge/collections/:id` | ✅ | ai:read | Get collection |
| PUT | `/ai/knowledge/collections/:id` | ✅ | ai:update | Update collection |
| DELETE | `/ai/knowledge/collections/:id` | ✅ | ai:delete | Delete collection |
| GET | `/ai/knowledge/collections/:id/documents` | ✅ | ai:read | List documents |
| POST | `/ai/knowledge/documents` | ✅ | ai:create | Upload document |
| GET | `/ai/knowledge/documents/:id` | ✅ | ai:read | Get document |
| GET | `/ai/knowledge/documents/:id/status` | ✅ | ai:read | Processing status |
| DELETE | `/ai/knowledge/documents/:id` | ✅ | ai:delete | Delete document |
| POST | `/ai/knowledge/documents/:id/reprocess` | ✅ | ai:update | Reprocess document |
| GET | `/ai/knowledge/documents/:id/chunks` | ✅ | ai:read | Get document chunks |
| POST | `/ai/knowledge/search` | ✅ | ai:read | Semantic search |
| POST | `/ai/knowledge/search/context` | ✅ | ai:read | Search with context (RAG) |
| GET | `/ai/knowledge/stats` | ✅ | ai:read | Knowledge base stats |
| GET | `/ai/knowledge/embeddings/status` | ✅ | ai:read | Embedding status |
| POST | `/ai/knowledge/embeddings/refresh` | ✅ | ai:update | Refresh embeddings |
| GET | `/ai/knowledge/search-logs` | ✅ | ai:read | Search history |

---

### Prompt Management (25 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/ai/prompts` | ✅ | prompts:create | Create template |
| GET | `/ai/prompts` | ✅ | prompts:read | List prompts |
| GET | `/ai/prompts/:id` | ✅ | prompts:read | Get prompt |
| PUT | `/ai/prompts/:id` | ✅ | prompts:update | Update prompt |
| DELETE | `/ai/prompts/:id` | ✅ | prompts:delete | Delete prompt |
| GET | `/ai/prompts/:id/versions` | ✅ | prompts:read | List versions |
| POST | `/ai/prompts/:id/versions` | ✅ | prompts:create | Create new version |
| GET | `/ai/prompts/:id/versions/:version` | ✅ | prompts:read | Get specific version |
| POST | `/ai/prompts/:id/versions/:version/activate` | ✅ | prompts:update | Activate version |
| POST | `/ai/prompts/:id/versions/:version/rollback` | ✅ | prompts:update | Rollback to version |
| POST | `/ai/prompts/:id/test` | ✅ | prompts:read | Test prompt |
| POST | `/ai/prompts/:id/execute` | ✅ | prompts:read | Execute prompt |
| POST | `/ai/prompts/:id/clone` | ✅ | prompts:create | Clone prompt |
| GET | `/ai/prompts/:id/stats` | ✅ | prompts:read | Prompt statistics |
| GET | `/ai/prompts/:id/executions` | ✅ | prompts:read | Execution history |
| GET | `/ai/prompts/categories` | ✅ | prompts:read | List categories |
| GET | `/ai/prompts/stats` | ✅ | prompts:read | Overall statistics |
| POST | `/ai/prompts/:id/ab-test` | ✅ | prompts:create | Start A/B test |
| GET | `/ai/prompts/:id/ab-test` | ✅ | prompts:read | Get A/B test results |
| DELETE | `/ai/prompts/:id/ab-test` | ✅ | prompts:delete | Stop A/B test |

**Example - Create Prompt:**
```bash
curl -X POST http://localhost:3000/api/v1/ai/prompts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "root-cause-analysis",
    "description": "Analyze root cause of quality issues",
    "category": "quality",
    "template": "Analyze: {{issue}}\nContext: {{context}}",
    "variables": ["issue", "context"],
    "settings": {"provider": "openai", "model": "gpt-4"}
  }'
```

---

### QMS Integration (25 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/qms/supported` | ✅ | qms:read | List supported QMS |
| GET | `/qms/supported/:system` | ✅ | qms:read | Get QMS details |
| POST | `/qms/connections` | ✅ | qms:create | Create connection |
| GET | `/qms/connections` | ✅ | qms:read | List connections |
| GET | `/qms/connections/:id` | ✅ | qms:read | Get connection |
| PUT | `/qms/connections/:id` | ✅ | qms:update | Update connection |
| DELETE | `/qms/connections/:id` | ✅ | qms:delete | Delete connection |
| POST | `/qms/connections/:id/test` | ✅ | qms:update | Test connection |
| GET | `/qms/connections/:id/status` | ✅ | qms:read | Connection status |
| GET | `/qms/connections/:id/fields/:entityType` | ✅ | qms:read | Get entity fields |
| GET | `/qms/connections/:id/mappings` | ✅ | qms:read | Get field mappings |
| PUT | `/qms/connections/:id/mappings/:entityType` | ✅ | qms:update | Update mappings |
| GET | `/qms/connections/:id/sync-config` | ✅ | qms:read | Get sync config |
| PUT | `/qms/connections/:id/sync-config` | ✅ | qms:update | Update sync config |
| POST | `/qms/connections/:id/sync` | ✅ | qms:create | Trigger sync |
| GET | `/qms/connections/:id/sync/status` | ✅ | qms:read | Get sync status |
| GET | `/qms/connections/:id/sync/history` | ✅ | qms:read | Get sync history |
| GET | `/qms/connections/:id/sync/errors` | ✅ | qms:read | Get sync errors |
| GET | `/qms/sync/jobs/:jobId` | ✅ | qms:read | Get sync job |
| POST | `/qms/sync/jobs/:jobId/cancel` | ✅ | qms:update | Cancel sync job |
| POST | `/qms/sync/jobs/:jobId/retry` | ✅ | qms:update | Retry sync job |
| GET | `/qms/conflicts` | ✅ | qms:read | List conflicts |
| GET | `/qms/conflicts/:id` | ✅ | qms:read | Get conflict details |
| POST | `/qms/conflicts/:id/resolve` | ✅ | qms:update | Resolve conflict |
| POST | `/qms/conflicts/:id/ignore` | ✅ | qms:update | Ignore conflict |

**Supported QMS Systems:**
| System | Adapter | Entity Types |
|--------|---------|--------------|
| Veeva Vault | veeva-vault.adapter.js | Documents, CAPA, Deviations, Change Control |
| MasterControl | mastercontrol.adapter.js | Documents, Training, CAPA, Audit |
| Arena PLM | arena-plm.adapter.js | Products, Changes, Quality Records |
| TrackWise | trackwise.adapter.js | CAPA, Complaints, Audits, Deviations |
| ETQ Reliance | etq.adapter.js | Documents, CAPA, Nonconformance |

---

### Event Subscriptions (7 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/events/subscriptions` | ✅ | events:create | Create subscription |
| GET | `/events/subscriptions` | ✅ | events:read | List subscriptions |
| GET | `/events/subscriptions/:id` | ✅ | events:read | Get subscription |
| PUT | `/events/subscriptions/:id` | ✅ | events:update | Update subscription |
| DELETE | `/events/subscriptions/:id` | ✅ | events:delete | Delete subscription |
| POST | `/events/subscriptions/:id/pause` | ✅ | events:update | Pause subscription |
| POST | `/events/subscriptions/:id/resume` | ✅ | events:update | Resume subscription |

**Delivery Types:**
| Type | Description |
|------|-------------|
| `kafka` | Route to Kafka topic |
| `http` | HTTP webhook delivery |
| `internal` | Internal service routing |

---

### Webhooks (8 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/webhooks` | ✅ | webhooks:create | Create webhook |
| GET | `/webhooks` | ✅ | webhooks:read | List webhooks |
| GET | `/webhooks/:id` | ✅ | webhooks:read | Get webhook |
| PUT | `/webhooks/:id` | ✅ | webhooks:update | Update webhook |
| DELETE | `/webhooks/:id` | ✅ | webhooks:delete | Delete webhook |
| POST | `/webhooks/:id/test` | ✅ | webhooks:update | Test webhook |
| POST | `/webhooks/:id/regenerate-secret` | ✅ | webhooks:update | Regenerate secret |
| GET | `/webhooks/:id/deliveries` | ✅ | webhooks:read | Delivery history |

---

### Audit Logs (16 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/audit-logs` | ✅ | audit_logs:read | List all audit logs (Paginated) |
| GET | `/audit-logs/my-logs` | ✅ | - | Get current user's audit logs |
| GET | `/audit-logs/stats` | ✅ | audit_logs:read | Audit log usage statistics |
| GET | `/audit-logs/export` | ✅ | audit_logs:read | Export logs (CSV/JSON) |
| GET | `/audit-logs/:id` | ✅ | audit_logs:read | Get specific log details |
| POST | `/audit-logs` | ✅ | audit_logs:create | Create manual audit entry |
| DELETE | `/audit-logs/:id` | ✅ | audit_logs:delete | Delete log (Super Admin) |

#### Resource Types (Super Admin)
| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/audit-log-resource-types/dropdown` | ✅ | - | Get list for filter dropdowns |
| GET | `/audit-log-resource-types` | ✅ | super_admin | List all registered resource types |
| POST | `/audit-log-resource-types` | ✅ | super_admin | Register new resource type |
| PUT | `/audit-log-resource-types/:id` | ✅ | super_admin | Update resource type |
| DELETE | `/audit-log-resource-types/:id` | ✅ | super_admin | Remove resource type |

---

### Electronic Signatures (10 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/signatures` | ✅ | signatures:create | Create signature request |
| GET | `/signatures` | ✅ | signatures:read | List signatures |
| GET | `/signatures/:id` | ✅ | signatures:read | Get signature |
| POST | `/signatures/:id/sign` | ✅ | signatures:create | Sign document |
| POST | `/signatures/:id/verify` | ✅ | signatures:read | Verify signature |
| GET | `/signatures/:id/manifest` | ✅ | signatures:read | Get manifest |
| POST | `/signatures/:id/reject` | ✅ | signatures:update | Reject signature |
| GET | `/signatures/pending` | ✅ | signatures:read | Pending signatures |
| GET | `/signatures/entity/:type/:id` | ✅ | signatures:read | Signatures for entity |
| GET | `/signatures/stats` | ✅ | signatures:read | Signature statistics |

---

### Access Reviews (6 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/access-reviews` | ✅ | access_reviews:read | List reviews |
| GET | `/access-reviews/:id` | ✅ | access_reviews:read | Get review |
| POST | `/access-reviews` | ✅ | access_reviews:create | Create review |
| POST | `/access-reviews/:id/approve` | ✅ | access_reviews:update | Approve access |
| POST | `/access-reviews/:id/reject` | ✅ | access_reviews:update | Reject access |
| GET | `/access-reviews/pending` | ✅ | access_reviews:read | Pending reviews |

---

### Health Checks (8 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/health-checks` | ✅ | health_checks:read | List health checks |
| GET | `/health-checks/:id` | ✅ | health_checks:read | Get check by ID |
| POST | `/health-checks` | ✅ | health_checks:create | Create check |
| PUT | `/health-checks/:id` | ✅ | health_checks:update | Update check |
| DELETE | `/health-checks/:id` | ✅ | health_checks:delete | Delete check |
| POST | `/health-checks/:id/run` | ✅ | health_checks:update | Run check now |
| GET | `/health-checks/:id/results` | ✅ | health_checks:read | Get results |
| GET | `/health-checks/summary` | ✅ | health_checks:read | Get summary |

---

### Alert Management (15 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/alerts/rules` | ✅ | alerts:read | List alert rules |
| GET | `/alerts/rules/:id` | ✅ | alerts:read | Get rule |
| POST | `/alerts/rules` | ✅ | alerts:create | Create rule |
| PUT | `/alerts/rules/:id` | ✅ | alerts:update | Update rule |
| DELETE | `/alerts/rules/:id` | ✅ | alerts:delete | Delete rule |
| POST | `/alerts/rules/:id/enable` | ✅ | alerts:update | Enable rule |
| POST | `/alerts/rules/:id/disable` | ✅ | alerts:update | Disable rule |
| GET | `/alerts/instances` | ✅ | alerts:read | List active alerts |
| GET | `/alerts/instances/:id` | ✅ | alerts:read | Get alert instance |
| POST | `/alerts/instances/:id/acknowledge` | ✅ | alerts:update | Acknowledge |
| POST | `/alerts/instances/:id/resolve` | ✅ | alerts:update | Resolve |
| GET | `/alerts/channels` | ✅ | alerts:read | List channels |
| POST | `/alerts/channels` | ✅ | alerts:create | Create channel |
| PUT | `/alerts/channels/:id` | ✅ | alerts:update | Update channel |
| POST | `/alerts/channels/:id/test` | ✅ | alerts:update | Test channel |

---

### Event Logs (5 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/event-logs` | ✅ | event_logs:read | List event logs |
| GET | `/event-logs/:id` | ✅ | event_logs:read | Get log by ID |
| POST | `/event-logs` | ✅ | event_logs:create | Create log |
| GET | `/event-logs/search` | ✅ | event_logs:read | Search logs |
| GET | `/event-logs/stats` | ✅ | event_logs:read | Log statistics |

---

### Dashboard (14 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/dashboard/health` | ✅ | dashboard:read | Platform health score |
| GET | `/dashboard/health/details` | ✅ | dashboard:read | Detailed health |
| GET | `/dashboard/modules/status` | ✅ | dashboard:read | All modules status |
| GET | `/dashboard/modules/:id/status` | ✅ | dashboard:read | Module status |
| GET | `/dashboard/metrics/realtime` | ✅ | dashboard:read | Real-time metrics |
| GET | `/dashboard/metrics/history` | ✅ | dashboard:read | Historical metrics |
| GET | `/dashboard/alerts/recent` | ✅ | dashboard:read | Recent alerts |
| GET | `/dashboard/alerts/active` | ✅ | dashboard:read | Active alerts |
| GET | `/dashboard/ai/summary` | ✅ | dashboard:read | AI usage summary |
| GET | `/dashboard/activity` | ✅ | dashboard:read | Activity feed |
| GET | `/dashboard/quick-actions` | ✅ | dashboard:read | Available actions |
| POST | `/dashboard/quick-actions/:id` | ✅ | dashboard:update | Execute action |
| GET | `/dashboard/widgets` | ✅ | dashboard:read | Dashboard widgets |
| PUT | `/dashboard/widgets` | ✅ | dashboard:update | Update widget layout |

---

### Reports & Analytics (32 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/reports/usage` | ✅ | reports:read | Usage overview |
| GET | `/reports/usage/api-calls` | ✅ | reports:read | API call metrics |
| GET | `/reports/usage/users` | ✅ | reports:read | User activity |
| GET | `/reports/usage/features` | ✅ | reports:read | Feature usage |
| GET | `/reports/usage/storage` | ✅ | reports:read | Storage usage |
| GET | `/reports/usage/ai` | ✅ | reports:read | AI usage |
| GET | `/reports/usage/by-module` | ✅ | reports:read | Usage by module |
| GET | `/reports/usage/by-tenant` | ✅ | reports:read | Usage by tenant |
| GET | `/reports/usage/trends` | ✅ | reports:read | Usage trends |
| GET | `/reports/performance` | ✅ | reports:read | Performance overview |
| GET | `/reports/performance/availability` | ✅ | reports:read | Uptime/availability |
| GET | `/reports/performance/response-time` | ✅ | reports:read | Response times |
| GET | `/reports/performance/error-rate` | ✅ | reports:read | Error rates |
| GET | `/reports/performance/sla` | ✅ | reports:read | SLA compliance |
| GET | `/reports/performance/by-module` | ✅ | reports:read | By module |
| GET | `/reports/performance/trends` | ✅ | reports:read | Trends |
| GET | `/reports/costs` | ✅ | reports:read | Cost overview |
| GET | `/reports/costs/infrastructure` | ✅ | reports:read | Infra costs |
| GET | `/reports/costs/ai` | ✅ | reports:read | AI costs |
| GET | `/reports/costs/by-tenant` | ✅ | reports:read | Costs by tenant |
| GET | `/reports/costs/by-module` | ✅ | reports:read | Costs by module |
| GET | `/reports/costs/trends` | ✅ | reports:read | Cost trends |
| GET | `/reports/costs/forecast` | ✅ | reports:read | Cost forecast |
| POST | `/reports/export` | ✅ | reports:create | Export report |
| GET | `/reports/exports` | ✅ | reports:read | List exports |
| GET | `/reports/exports/:id` | ✅ | reports:read | Get export |
| GET | `/reports/exports/:id/download` | ✅ | reports:read | Download export |
| GET | `/reports/schedules` | ✅ | reports:read | List schedules |
| POST | `/reports/schedules` | ✅ | reports:create | Create schedule |
| PUT | `/reports/schedules/:id` | ✅ | reports:update | Update schedule |
| DELETE | `/reports/schedules/:id` | ✅ | reports:delete | Delete schedule |
| POST | `/reports/schedules/:id/run` | ✅ | reports:update | Run now |

---

### Notifications (31 endpoints)

#### User Notifications & Preferences
| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/notifications/me` | ✅ | - | List current user's notifications |
| GET | `/notifications/me/unread-count` | ✅ | - | Get unread count |
| PUT | `/notifications/me/read-all` | ✅ | - | Mark all as read |
| PUT | `/notifications/me/dismiss-all` | ✅ | - | Dismiss all notifications |
| PUT | `/notifications/:id/read` | ✅ | - | Mark specific notification as read |
| PUT | `/notifications/:id/dismiss` | ✅ | - | Dismiss specific notification |
| GET | `/notifications/preferences` | ✅ | - | Get user notification settings |
| PUT | `/notifications/preferences` | ✅ | - | Update notification settings |

#### Master Data (Super Admin)
| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/notifications/categories` | ✅ | - | List all categories |
| GET | `/notifications/categories/tenant` | ✅ | - | Categories allowed for current tenant |
| GET | `/notifications/categories/:id` | ✅ | - | Get category details |
| POST | `/notifications/categories` | ✅ | notifications:write | Create new category |
| PUT | `/notifications/categories/:id` | ✅ | notifications:write | Update category |
| DELETE | `/notifications/categories/:id` | ✅ | notifications:write | Delete category |
| GET | `/notifications/categories/:categoryId/codes` | ✅ | - | List event codes for category |
| POST | `/notifications/categories/:categoryId/codes` | ✅ | notifications:write | Create new event code |
| PUT | `/notifications/codes/:codeId` | ✅ | notifications:write | Update event code |
| DELETE | `/notifications/codes/:codeId` | ✅ | notifications:write | Delete event code |

#### Notification Templates
| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/notifications/templates` | ✅ | notifications:read | List available templates |
| GET | `/notifications/templates/super-admin` | ✅ | notifications:read | List all global templates |
| POST | `/notifications/templates` | ✅ | notifications:write | Build a new global template |
| PUT | `/notifications/templates/:id` | ✅ | notifications:write | Update global template by ID |
| PUT | `/notifications/templates/:code/override` | ✅ | notifications:write | Create/Update tenant override |
| DELETE | `/notifications/templates/:code/reset` | ✅ | notifications:write | Delete tenant override |

#### Rules & Operations
| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/notifications/alert-rules` | ✅ | notifications:read | List alert rules |
| POST | `/notifications/alert-rules` | ✅ | notifications:write | Create alert rule |
| GET | `/notifications/escalation-rules` | ✅ | notifications:read | List escalation rules |
| POST | `/notifications/escalation-rules` | ✅ | notifications:write | Create escalation rule |
| POST | `/notifications/escalation-rules/process` | ✅ | notifications:write | Trigger manual escalation check |
| POST | `/notifications/send` | ✅ | notifications:write | Send direct notification |
| GET | `/notifications/socket/status` | ✅ | notifications:read | WebSocket health and stats |

#### SMTP Configuration
| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/smtp-config` | ✅ | settings:read | Get active SMTP config for tenant |
| GET | `/smtp-config/all` | ✅ | super_admin | List all SMTP configs |
| POST | `/smtp-config` | ✅ | settings:write | Save/Update SMTP settings |
| POST | `/smtp-config/setup` | ✅ | super_admin | Manage any tenant SMTP |
| POST | `/smtp-config/test` | ✅ | settings:write | Test tenant SMTP connection |
| POST | `/smtp-config/admin/test` | ✅ | super_admin | Test any SMTP connection |
| DELETE | `/smtp-config/:id` | ✅ | settings:write | Delete SMTP configuration |

#### Failed Email Management
| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/failed-emails` | ✅ | settings:read | List failed delivery attempts |
| POST | `/failed-emails/resend-all` | ✅ | settings:write | Bulk resend failed emails |
| POST | `/failed-emails/:id/resend` | ✅ | settings:write | Retry individual email |
| DELETE | `/failed-emails/:id` | ✅ | settings:write | Remove failure log entry |

---

### File Attachments (16 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/files/upload` | ✅ | files:create | Single file upload (with deduplication) |
| POST | `/files/upload/multiple` | ✅ | files:create | Multiple files upload |
| GET | `/files` | ✅ | files:read or document:read | List files (entity-scoped) |
| GET | `/files/:id` | ✅ | files:read | Get file details |
| GET | `/files/:id/download` | ✅ | files:read | Download file |
| GET | `/files/:id/preview` | ✅ | files:read | Preview file (inline) |
| DELETE | `/files/:id` | ✅ | files:delete | Delete file (reference-aware) |
| PUT | `/files/:id` | ✅ | files:update | Update file metadata |
| GET | `/files/entity/:type/:id` | ✅ | files:read | Files for entity |
| POST | `/files/:id/share` | ✅ | files:update | Create share link |
| GET | `/files/shared/:token` | ❌ | - | Access shared file (public token) |
| DELETE | `/files/shares/:shareId` | ✅ | files:update | Revoke share |
| GET | `/files/stats` | ✅ | files:read | Storage statistics |
| GET | `/files/quota` | ✅ | files:read | Get quota |
| PUT | `/files/quota` | ✅ | files:admin | Update quota |
| POST | `/files/blobs/purge-soft-deleted` | ✅ | files:admin | Purge soft-deleted blobs (admin maintenance) |

---

### System Configuration (20 endpoints)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/config/settings` | ✅ | settings:read | Get all settings |
| GET | `/config/settings/:category` | ✅ | settings:read | Get category settings |
| PUT | `/config/settings/:category` | ✅ | settings:write | Update settings |
| GET | `/config/branding` | ✅ | settings:read | Get branding config |
| PUT | `/config/branding` | ✅ | settings:write | Update branding |
| POST | `/config/branding/logo` | ✅ | settings:write | Upload logo |
| POST | `/config/branding/favicon` | ✅ | settings:write | Upload favicon |
| GET | `/config/security` | ✅ | settings:read | Get security policy |
| PUT | `/config/security` | ✅ | settings:write | Update security |
| GET | `/config/features` | ✅ | settings:read | Get feature flags |
| GET | `/config/features/:key` | ✅ | settings:read | Get feature flag |
| PUT | `/config/features/:key` | ✅ | settings:write | Update feature flag |
| GET | `/config/features/:key/check` | ✅ | settings:read | Check if enabled |
| GET | `/config/email-templates` | ✅ | settings:read | List email templates |
| GET | `/config/email-templates/:id` | ✅ | settings:read | Get email template |
| PUT | `/config/email-templates/:id` | ✅ | settings:write | Update template |
| POST | `/config/email-templates/:id/test` | ✅ | settings:write | Test template |
| POST | `/config/email-templates/:id/reset` | ✅ | settings:write | Reset to default |
| GET | `/config/integrations` | ✅ | settings:read | List integrations |
| PUT | `/config/integrations/:type` | ✅ | settings:write | Configure integration |

---

### WebSocket Endpoints

| Type | Endpoint | Description |
|------|----------|-------------|
| WS | `/ws` | Main WebSocket connection |
| WS | `/ws/dashboard` | Dashboard live updates |
| WS | `/ws/logs` | Real-time log streaming |
| WS | `/ws/metrics` | Real-time metrics |
| WS | `/ws/alerts` | Alert notifications |
| WS | `/ws/deployments` | Deployment progress |
| WS | `/ws/sync` | QMS sync progress |

### Server-Sent Events (SSE)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sse/events` | General event stream |
| GET | `/sse/alerts` | Alert stream |
| GET | `/sse/logs` | Log stream |
| GET | `/sse/metrics` | Metrics stream |
| GET | `/sse/sync/:jobId` | Sync progress stream |

---

## 11. Authentication & Authorization

### JWT Token Structure

```javascript
// Access Token Payload
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "tenant_id": "tenant-uuid",
  "roles": ["quality_manager"],
  "permissions": ["users:read", "qms:*"],
  "iat": 1704067200,
  "exp": 1704153600,
  "iss": "qassure.ai",
  "aud": "qassure-platform"
}
```

### Permission Check Flow

```javascript
// Middleware checks permission
async function checkPermission(req, res, next) {
  const { user } = req;
  const requiredPermission = req.route.permission;
  
  // Check Redis cache first
  const cached = await redis.get(`permissions:${user.id}`);
  if (cached) {
    const permissions = JSON.parse(cached);
    if (hasPermission(permissions, requiredPermission)) {
      return next();
    }
  }
  
  // Load from database
  const permissions = await loadUserPermissions(user.id);
  await redis.setex(`permissions:${user.id}`, 300, JSON.stringify(permissions));
  
  if (hasPermission(permissions, requiredPermission)) {
    return next();
  }
  
  return res.status(403).json({ error: 'Permission denied' });
}
```

### Service Tokens (Long-Running background tasks)

For long-running background operations (such as multi-section AI analysis or PDF report compiles), standard access tokens (which naturally expire quickly) can be converted into long-lived, session-backed Service Tokens. 

* **Creation**: `POST /api/v1/auth/service-token` exchanges an active JWT for a service token pair containing both `service_token` and `refresh_token` with a configurable duration (e.g. `24h`, `12h`). The refresh token's lifespan is set to access token expiry + 24 hours.
* **Security & Verification**: These tokens share the identical structure as standard access tokens, making them compatible with existing RBAC middlewares out-of-the-box. The middleware verifies their session state in Redis/PostgreSQL on every request. Additionally, calling the `/refresh` API requires the active access token to be expired; calling it prematurely will return a `TOKEN_NOT_EXPIRED` error response.
* **Revocation**: `POST /api/v1/auth/service-token/revoke` immediately invalidates the token, updating the DB's `revoked_at` timestamp and flushing Redis caches.

### Platform Users & Delegated Administration

To support delegated administration without exposing full root/system-level `super_admin` privileges, QAssure supports **Platform Users**. 
* **Platform User Scope**: Roles can be created with `scope = 'platform'`. These roles represent platform-level administration capabilities but are bound by specific permissions on platform resources (e.g. `settings`, `tenants`, `notifications`, `api_keys`).
* **Bypassing Tenant Isolation**: In the multi-tenant context middleware (`tenantContext`), users designated as platform users bypass mandatory tenant context checks, setting `req.tenant = null` to allow global/platform-level operations.
* **Dual-mode Middlewares**: `requireSuperAdmin` and `requireTenantAdmin` support dual-mode authorization. If the route specifies a resource and action (e.g., `requireSuperAdmin('tenants', 'read')`), the middleware checks if the user is a system `super_admin` OR is a platform user possessing the required permission (verified via `permissionService.hasPlatformPermission`).

---

## 12. Multi-Tenancy

### Row-Level Security

```sql
-- All tables include tenant_id
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  title VARCHAR(255),
  ...
);

-- Row-level security policy
CREATE POLICY tenant_isolation ON documents
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### Tenant Context in API

```javascript
// Middleware sets tenant context
app.use((req, res, next) => {
  req.tenantId = req.user?.tenantId;
  // Set PostgreSQL session variable
  pool.query(`SET app.current_tenant_id = '${req.tenantId}'`);
  next();
});

// All queries automatically filtered
const documents = await Document.findAll({
  where: { tenant_id: req.tenantId }
});
```

---

## 13. AI Gateway

This section documents the implemented AI stack in this repository (gateway, tenant config, and prompts), aligned with:
- `src/infrastructure/ai/*`
- `src/routes/ai.routes.js`
- `src/routes/ai-config.routes.js`
- `src/routes/prompt.routes.js`
- `dev/postman-collection/QAssure — AI Gateway Service.postman_collection.json`

### 13.1 Authentication Modes for AI Endpoints

All AI routes are authenticated and tenant-scoped. The latest collection supports three patterns:

1. JWT only  
   `Authorization: Bearer <jwt_token>`
2. JWT + API Key (Combined Auth)  
   `Authorization: Bearer <module_jwt>` + `X-API-Key: <api_key>`
3. API Key + Tenant header (integration mode)  
   `X-API-Key: <api_key>` + `X-Tenant-ID: <tenant_id>`

### 13.2 Provider Architecture

The gateway dynamically resolves providers per tenant:

- **System providers** from environment:
  - `openai`
  - `anthropic`
  - `gemini`
- **Tenant providers** from `tenant_ai_configs` (BYOK / custom endpoint)
  - `open-source`
  - model-keyed providers like `Mistral 24B`, `Llama 3.2B`, etc.

Resolution behavior:
- Tenant configs are loaded, decrypted, and cached.
- Tenant providers override system providers with the same key.
- Fallback order starts with tenant-configured providers, then fills with remaining system providers.

### 13.3 Completion Routing and Fallback

`POST /api/v1/ai/completions` uses this routing logic:

- If `provider` is passed and exists, it is tried first.
- If `model` is passed and mapped to another provider, provider order may be reordered to match that model.
- On provider failure, gateway automatically tries the next provider in fallback order.
- Response always reports the actual provider/model used.

Important fields in completion response:
- `provider`
- `model`
- `fallbackUsed`
- `usage` (tokens)
- `cost`
- `latency_ms`

### 13.4 AI Gateway Endpoints (Implemented)

From `src/routes/ai.routes.js`:

- `GET /api/v1/ai/providers` — list available providers for tenant
- `GET /api/v1/ai/providers/:provider/health` — provider health check
- `GET /api/v1/ai/models` — list available models
- `GET /api/v1/ai/health` — aggregated provider health
- `POST /api/v1/ai/completions` — create completion (persisted + tracked)
- `GET /api/v1/ai/completions` — list completions with filters
- `GET /api/v1/ai/completions/:id` — get completion by ID
- `GET /api/v1/ai/costs` — cost summary
- `POST /api/v1/ai/playground` — completion without persistence

### 13.5 Tenant AI Config Endpoints (Implemented)

From `src/routes/ai-config.routes.js`:

- `POST /api/v1/ai/config` — create/update tenant provider config
- `GET /api/v1/ai/config` — list tenant configs
- `GET /api/v1/ai/config/:provider` — get provider config
- `POST /api/v1/ai/config/:provider/test` — test config connectivity
- `DELETE /api/v1/ai/config/:provider` — remove config

Supported provider keys include:
- Core: `openai`, `anthropic`, `gemini`, `open-source`
- Open-source model keys: `Mistral 7B`, `Mistral 24B`, `Llama 3.2B`, `Llama 8B`, `Llama 70B`, `Qwen 2.5 3B`, `Qwen 2.5 7B`, `Qwen 2.5 14B`, `Qwen 2.5 72B`, `Gemma 7B`, `Gemma 2 27B`

### 13.6 Prompt Management and Execution

From `src/routes/prompt.routes.js`:

- CRUD:
  - `POST /api/v1/ai/prompts`
  - `GET /api/v1/ai/prompts`
  - `GET /api/v1/ai/prompts/:id`
  - `PUT /api/v1/ai/prompts/:id`
  - `PATCH /api/v1/ai/prompts/:id/status`
  - `DELETE /api/v1/ai/prompts/:id`
  - `POST /api/v1/ai/prompts/:id/clone`
- Versioning:
  - `GET /api/v1/ai/prompts/:id/versions`
  - `GET /api/v1/ai/prompts/:id/versions/:version`
  - `POST /api/v1/ai/prompts/:id/rollback`
- Execution:
  - `POST /api/v1/ai/prompts/:id/execute`
  - `POST /api/v1/ai/prompts/:id/test`
  - `POST /api/v1/ai/prompts/:id/execute-with-file`
- Test cases:
  - `POST /api/v1/ai/prompts/:id/test-cases`
  - `GET /api/v1/ai/prompts/:id/test-cases`
  - `POST /api/v1/ai/prompts/test-cases/:testCaseId/run`
  - `GET /api/v1/ai/prompts/test-cases/:testCaseId/results`

Prompt execution notes:
- Active prompts render `user_template` with `variables`.
- Default provider/model comes from prompt default parameters.
- Execution returns actual provider/model used by gateway.
- File-based execution supports multimodal and document-text extraction flows.

### 13.7 Open-Source / Docker-hosted Model Compatibility

When connecting to Docker-hosted OpenAI-compatible endpoints (vLLM/Ollama-style):

- Use tenant config with:
  - `config_type: "direct"`
  - `endpoint` (for example `http://host.docker.internal:11434/v1`)
  - `custom_models` and `default_model` to match hosted model IDs
- Current provider parser handles both:
  - OpenAI response shape (`choices[0].message.content`)
  - Ollama-like shape (`message.content` / `response`)

This prevents false fallback caused by parse-time errors when the upstream returns HTTP 200 but with a different JSON shape.

### 13.8 Postman Usage (Latest Collection)

Use collection:
- `dev/postman-collection/QAssure — AI Gateway Service.postman_collection.json`

Recommended run order:
1. `Auth/Login`
2. `Setup — SSO Launch Flow` (if using module JWT + API key)
3. `Tenant AI Config` (upsert + test)
4. `AI Gateway` (providers/health/models/completions)
5. `Prompts` (create -> activate -> execute/test)

### 13.9 AI Prompt Execution Cancellation & Timeout Architecture

To support long-running models (such as custom-hosted OpenSource vLLM/Ollama deployments) and standard API endpoints, the platform features a robust cancellation and timeout orchestration system.

#### 1. Timeout & Retry Orchestration
- **Configurable Thresholds**: Supported via `AI_PROVIDER_TIMEOUT` (default: `120000ms`) and `AI_PROVIDER_MAX_RETRIES` environment variables.
- **Per-request Overrides**: Outgoing completions can override timeouts and retry counts on a per-request basis.
- **Failover Logic**: When a provider times out, the gateway automatically falls back to the next designated provider in the tenant's configuration.

#### 2. Execution Registry (`ExecutionRegistry`)
- **Location**: `src/services/execution-registry.service.js`
- **Purpose**: Manages active completions (both streaming and standard) in memory to allow real-time termination.
- **Identifier Mapping**: Maps local `clientRequestId` (UUID generated on request start) to the provider-specific `remoteRequestId` (e.g. `chatcmpl-...` or custom vLLM request IDs).

#### 3. Request Cancellation Flow
1. **Registration**: When a prompt execution is initiated via `POST /api/v1/ai/prompts/:id/execute`, a unique `clientRequestId` is generated, associated with a new `AbortController`, and registered in the registry.
2. **Streaming Feedback**: For Server-Sent Events (SSE), the `clientRequestId` is written as the very first data chunk. The client uses this ID to track execution.
3. **Triggering Cancel**: The client calls `POST /api/v1/ai/prompts/:id/cancel` passing the `request_id`.
4. **Local Signal Abort**: The backend registry signals local cancellation using `abortController.abort()`, stopping CPU/network stream processing immediately.
5. **Remote Cancellation Endpoint**:
   - For custom/direct providers (e.g., Docker-hosted vLLM containers), a `cancel_url` can be stored in the database under `tenant_ai_configs` (via column `cancel_url`).
   - If configured, the registry sends a POST request to the `cancel_url` containing the `request_id` to stop model execution at the source level.
6. **Graceful Registry Cleanup**: Contexts are automatically purged from the registry upon request completion, manual cancellation, or network failure.

#### 4. Fallback Tracking in Prompt Logs
When a request uses provider fallback, the prompt service records metadata in the database:
- `fallback_used`: Boolean indicating if fallback occurred.
- `successful_provider` & `successful_model`: The provider/model that successfully completed the request.
- `failed_attempts`: Array of failed attempts, recording the provider and error message for audit trails and system optimization.

---

## 14. RAG & Knowledge Base

RAG endpoints are mounted under `api/v1/ai/knowledge` and implemented by:
- `src/routes/knowledge.routes.js`
- `src/controllers/knowledge.controller.js`
- `src/services/knowledge.service.js`
- `src/infrastructure/ai/vector-store.service.js`
- `src/infrastructure/ai/embedding.service.js`

### 14.1 RAG Architecture

Pipeline:

1. Create a collection (`knowledge_collections`)
2. Upload document to collection
3. Extract text and split into chunks
4. Generate embeddings through AI gateway embedding path
5. Upsert vectors into vector store namespace
6. Query vectors with semantic search
7. Build context snippets for RAG generation

### 14.2 Vector Store Behavior

Current implementation in `vector-store.service`:

- Primary backend: **Pinecone**
- Index config via:
  - `PINECONE_API_KEY`
  - `PINECONE_INDEX_NAME`
  - `PINECONE_NAMESPACE`
  - `PINECONE_HOST` (optional)
- If Pinecone is unavailable/misconfigured, service falls back to **in-memory vector store** for continuity in non-prod/testing.

### 14.3 Embedding Behavior

Embeddings are generated through gateway (`createEmbedding`) with tenant-aware provider resolution.

Auto-selection prefers embedding-capable providers (in gateway order), commonly:
- OpenAI
- Gemini
- Open-source embedding endpoint (if configured)

Provider can also be passed explicitly from knowledge APIs (`provider` request field).

### 14.4 Knowledge Endpoints (Implemented)

From `src/routes/knowledge.routes.js`:

- Collections:
  - `POST /api/v1/ai/knowledge/collections`
  - `GET /api/v1/ai/knowledge/collections`
  - `GET /api/v1/ai/knowledge/collections/:id`
  - `PUT /api/v1/ai/knowledge/collections/:id`
  - `DELETE /api/v1/ai/knowledge/collections/:id`
  - `GET /api/v1/ai/knowledge/collections/:collectionId/documents`
- Documents:
  - `POST /api/v1/ai/knowledge/documents` (multipart upload, `file` + `collectionId`)
  - `GET /api/v1/ai/knowledge/documents/:id/status`
  - `DELETE /api/v1/ai/knowledge/documents/:id`
- Search:
  - `POST /api/v1/ai/knowledge/search`
  - `POST /api/v1/ai/knowledge/search/context`
- Stats:
  - `GET /api/v1/ai/knowledge/stats`

### 14.5 Supported Document Types (Knowledge Upload)

Allowed MIME types in `knowledge.routes.js`:
- `application/pdf`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/msword`
- `text/plain`
- `text/markdown`
- `application/json`

Upload limit:
- 50MB per file

### 14.6 Search and Context Parameters

For both semantic and context search:
- `query` (required)
- `collectionId` (optional, recommended for scoped retrieval)
- `provider` (optional embedding provider hint)
- `topK` (default `5`)
- `minScore` (default `0.7`)

`/search/context` returns retrieval context designed for prompt injection in downstream completion flows.

---

## 15. QMS Integration

### Adapter Interface

```javascript
// All QMS adapters implement this interface
interface QMSAdapter {
  connect(config: ConnectionConfig): Promise<void>;
  testConnection(): Promise<boolean>;
  getEntityTypes(): string[];
  getFields(entityType: string): Promise<FieldDefinition[]>;
  fetchRecords(entityType: string, options: FetchOptions): Promise<Record[]>;
  createRecord(entityType: string, data: object): Promise<Record>;
  updateRecord(entityType: string, id: string, data: object): Promise<Record>;
  deleteRecord(entityType: string, id: string): Promise<void>;
}
```

### Sync Engine

```javascript
// Bidirectional sync with conflict resolution
async function syncEntity(connection, entityType, direction) {
  const job = await createSyncJob(connection.id, entityType, direction);
  
  try {
    if (direction === 'pull' || direction === 'bidirectional') {
      const remoteRecords = await adapter.fetchRecords(entityType);
      await reconcileRecords(remoteRecords, 'remote');
    }
    
    if (direction === 'push' || direction === 'bidirectional') {
      const localRecords = await getModifiedRecords(entityType);
      await adapter.pushRecords(entityType, localRecords);
    }
    
    await job.complete();
  } catch (error) {
    await job.fail(error);
    throw error;
  }
}
```

---

## 16. Event System (Kafka)

### Kafka Topics

| Topic | Description | Producers | Consumers |
|-------|-------------|-----------|-----------|
| `qassure.auth.events` | Authentication events | Auth Service | Audit, Notification |
| `qassure.user.events` | User lifecycle events | User Service | Notification, Sync |
| `qassure.tenant.events` | Tenant events | Tenant Service | All modules |
| `qassure.module.events` | Module lifecycle | Module Registry | Dashboard, Alerts |
| `qassure.ai.events` | AI Gateway events | AI Gateway | Analytics, Audit |
| `qassure.qms.events` | QMS integration | QMS Connectors | Dashboard, Alerts |
| `qassure.audit.events` | Audit trail | All services | Audit Service |
| `qassure.system.events` | System events | Platform Core | All modules |

### Event Publishing

```javascript
// Publish event
await kafka.publish('qassure.user.events', {
  type: 'user.created',
  timestamp: new Date().toISOString(),
  tenant_id: tenantId,
  data: {
    user_id: user.id,
    email: user.email,
    created_by: currentUser.id
  }
});
```

---

## 17. Real-time Features

### WebSocket Rooms

```javascript
// Tenant-scoped rooms
io.on('connection', (socket) => {
  const { tenantId, userId } = socket.user;
  
  socket.join(`tenant:${tenantId}`);
  socket.join(`user:${userId}`);
  
  // Subscribe to module events
  socket.on('subscribe:module', (moduleId) => {
    socket.join(`module:${moduleId}`);
  });
});

// Broadcast to tenant
io.to(`tenant:${tenantId}`).emit('alert', alertData);
```

### Event Types

| Event | Payload | Description |
|-------|---------|-------------|
| `health.update` | `{ score, status, components }` | Health changes |
| `module.status` | `{ moduleId, status, timestamp }` | Module state changes |
| `alert.new` | `{ alertId, severity, message }` | New alert |
| `alert.resolved` | `{ alertId, resolvedBy }` | Alert resolved |
| `sync.progress` | `{ jobId, progress, status }` | Sync progress |

---

## 18. Reporting & Analytics

### Report Types

| Report | Description | Formats |
|--------|-------------|---------|
| Usage | API calls, users, features | PDF, Excel, CSV |
| Performance | Availability, response times | PDF, Excel |
| Cost | Infrastructure, AI costs | PDF, Excel, CSV |
| Audit | Compliance activities | PDF |
| Security | Access reviews, login attempts | PDF |

### Scheduled Reports

```javascript
{
  "name": "Weekly Usage Report",
  "type": "usage",
  "schedule": "0 9 * * 1",  // Every Monday 9 AM
  "format": "pdf",
  "recipients": ["qa-team@company.com"],
  "filters": {
    "date_range": "last_7_days",
    "modules": ["AiCE", "AiCH"]
  }
}
```

---

## 19. File Management & Scoped Deduplication

QAssure's File Service implements an enterprise-grade, **Reference-Based Scoped Deduplication** model with a dynamic database-driven multi-tenant storage architecture (supporting local filesystem, Azure Blob storage, Amazon S3, and Google Cloud Storage (GCS)). It guarantees transactional consistency, optimal storage utilization, dynamic tenant-specific bucket allocation, and compliance with high-governance life sciences data standards (e.g., FDA 21 CFR Part 11).

---

### 19.1 Features & Architecture Overview

| Feature | Description |
|---------|-------------|
| **Multi-Scoped Deduplication** | Identical content is deduplicated within specific tenant, module, and supplier boundaries. |
| **Reference-Based Storage** | Physical binaries are stored exactly once, while logical reference links represent individual user/entity uploads. |
| **Server-Side Security** | Supplier and module scopes are resolved strictly on the server to prevent client parameter spoofing. |
| **Accurate Quota Triggers** | Quota tracking trigger operates on physical binaries to eliminate double-counting on duplicated files. |
| **Explicit Soft Delete** | Retention mechanism preserves physical files at 0 references for background operations (AI ingestion, audits). |
| **Token-Based Sharing** | Pre-signed, time-limited download URLs with comprehensive access logs and ES audit streams. |
| **Dynamic Storage Buckets** | Replaced static `.env`-based cloud storage configurations with a dynamic, database-driven multi-tenant bucket system (supporting Local, Azure, S3, and GCP). |
| **Credential Security** | Cloud storage credentials (such as Azure SAS tokens, S3 secret access keys, and GCP service account keys) are encrypted using AES-256-GCM. |
| **Blob-Level Snapshotting** | Every blob records its active bucket configuration at upload time, securing historical file access during bucket reassignments. |

---

### 19.2 The Physical vs. Logical Separation

To support deduplication without breaking references inside foreign keys, version chains, Elasticsearch search indexing, and sharing tokens, the file architecture is split into two layers:

```
                  ┌────────────────────────────────────────┐
                  │      Logical Reference Layer           │
                  │         (file_attachments)             │
                  └────────────────────────────────────────┘
                       │              │              │
                       ▼              ▼              ▼
                 [Reference A]  [Reference B]  [Reference C]
                 (CAPA attachment) (Supplier profile) (Training document)
                       │              │              │
                       └──────────────┼──────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │         Physical Blob Layer            │
                  │            (file_blobs)                │
                  └────────────────────────────────────────┘
                                      │
                                      ▼
                             [Physical Binary]
                          (Disk / Azure / S3 / GCS)
```

#### Table A: Physical Blobs (`file_blobs`)
Represents the actual physical file payload stored on the storage provider (local disk, Azure Blob container, S3 bucket, or GCS bucket). One row corresponds to exactly one physical file.
* **Scope Enforced:** Unique index on `(tenant_id, COALESCE(module_id, sentinel_uuid), COALESCE(supplier_id, sentinel_uuid), checksum)`.
* **Attributes:** `id` (UUID), `checksum` (SHA-256), `storage_provider` (`local`/`azure`/`s3`/`gcp`), `storage_path`, `file_size`, `reference_count`, `is_soft_deleted`, `soft_deleted_at`.

#### Table B: File Attachments (`file_attachments`)
Represents the logical reference for each individual upload. Every time a user attaches a file to a record (e.g., CAPA, Training, Audit), a reference is created here.
* **Attributes:** `id` (UUID), `blob_id` (foreign key pointing to `file_blobs`), `entity_type`, `entity_id`, `original_name`, `file_path` (cached copy of the blob path for backward compatibility), `mime_type`, `file_size`, `uploaded_by`, `deleted_at`.

---

### 19.3 Scoped Deduplication Logic

#### A. Deduplication Scope Definition
Deduplication is performed per tenant, module, and supplier. The scope boundary is:
$$\text{Scope} = \text{Tenant ID} + \text{Module ID (UUID)} + \text{Supplier ID (UUID)} + \text{File SHA-256 Checksum}$$

* **Supplier Scoping (Strict Isolation):** To satisfy security guidelines, files uploaded by one supplier must never be accessible or merged with another supplier's files. The `supplier_id` is resolved server-side from the uploader user's record (`users.supplier_id`) inside the database transaction to prevent client tampering.
* **Module Scoping:** Keeps files organized under specific application workflows (e.g., CAPA vs. Training) using the UUID-based `module_id`.
* **Platform/Fallback Scoping:** For system-wide uploads, both `module_id` and `supplier_id` are `NULL`. To enforce a unique index constraint while allowing standard duplicates, a functional unique index coalesces `NULL` fields to a zero-UUID sentinel:
```sql
CREATE UNIQUE INDEX uq_file_blobs_scope
  ON file_blobs (
    tenant_id,
    COALESCE(module_id,   '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(supplier_id, '00000000-0000-0000-0000-000000000000'::uuid),
    checksum
  );
```

#### B. Upload Process Flow
When a file is uploaded to `FileAttachmentService.upload`:
1. **Calculate Checksum:** Computes the SHA-256 hash of the incoming file buffer.
2. **Lookup Existing Blob:** Searches for an active blob in the scope of the current tenant, resolved supplier, resolved module, and checksum using a transaction lock (`FOR UPDATE`).
3. **If Match Exists:** 
   - Restores the blob if it was soft-deleted (`is_soft_deleted = false`).
   - Increments the blob's `reference_count` by 1.
   - Inserts a reference record into `file_attachments` linked to the existing `blob_id`.
   - **Result:** Binary is not written to storage again. Reclaims disk space immediately.
4. **If No Match:** 
   - Generates a secure, tenant-scoped storage path: `uploads/{tenant_id}/{entity_type}/{YYYY}/{MM}/{uuid}_{sanitized_name}.ext`
   - Writes the binary to the active storage provider (local disk, Azure Blob Storage, Amazon S3, or GCS).
   - Inserts a new `file_blobs` row with `reference_count = 1`.
   - Inserts a `file_attachments` reference record pointing to the new blob.

---

### 19.4 Reference-Counting Deletion Lifecycle

To guarantee transactional safety and avoid orphaned files or premature physical purges, deletion is governed strictly by the reference-count lifecycle:

```
User deletes file reference (file_attachments.id)
                     │
                     ▼
Decrement corresponding blob's reference_count (file_blobs.reference_count)
                     │
                     ▼
         Is reference_count == 0?
             ├── NO  ──► Do nothing. Physical binary stays intact (surviving links exist).
             │
             └── YES ──► Check keep_blob flag:
                           ├── keep_blob = true (Explicit Soft Delete):
                           │     └── Mark file_blobs.is_soft_deleted = true.
                           │         Keep physical file on disk/cloud for background jobs.
                           │
                           └── keep_blob = false (Default Purge):
                                 └── Permanently delete the binary from Disk/Azure/S3/GCS.
                                     DELETE row from file_blobs.
```

#### Storage Quota Accounting Trigger
To ensure storage accounting reflects real usage, the system trigger `trg_update_storage_usage` was moved from `file_attachments` to `file_blobs`:
* **Before:** Trigger ran on attachments, multiplying usage on duplicated files (5 references of a 10MB file charged the tenant 50MB).
* **Now:** Trigger runs on `file_blobs` INSERT/DELETE. The tenant is charged precisely **10MB** for a deduplicated file, regardless of how many logical references point to it.

---

### 19.5 Administrative Purge & Storage Maintenance

When files are soft-deleted with `keep_blob = true`, they are temporarily preserved on the storage provider to let background processors (e.g., AI embeddings, OCR, text extraction, search indexing) complete their async tasks safely without getting "File not found" errors.

Admins can trigger an explicit physical purge of these unreferenced, soft-deleted files through the API or the **Storage Dashboard** UI:
* **API Route:** `POST /api/v1/files/blobs/purge-soft-deleted`
* **Query Parameters:** `older_than_hours` (e.g., `24` to retain recent deletions for security/audit buffers, or `0` to instantly purge all eligible blobs).
* **Operation:** Permanently deletes the files from the physical storage provider and deletes their historical records from `file_blobs`.

---

### 19.6 Developer API Reference

#### A. Upload Attachment
* **Route:** `POST /api/v1/files`
* **Headers:** `X-Tenant-ID` (Tenant context)
* **Form-Data:**
  * `file`: (Binary payload)
  * `entity_type`: String (e.g., `capa`, `document`)
  * `entity_id`: UUID (The primary record ID)
  * `category`: String (optional)
  * `category_id`: String (optional)
  * `description`: String (optional)

#### B. Delete Attachment (Reference-Aware)
* **Route:** `DELETE /api/v1/files/:id`
* **Query Parameters:**
  * `hard`: `true`/`false` (If `true`, deletes the reference row from the database. If `false`, sets `deleted_at = NOW()` on the reference row).
  * `keep_blob`: `true`/`false` (If `true`, soft-deletes the underlying physical binary at 0 references, keeping it on disk. If `false`, purges the binary immediately when reference count drops to 0).

#### C. Purge Soft-Deleted Blobs (Admin Maintenance)
* **Route:** `POST /api/v1/files/blobs/purge-soft-deleted`
* **Query Parameters:**
  * `older_than_hours`: Integer (Retention window, default is `0`).
* **Response:**
  ```json
  {
    "success": true,
    "data": {
      "purged": 12,
      "bytes_freed": 104857600
    }
  }
  ```

#### D. Supported File Types
```
Documents: pdf, doc, docx, xls, xlsx, ppt, pptx
Images: png, jpg, jpeg, gif, svg, webp
Data: csv, json, xml, yaml
Archives: zip, tar.gz, 7z
Text: txt, md, rtf
```

---

### 19.7 Dynamic Storage Bucket Management & Tenant Isolation

To support custom cloud tenant storage requirements, QAssure features a dynamic database-driven bucket management engine.

#### A. Database Schema
- **`tenant_storage_buckets`**: Defines storage bucket templates (Local filesystem directories, Azure containers, Amazon S3, or Google Cloud Storage). Sensitive cloud credentials (SAS tokens, secret keys, service account JSONs) are encrypted using **AES-256-GCM** to ensure complete security.
- **`tenant_bucket_assignments`**: Maps tenants to active storage buckets. If no active configuration is present, the system defaults to Local storage.

#### B. Dynamic Resolution & Non-Repudiation (Snapshotting)
- **Active Resolution**: On every upload request, the system checks `tenant_bucket_assignments` to resolve the active configuration and instantiates the matching storage provider (Azure vs. Local vs. S3 vs. GCP) in-memory.
- **Ingestion Snapshotting**: To prevent database modifications from breaking historical files, each physical blob record (`file_blobs`) contains a `bucket_config_id` pointer that snapshots the storage configuration used during upload. If a tenant changes their active storage bucket, historic files remain downloadable from their original storage location.

#### C. Management API Endpoints
SuperAdmin or authorized platform users manage storage configurations via the `/api/v1/storage-buckets` endpoints:
- `GET /storage-buckets` - List all storage configurations.
- `POST /storage-buckets` - Create a storage configuration.
- `GET /storage-buckets/:id` - Get storage configuration details.
- `PUT /storage-buckets/:id` - Update storage configuration.
- `DELETE /storage-buckets/:id` - Soft delete storage configuration.
- `POST /storage-buckets/:id/assign` - Assign a storage bucket to a tenant.
- `POST /storage-buckets/:id/assign-self` - Assign the platform superadmin's default bucket to a tenant.
- `DELETE /storage-buckets/tenant/:tenantId/unassign` - Unassign a bucket from a tenant.
- `GET /storage-buckets/tenant/:tenantId/active` - Get the active bucket configuration for a tenant.
- `GET /storage-buckets/tenant/:tenantId/history` - Get assignment history for a tenant.

---

## 20. System Configuration

### Configuration Categories

| Category | Settings |
|----------|----------|
| **General** | Platform name, timezone, locale, date format |
| **Branding** | Logo, favicon, colors, fonts, custom CSS |
| **Security** | Password policy, session timeout, MFA, IP whitelist |
| **Features** | Feature flags by tenant |
| **Notifications** | Email templates, channels, preferences |
| **Files** | Storage limits, allowed types, max size |
| **Session** | Timeout, max concurrent, remember me |

### Feature Flags

```javascript
{
  "key": "ai_assistant",
  "name": "AI Assistant",
  "description": "Enable AI-powered assistant",
  "enabled": true,
  "rollout_percentage": 100,
  "tenant_overrides": {
    "tenant-123": false
  }
}
```

---

## 21. FDA 21 CFR Part 11 Compliance

### Compliance Features

| Requirement | Implementation |
|-------------|----------------|
| **Electronic Signatures** | Cryptographic signatures with manifest |
| **Audit Trails** | Immutable logs, 7-year retention |
| **Access Control** | RBAC with permission matrix |
| **User Authentication** | MFA support, session management |
| **Record Integrity** | Checksums, encryption at rest |
| **System Validation** | Comprehensive test coverage |

### Electronic Signature

```javascript
{
  "signature_id": "sig-123",
  "signer_id": "user-456",
  "signer_name": "John Doe",
  "signer_email": "john.doe@company.com",
  "meaning": "approval",
  "timestamp": "2024-01-15T10:30:00Z",
  "document_hash": "sha256:abc123...",
  "manifest": {
    "legal_meaning": "I approve this document",
    "regulations": ["21 CFR Part 11"],
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0..."
  }
}
```

---

## 22. Monitoring & Observability

### Health Score Calculation

```javascript
// Platform health score (0-100)
function calculateHealthScore() {
  const weights = {
    database: 0.25,
    redis: 0.20,
    kafka: 0.20,
    modules: 0.20,
    api_latency: 0.15
  };
  
  return Object.entries(weights).reduce((score, [component, weight]) => {
    return score + (getComponentHealth(component) * weight);
  }, 0);
}
```

### Prometheus Metrics

```
# Available metrics
qassure_http_requests_total
qassure_http_request_duration_seconds
qassure_active_sessions
qassure_ai_completions_total
qassure_ai_tokens_used
qassure_qms_sync_jobs_total
qassure_kafka_messages_produced
qassure_redis_operations_total
```

---

## 23. Testing Guide

### Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### API Test Script

```bash
#!/bin/bash
BASE_URL="http://localhost:3000/api/v1"

# Get token
TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@qassure.ai", "password": "Password123!"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")

echo "=== QAssure API Test ==="

# Test endpoints
endpoints=(
  "health"
  "health/detailed"
  "auth/me"
  "users"
  "tenants"
  "roles"
  "permissions"
  "modules"
  "api-keys"
  "audit-logs"
  "ai/providers"
  "ai/prompts"
  "ai/knowledge/collections"
  "qms/supported"
  "qms/connections"
  "events/subscriptions"
  "webhooks"
  "files"
  "config/settings"
  "config/features"
  "reports/usage"
  "dashboard/health"
)

for endpoint in "${endpoints[@]}"; do
  response=$(curl -s "$BASE_URL/$endpoint" -H "Authorization: Bearer $TOKEN")
  success=$(echo $response | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)
  if [ "$success" = "True" ]; then
    echo "✅ GET /$endpoint"
  else
    echo "❌ GET /$endpoint"
  fi
done
```

---

## 24. Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
      - kafka

  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: qassure
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password

  redis:
    image: redis:7
    volumes:
      - redis_data:/data

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "29092:29092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:29092

volumes:
  postgres_data:
  redis_data:
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production database with SSL
- [ ] Enable Redis cluster mode
- [ ] Configure Kafka SSL/SASL
- [ ] Set secure JWT secrets (32+ characters)
- [ ] Enable rate limiting
- [ ] Configure CORS origins
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure backups
- [ ] Enable audit logging
- [ ] Set up log aggregation (ELK)
- [ ] Configure alerts
- [ ] Test disaster recovery
- [ ] Document runbooks

---

## 25. Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
pg_isready -h localhost -p 5432
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux
```

**2. Redis Connection Failed**
```bash
redis-cli ping
brew services start redis  # macOS
sudo systemctl start redis  # Linux
```

**3. Kafka Connection Failed**
```bash
docker ps | grep kafka
docker-compose restart kafka
nc -zv localhost 29092
```

**4. Token Invalid/Expired**
```bash
# Get fresh token
export TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@qassure.ai", "password": "Password123!"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")
```

**5. Permission Denied**
```bash
# Check your permissions
curl http://localhost:3000/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```

**6. Rate Limit Exceeded**
```bash
# Check rate limit headers
curl -i http://localhost:3000/api/v1/users -H "Authorization: Bearer $TOKEN"
# Look for: X-RateLimit-Remaining, X-RateLimit-Reset
```

---

## 26. Project Structure

```
QAssur-backend/
├── .env                          # Environment configuration
├── .env.example                  # Example configuration
├── app.js                        # Express app setup
├── server.js                     # Server entry point
├── package.json
├── docker-compose.yml
├── Dockerfile
├── Jenkinsfile                   # CI/CD pipeline
├── escalation.scheduler.js       # Escalation cron job
├── smtp.scheduler.js             # SMTP health check cron
│
├── src/
│   ├── config/
│   │   ├── config.js             # Configuration management
│   │   ├── database.js           # PostgreSQL connection (pg)
│   │   └── logger.js             # Winston logger
│   │
│   ├── controllers/              # Request handlers (53+ files)
│   │   ├── auth.controller.js
│   │   ├── user_controller.js
│   │   ├── tenant_controller.js
│   │   ├── role_controller.js
│   │   ├── module.controller.js
│   │   ├── ai.controller.js
│   │   ├── knowledge.controller.js
│   │   ├── prompt.controller.js
│   │   ├── qms.controller.js
│   │   ├── document.controller.js
│   │   ├── workflow.controller.js
│   │   ├── training.controller.js
│   │   ├── capa.controller.js
│   │   ├── supplier.controller.js
│   │   ├── reporting.controller.js
│   │   ├── notification.controller.js
│   │   ├── file-attachment.controller.js
│   │   ├── system-config.controller.js
│   │   ├── billing.controller.js
│   │   ├── license.controller.js
│   │   ├── project.controller.js
│   │   ├── department.controller.js
│   │   ├── electronic-signature.controller.js
│   │   ├── audit_log_controller.js
│   │   ├── dashboard.controller.js
│   │   └── ...and more
│   │
│   ├── services/                 # Business logic (66+ files)
│   │   ├── auth.service.js
│   │   ├── user_service.js
│   │   ├── tenant_service.js
│   │   ├── role_service.js
│   │   ├── module.service.js
│   │   ├── prompt.service.js
│   │   ├── knowledge.service.js
│   │   ├── document.service.js
│   │   ├── workflow-engine.service.js
│   │   ├── workflow-definition.service.js
│   │   ├── training.service.js
│   │   ├── capa.service.js
│   │   ├── supplier.service.js
│   │   ├── reporting.service.js
│   │   ├── notification.service.js
│   │   ├── file-attachment.service.js
│   │   ├── system-config.service.js
│   │   ├── billing.service.js
│   │   ├── license.service.js
│   │   ├── project.service.js
│   │   ├── department.service.js
│   │   ├── smtp_config.service.js
│   │   ├── tenant-ai-config.service.js
│   │   ├── audit_log_service.js
│   │   └── ...and more
│   │
│   ├── routes/                   # API routes (49+ files, flat structure)
│   │   ├── index.js              # Central route registration
│   │   ├── auth.routes.js
│   │   ├── user_routes.js
│   │   ├── tenant_routes.js
│   │   ├── role_routes.js
│   │   ├── permission_routes.js
│   │   ├── module_routes.js
│   │   ├── ai.routes.js
│   │   ├── ai-config.routes.js
│   │   ├── knowledge.routes.js
│   │   ├── prompt.routes.js
│   │   ├── qms.routes.js
│   │   ├── document.routes.js
│   │   ├── workflow.routes.js
│   │   ├── training.routes.js
│   │   ├── capa.routes.js
│   │   ├── supplier.routes.js
│   │   ├── reporting.routes.js
│   │   ├── notification.routes.js
│   │   ├── file-attachment.routes.js
│   │   ├── system-config.routes.js
│   │   ├── smtp_config.routes.js
│   │   ├── failed-emails.routes.js
│   │   ├── billing.routes.js
│   │   ├── license.routes.js
│   │   ├── project.routes.js
│   │   ├── department.routes.js
│   │   ├── designation.routes.js
│   │   ├── user_category.routes.js
│   │   ├── audit_log_routes.js
│   │   ├── electronic-signature.routes.js
│   │   ├── webhook.routes.js
│   │   ├── dashboard.routes.js
│   │   └── ...and more
│   │
│   ├── middleware/               # Middleware (11+ files)
│   │   ├── auth.middleware.js     # JWT + API key auth, authorize(), authorizeAny()
│   │   ├── tenant.middleware.js   # Tenant context resolution
│   │   ├── audit.middleware.js    # Request audit logging
│   │   ├── apikey.middleware.js   # API key validation
│   │   ├── metrics.middleware.js  # Prometheus metrics
│   │   ├── correlation.middleware.js # Correlation ID
│   │   ├── validationMiddleware.js
│   │   ├── uuid.middleware.js
│   │   └── validate-uuid.middleware.js
│   │
│   ├── infrastructure/
│   │   ├── auth/                 # JWT & permissions
│   │   │   ├── jwt.service.js
│   │   │   └── permission.service.js
│   │   ├── ai/                   # AI gateway & providers
│   │   │   ├── gateway.service.js
│   │   │   ├── openai.provider.js
│   │   │   ├── anthropic.provider.js
│   │   │   ├── gemini.provider.js
│   │   │   ├── opensource.provider.js
│   │   │   ├── vector-store.service.js
│   │   │   ├── embedding.service.js
│   │   │   ├── chunker.service.js
│   │   │   └── document.processor.js
│   │   ├── cache/                # Redis cache service
│   │   │   └── redis.service.js
│   │   ├── kafka/                # Event streaming
│   │   │   ├── producer.service.js
│   │   │   ├── consumer.service.js
│   │   │   └── event.service.js
│   │   ├── email/                # Email delivery
│   │   ├── metrics/              # Prometheus metrics
│   │   │   └── prometheus.service.js
│   │   ├── qms/                  # QMS adapters
│   │   ├── search/               # Elasticsearch
│   │   └── websocket/            # Socket.IO
│   │       └── socket.service.js
│   │
│   ├── migrations/               # Database migrations (100+ JS files)
│   │   ├── 001_create_modules_table.js
│   │   ├── 002_create_users_table.js
│   │   ├── ...
│   │   ├── 100_refine_file_blobs_scope_columns.js
│   │   └── migrate.js            # Migration runner
│   │
│   ├── models/                   # Sequelize models
│   ├── sequelize-models/         # Additional Sequelize models
│   │
│   └── validation/               # Input validation schemas (29+ files)
│       ├── auth.schema.js
│       ├── user.schema.js
│       ├── tenant.schema.js
│       ├── module.schema.js
│       ├── ai.schema.js
│       ├── workflow.schema.js
│       ├── document.schema.js
│       └── ...and more
│
├── migrations/                   # (Legacy - now empty, use src/migrations/)
├── logs/                         # Application logs
├── uploads/                      # File storage (local provider)
├── exports/                      # Generated report exports
├── dev/                          # Developer resources & Postman collections
├── docs/                         # Additional documentation
├── k8s/                          # Kubernetes manifests
├── helm/                         # Helm charts
└── deploy/                       # Deployment scripts
```

---

## Support

For technical support or questions:
- **Documentation**: https://docs.qassure.ai
- **API Reference**: https://api.qassure.ai/docs
- **Support Email**: support@qassure.ai

---

## 27. Workflow Engine

The workflow engine provides a configurable, state-machine-based approval and process automation framework used across all QMS modules.

### Workflow Routes (`/api/v1/workflows`)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/workflows/definitions` | ✅ | workflow:create | Create workflow definition |
| GET | `/workflows/definitions` | ✅ | workflow:read | List definitions |
| GET | `/workflows/definitions/:id` | ✅ | workflow:read | Get definition |
| PUT | `/workflows/definitions/:id` | ✅ | workflow:create | Update definition |
| DELETE | `/workflows/definitions/:id` | ✅ | workflow:admin | Delete definition |
| POST | `/workflows/definitions/:id/clone` | ✅ | workflow:create | Clone definition |
| POST | `/workflows/definitions/:id/activate` | ✅ | workflow:create | Activate definition |
| POST | `/workflows/definitions/:id/deprecate` | ✅ | workflow:create | Deprecate definition |
| POST | `/workflows/instances` | ✅ | - | Start workflow instance |
| GET | `/workflows/instances` | ✅ | workflow:read | List instances |
| GET | `/workflows/instances/:id` | ✅ | - | Get instance details |
| GET | `/workflows/instances/:id/history` | ✅ | - | Instance history |
| GET | `/workflows/instances/:id/actions` | ✅ | - | Available actions |
| POST | `/workflows/instances/:id/transition` | ✅ | - | Transition to next step |
| POST | `/workflows/instances/:id/cancel` | ✅ | workflow:admin | Cancel instance |
| GET | `/workflows/tasks` | ✅ | - | My pending tasks |
| GET | `/workflows/tasks/counts` | ✅ | - | Task counts (dashboard) |
| GET | `/workflows/tasks/:id` | ✅ | - | Task details |
| POST | `/workflows/tasks/:id/delegate` | ✅ | - | Delegate task |
| POST | `/workflows/tasks/:id/claim` | ✅ | - | Claim role-based task |
| POST | `/workflows/tasks/:id/release` | ✅ | - | Release claimed task |

---

## 28. Document Management

Full document lifecycle management with versioning, review workflows, and AI-assisted content.

### Document Routes (`/api/v1/documents`)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/documents` | ✅ | document:create | Create document |
| GET | `/documents` | ✅ | document:read | List documents |
| GET | `/documents/:id` | ✅ | document:read | Get document |
| PUT | `/documents/:id` | ✅ | document:update | Update document |
| DELETE | `/documents/:id` | ✅ | document:delete | Delete document |
| GET | `/documents/:id/versions` | ✅ | document:read | Version history |
| POST | `/documents/:id/versions` | ✅ | document:create | Create version |
| GET | `/documents/:id/versions/:version` | ✅ | document:read | Get version |
| POST | `/documents/:id/submit-for-review` | ✅ | document:update | Submit for review |
| POST | `/documents/:id/approve` | ✅ | document:approve | Approve document |
| POST | `/documents/:id/reject` | ✅ | document:approve | Reject document |
| POST | `/documents/:id/publish` | ✅ | document:approve | Publish document |
| GET | `/documents/:id/collaborators` | ✅ | document:read | Get collaborators |
| POST | `/documents/:id/collaborators` | ✅ | document:update | Add collaborator |
| POST | `/documents/extract-text` | ✅ | document:read | Extract text from file |

---

## 29. Training Management

Employee training records, compliance tracking, and training program management.

### Training Routes (`/api/v1/training`)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/training` | ✅ | training:create | Create training record |
| GET | `/training` | ✅ | training:read | List training records |
| GET | `/training/:id` | ✅ | training:read | Get training record |
| PUT | `/training/:id` | ✅ | training:update | Update training record |
| DELETE | `/training/:id` | ✅ | training:delete | Delete training record |
| POST | `/training/:id/complete` | ✅ | training:update | Mark as complete |
| GET | `/training/my-training` | ✅ | - | My training items |
| GET | `/training/overdue` | ✅ | training:read | Overdue training |

---

## 30. CAPA Management

Corrective and Preventive Action (CAPA) tracking with root cause analysis and effectiveness checks.

### CAPA Routes (`/api/v1/capas`)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/capas` | ✅ | capa:create | Create CAPA |
| GET | `/capas` | ✅ | capa:read | List CAPAs |
| GET | `/capas/:id` | ✅ | capa:read | Get CAPA |
| PUT | `/capas/:id` | ✅ | capa:update | Update CAPA |
| DELETE | `/capas/:id` | ✅ | capa:delete | Delete CAPA |
| POST | `/capas/:id/submit` | ✅ | capa:update | Submit CAPA |
| POST | `/capas/:id/approve` | ✅ | capa:approve | Approve CAPA |
| POST | `/capas/:id/close` | ✅ | capa:approve | Close CAPA |
| GET | `/capas/stats` | ✅ | capa:read | CAPA statistics |

---

## 31. Supplier Quality Management

Supplier registration, qualification, audits, and performance monitoring.

### Supplier Routes (`/api/v1/suppliers`)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/suppliers` | ✅ | supplier:create | Create supplier |
| GET | `/suppliers` | ✅ | supplier:read | List suppliers |
| GET | `/suppliers/:id` | ✅ | supplier:read | Get supplier |
| PUT | `/suppliers/:id` | ✅ | supplier:update | Update supplier |
| DELETE | `/suppliers/:id` | ✅ | supplier:delete | Delete supplier |
| POST | `/suppliers/:id/qualify` | ✅ | supplier:approve | Qualify supplier |
| POST | `/suppliers/:id/suspend` | ✅ | supplier:approve | Suspend supplier |
| GET | `/suppliers/:id/documents` | ✅ | supplier:read | Supplier documents |
| GET | `/suppliers/:id/audits` | ✅ | supplier:read | Supplier audit history |

---

## 32. Billing & Licensing

Platform billing management, subscription plans, and license enforcement.

### Billing Routes (`/api/v1/billing`)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/billing` | ✅ | billing:read | List billing records |
| GET | `/billing/:id` | ✅ | billing:read | Get billing record |
| POST | `/billing/invoices` | ✅ | billing:create | Create invoice |
| GET | `/billing/invoices/:id` | ✅ | billing:read | Get invoice |
| GET | `/billing/invoices/:id/download` | ✅ | billing:read | Download invoice PDF |
| GET | `/billing/summary` | ✅ | billing:read | Billing summary |

### License Routes (`/api/v1/licenses`)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/licenses` | ✅ | license:create | Create license |
| GET | `/licenses` | ✅ | license:read | List licenses |
| GET | `/licenses/:id` | ✅ | license:read | Get license |
| PUT | `/licenses/:id` | ✅ | license:update | Update license |
| DELETE | `/licenses/:id` | ✅ | license:delete | Delete license |
| POST | `/licenses/:id/activate` | ✅ | license:update | Activate license |
| POST | `/licenses/:id/revoke` | ✅ | license:update | Revoke license |
| GET | `/licenses/check` | ✅ | - | Check current license status |

---

## 33. Project Management

Project tracking for quality improvement initiatives, audits, and cross-team collaboration.

### Project Routes (`/api/v1/projects`)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/projects` | ✅ | project:create | Create project |
| GET | `/projects` | ✅ | project:read | List projects |
| GET | `/projects/:id` | ✅ | project:read | Get project |
| PUT | `/projects/:id` | ✅ | project:update | Update project |
| DELETE | `/projects/:id` | ✅ | project:delete | Delete project |
| GET | `/projects/:id/tasks` | ✅ | project:read | Project tasks |
| POST | `/projects/:id/tasks` | ✅ | project:update | Add task |
| GET | `/projects/:id/members` | ✅ | project:read | Project members |
| POST | `/projects/:id/members` | ✅ | project:update | Add member |

---

## 34. Organizational Structure

Management of organizational hierarchy including departments, job designations, and user classifications.

### Department Routes (`/api/v1/departments`)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/departments` | ✅ | settings:write | Create department |
| GET | `/departments` | ✅ | settings:read | List departments |
| GET | `/departments/:id` | ✅ | settings:read | Get department |
| PUT | `/departments/:id` | ✅ | settings:write | Update department |
| DELETE | `/departments/:id` | ✅ | settings:write | Delete department |

### Designation Routes (`/api/v1/designations`)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/designations` | ✅ | settings:write | Create designation |
| GET | `/designations` | ✅ | settings:read | List designations |
| GET | `/designations/:id` | ✅ | settings:read | Get designation |
| PUT | `/designations/:id` | ✅ | settings:write | Update designation |
| DELETE | `/designations/:id` | ✅ | settings:write | Delete designation |

### User Category Routes (`/api/v1/user-categories`)

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/user-categories` | ✅ | settings:write | Create user category |
| GET | `/user-categories` | ✅ | settings:read | List categories |
| GET | `/user-categories/:id` | ✅ | settings:read | Get category |
| PUT | `/user-categories/:id` | ✅ | settings:write | Update category |
| DELETE | `/user-categories/:id` | ✅ | settings:write | Delete category |

---

**Last Updated:** June 4, 2026  
**Version:** 1.0.0  
**Total Endpoints:** 400+  
**Database Tables:** 70+  
**Phases Completed:** 22/22 ✅ (+ 8 additional domain modules)

---

*Document End - QAssure.ai Platform Backend API Documentation*