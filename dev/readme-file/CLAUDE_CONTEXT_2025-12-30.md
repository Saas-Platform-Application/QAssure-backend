# QAssure Platform - Complete Development Context
**Last Updated:** December 30, 2025  
**Document Version:** 3.0 (Verified)  
**Purpose:** Complete context for Claude to continue development seamlessly across sessions.

---

# QUICK REFERENCE

| Metric | Count |
|--------|-------|
| Controllers | 31 files |
| Services | 33 files |
| Routes | 29 files |
| Migrations | 26 files (22 .js + 4 .sql) |
| Middleware | 7 files |
| Database Tables | 30 |
| Registered Routes | 25 |
| Permissions | 35 |
| API Endpoints | 130+ |
| Phases Completed | 11 of 22 (50%) |

---

# TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Project Location & Structure](#2-project-location--structure)
3. [Technology Stack](#3-technology-stack)
4. [Completed Phases Detail](#4-completed-phases-detail)
5. [Database Schema (Actual Tables)](#5-database-schema-actual-tables)
6. [All Files (Verified)](#6-all-files-verified)
7. [API Endpoints Reference](#7-api-endpoints-reference)
8. [Architecture](#8-architecture)
9. [Configuration](#9-configuration)
10. [Test Data & Credentials](#10-test-data--credentials)
11. [Known Issues & Fixes](#11-known-issues--fixes)
12. [Remaining Phases (13-22)](#12-remaining-phases-13-22)
13. [Development Conventions](#13-development-conventions)
14. [Quick Start Commands](#14-quick-start-commands)

---

# 1. PROJECT OVERVIEW

## What is QAssure?

QAssure is an **enterprise-grade Quality Management System (QMS) platform** designed for pharmaceutical and life sciences companies requiring FDA 21 CFR Part 11 compliance.

## Core Features:
- **Multi-tenant Architecture** - Complete data isolation per organization
- **Role-Based Access Control (RBAC)** - Fine-grained permissions (35 permissions)
- **Module System** - 8-state lifecycle for pluggable modules
- **AI Gateway** - OpenAI, Anthropic integration
- **RAG System** - Vector-based knowledge search
- **QMS Integration** - Veeva, MasterControl, Arena PLM, TrackWise, ETQ
- **Event-Driven Architecture** - Kafka for cross-module communication
- **Webhooks** - External system notifications with HMAC signing

## Business Context:
- Target: Pharmaceutical, Biotech, Medical Device companies
- Compliance: FDA 21 CFR Part 11, EU Annex 11, ISO 13485
- Deployment: Cloud SaaS or On-premise

---

# 2. PROJECT LOCATION & STRUCTURE

## Root Path:
```
/Users/yasha/Desktop/QAssure-Details/QAssure-Documents-Team/Latest-Code-Base/QAssure-Project/
```

## Verified Directory Structure:
```
QAssure-Project/
├── app.js                          # Express app configuration
├── server.js                       # Entry point
├── package.json
├── .env                            # Environment configuration
├── docker-compose.yml              # Kafka, Zookeeper
├── README.md                       # API documentation
├── CLAUDE_CONTEXT_2025-12-30.md    # This file
├── QAssure_API_Collection_2025-12-30.postman_collection.json
│
├── src/
│   ├── config/
│   │   ├── database.js             # PostgreSQL connection
│   │   ├── redis.js                # Redis client
│   │   └── kafka.js                # Kafka configuration
│   │
│   ├── controllers/                # 31 files
│   ├── services/                   # 33 files
│   ├── routes/                     # 29 files
│   ├── middleware/                 # 7 files
│   ├── infrastructure/             # 23 files across subdirs
│   ├── migrations/                 # 26 files (22 .js + 4 .sql)
│   └── validation/                 # Joi schemas
│
└── deploy/                         # Deployment configs
```

---

# 3. TECHNOLOGY STACK

## Backend:
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18.x | Runtime |
| Express.js | 4.x | Web framework |
| PostgreSQL | 15.x | Primary database |
| Redis | 7.x | Caching, sessions |
| Kafka | 7.5 | Event streaming |
| Sequelize | - | ORM for migrations |
| Joi | 17.x | Validation |
| JWT | - | Authentication |
| bcrypt | - | Password hashing |

## AI Providers:
| Provider | Status |
|----------|--------|
| OpenAI (GPT-4, GPT-3.5) | ✅ Integrated |
| Anthropic (Claude) | ✅ Integrated |

## QMS Systems Supported:
| System | Status |
|--------|--------|
| Veeva Vault | ✅ Framework ready |
| MasterControl | ✅ Framework ready |
| Arena PLM | ✅ Framework ready |
| TrackWise | ✅ Framework ready |
| ETQ Reliance | ✅ Framework ready |

---

# 4. COMPLETED PHASES DETAIL

## Phase 1-2: Core Infrastructure & Redis ✅
- Express.js setup
- PostgreSQL connection
- Redis caching
- Error handling
- Request logging
- Correlation IDs

## Phase 3: Authentication & IAM ✅
**14 Endpoints:**
```
POST   /auth/register
POST   /auth/verify-email
POST   /auth/resend-verification
POST   /auth/login
POST   /auth/refresh
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/change-password
POST   /auth/logout
POST   /auth/logout-all
GET    /auth/me
GET    /auth/sessions
DELETE /auth/sessions/:sessionId
POST   /auth/validate
```

**Key Files:**
- `src/controllers/auth.controller.js`
- `src/services/auth.service.js`
- `src/middleware/auth.middleware.js`
- `src/infrastructure/auth/jwt.service.js`
- `src/infrastructure/auth/permission.service.js`

## Phase 4: Health & Observability ✅
**3 Endpoints (no auth):**
```
GET /health
GET /health/detailed
GET /metrics
```

**Key Files:**
- `src/infrastructure/metrics/prometheus.service.js`

## Phase 5: Module Registry ✅
**16 Endpoints:**
```
GET    /modules
GET    /modules/stats
GET    /modules/states
GET    /modules/:id
POST   /modules
PUT    /modules/:id
DELETE /modules/:id
PATCH  /modules/:id/status
POST   /modules/:id/start
POST   /modules/:id/stop
POST   /modules/:id/restart
POST   /modules/:id/maintenance
POST   /modules/:id/deprecate
PATCH  /modules/:id/version
POST   /modules/:id/health-check
GET    /modules/:id/health-history
```

**Module States (8):**
```
pending → starting → running → stopping → stopped
                ↓         ↓
             failed   maintenance → deprecated
```

## Phase 6: Kafka Event System ✅
**Key Files:**
- `src/infrastructure/kafka/producer.service.js`
- `src/infrastructure/kafka/consumer.service.js`
- `src/infrastructure/kafka/event.service.js`
- `src/infrastructure/kafka/events.js`

**Configuration:**
```env
KAFKA_BROKERS=localhost:29092  # IMPORTANT: Use 29092 for external
```

## Phase 7: AI Gateway ✅
**9 Endpoints:**
```
GET    /ai/providers
GET    /ai/providers/:provider/health
GET    /ai/models
GET    /ai/health
POST   /ai/completions
GET    /ai/completions
GET    /ai/completions/:id
GET    /ai/costs
POST   /ai/playground
```

**Key Files:**
- `src/infrastructure/ai/gateway.service.js`
- `src/infrastructure/ai/openai.provider.js`
- `src/infrastructure/ai/anthropic.provider.js`
- `src/infrastructure/ai/base-provider.js`

## Phase 8: RAG & Knowledge Base ✅
**12 Endpoints:**
```
POST   /ai/knowledge/collections
GET    /ai/knowledge/collections
GET    /ai/knowledge/collections/:id
PUT    /ai/knowledge/collections/:id
DELETE /ai/knowledge/collections/:id
GET    /ai/knowledge/collections/:id/documents
POST   /ai/knowledge/documents
GET    /ai/knowledge/documents/:id/status
DELETE /ai/knowledge/documents/:id
POST   /ai/knowledge/search
POST   /ai/knowledge/search/context
GET    /ai/knowledge/stats
```

**Key Files:**
- `src/infrastructure/ai/vector-store.service.js`
- `src/infrastructure/ai/embedding.service.js`
- `src/infrastructure/ai/chunker.service.js`
- `src/infrastructure/ai/document.processor.js`
- `src/services/knowledge.service.js`
- `src/controllers/knowledge.controller.js`

## Phase 9: Prompt Management ✅
**10 Endpoints:**
```
POST   /ai/prompts
GET    /ai/prompts
GET    /ai/prompts/:id
PUT    /ai/prompts/:id
DELETE /ai/prompts/:id
GET    /ai/prompts/:id/versions
POST   /ai/prompts/:id/versions/:version/activate
POST   /ai/prompts/:id/test
POST   /ai/prompts/:id/execute
POST   /ai/prompts/:id/clone
```

**Key Files:**
- `src/services/prompt.service.js`
- `src/controllers/prompt.controller.js`

## Phase 10: QMS Integration Framework ✅
**20 Endpoints:**
```
GET    /qms/supported
GET    /qms/supported/:system
POST   /qms/connections
GET    /qms/connections
GET    /qms/connections/:id
PUT    /qms/connections/:id
DELETE /qms/connections/:id
POST   /qms/connections/:id/test
GET    /qms/connections/:id/fields/:entityType
GET    /qms/connections/:id/mappings
PUT    /qms/connections/:id/mappings/:entityType
GET    /qms/connections/:id/sync-config
PUT    /qms/connections/:id/sync-config
POST   /qms/connections/:id/sync
GET    /qms/connections/:id/sync/status
GET    /qms/connections/:id/sync/history
GET    /qms/connections/:id/sync/errors
GET    /qms/sync/jobs/:jobId
POST   /qms/sync/jobs/:jobId/cancel
POST   /qms/conflicts/:id/resolve
```

**Key Files:**
- `src/infrastructure/qms/base-adapter.js`
- `src/services/qms-connection.service.js`
- `src/services/qms-sync.service.js`

## Phase 11: QMS Adapters ⏸️ PENDING
**Status:** Waiting for client API credentials

## Phase 12: Cross-Module Communication ✅
**15 Endpoints:**

Event Subscriptions (7):
```
POST   /events/subscriptions
GET    /events/subscriptions
GET    /events/subscriptions/:id
PUT    /events/subscriptions/:id
DELETE /events/subscriptions/:id
POST   /events/subscriptions/:id/pause
POST   /events/subscriptions/:id/resume
```

Webhooks (8):
```
POST   /webhooks
GET    /webhooks
GET    /webhooks/:id
PUT    /webhooks/:id
DELETE /webhooks/:id
POST   /webhooks/:id/test
POST   /webhooks/:id/regenerate-secret
GET    /webhooks/:id/deliveries
```

**Key Files:**
- `src/services/event-subscription.service.js`
- `src/services/webhook.service.js`
- `src/infrastructure/events/event-router.js`
- `src/controllers/event-subscription.controller.js`
- `src/controllers/webhook.controller.js`

---

# 5. DATABASE SCHEMA (ACTUAL TABLES)

## Total Tables: 30 (Verified)
```sql
-- Core Identity
users
tenants
roles
permissions
user_roles
user_tenants
sessions
api_keys
api_key_permissions

-- Modules
modules

-- Audit & Events
audit_logs
event_logs
health_checks
health_history

-- AI
ai_completions
ai_usage
ai_prompt_templates
ai_prompt_versions
ai_prompt_test_cases
ai_prompt_test_results

-- Knowledge/RAG
knowledge_collections
knowledge_documents

-- QMS Integration
qms_connections
qms_entity_mappings
qms_sync_jobs
qms_sync_conflicts

-- Cross-Module Communication
event_subscriptions
webhooks
webhook_deliveries

-- System
SequelizeMeta
```

---

# 6. ALL FILES (VERIFIED)

## Controllers (31 files):
```
src/controllers/
├── auth.controller.js
├── user_controller.js
├── tenant_controller.js
├── role_controller.js
├── permission_controller.js
├── user_role_controller.js
├── user_tenant_controller.js
├── session_controller.js
├── api_key_controller.js
├── api_key_permission_controller.js
├── module_controller.js
├── module.controller.js
├── audit_log_controller.js
├── event_log_controller.js
├── health_check_controller.js
├── health_history_controller.js
├── ai.controller.js
├── knowledge.controller.js
├── prompt.controller.js
├── qms_connection_controller.js
├── qms_entity_mapping_controller.js
├── qms_sync_job_controller.js
├── qms_sync_conflict_controller.js
├── qms.controller.js
├── qms-connection.controller.js
├── qms-sync.controller.js
├── event-subscription.controller.js
└── webhook.controller.js
(+ 3 more)
```

## Services (33 files):
```
src/services/
├── auth.service.js
├── user_service.js
├── tenant_service.js
├── role_service.js
├── permission_service.js
├── user_role_service.js
├── user_tenant_service.js
├── session_service.js
├── api_key_service.js
├── api_key.service.js
├── module_service.js
├── module.service.js
├── audit_log_service.js
├── audit.service.js
├── event_log_service.js
├── health_check_service.js
├── ai.service.js
├── ai_completion_service.js
├── ai_usage_service.js
├── ai_prompt_template_service.js
├── knowledge.service.js
├── prompt.service.js
├── qms_connection_service.js
├── qms_entity_mapping_service.js
├── qms_sync_job_service.js
├── qms_sync_conflict_service.js
├── qms-connection.service.js
├── qms-sync.service.js
├── event-subscription.service.js
├── event-router.service.js
└── webhook.service.js
(+ 2 more)
```

## Infrastructure (23 files):
```
src/infrastructure/
├── index.js
├── ai/
│   ├── index.js
│   ├── gateway.service.js
│   ├── openai.provider.js
│   ├── anthropic.provider.js
│   ├── base-provider.js
│   ├── vector-store.service.js
│   ├── embedding.service.js
│   ├── chunker.service.js
│   └── document.processor.js
├── auth/
│   ├── index.js
│   ├── jwt.service.js
│   └── permission.service.js
├── cache/
│   └── redis.service.js
├── email/
│   └── email.service.js
├── events/
│   └── event-router.js
├── kafka/
│   ├── index.js
│   ├── producer.service.js
│   ├── consumer.service.js
│   ├── event.service.js
│   └── events.js
├── metrics/
│   └── prometheus.service.js
└── qms/
    └── base-adapter.js
```

## Middleware (7 files):
```
src/middleware/
├── auth.middleware.js
├── authentication_middleware.js
├── correlation.middleware.js
├── index.js
├── metrics.middleware.js
├── tenant.middleware.js
└── validationMiddleware.js
```

## Routes Registered (25):
```javascript
// From src/routes/index.js
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tenants', tenantRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/user-roles', userRoleRoutes);
router.use('/user-tenants', userTenantRoutes);
router.use('/sessions', sessionRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/api-key-permissions', apiKeyPermissionRoutes);
router.use('/modules', moduleRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/event-logs', eventLogRoutes);
router.use('/health-checks', healthCheckRoutes);
router.use('/health-history', healthHistoryRoutes);
router.use('/qms/connections', qmsConnectionRoutes);
router.use('/qms/sync-jobs', qmsSyncJobRoutes);
router.use('/qms/sync-conflicts', qmsSyncConflictRoutes);
router.use('/qms/entity-mappings', qmsEntityMappingRoutes);
router.use('/ai/knowledge', knowledgeRoutes);   // MUST be before /ai
router.use('/ai/prompts', promptRoutes);         // MUST be before /ai
router.use('/ai', aiRoutes);
router.use('/qms', qmsRoutes);
router.use('/events/subscriptions', eventSubscriptionRoutes);
router.use('/webhooks', webhookRoutes);
```

## Migrations (26 files):
```
src/migrations/
├── 001_create_modules_table.js
├── 002_create_users_table.js
├── 003_create_tenants_table.js
├── 004_create_user_tenants_table.js
├── 005_create_roles_table.js
├── 006_create_permissions_table.js
├── 007_create_user_roles_table.js
├── 008_create_api_keys_table.js
├── 009_create_api_key_permissions_table.js
├── 010_create_sessions_table.js
├── 011_create_audit_logs_table.js
├── 012_create_health_checks_table.js
├── 013_create_health_history_table.js
├── 014_create_qms_connections_table.js
├── 015_create_qms_sync_jobs_table.js
├── 016_create_qms_sync_conflicts_table.js
├── 017_create_qms_entity_mappings_table.js
├── 018_create_ai_completions_table.js
├── 019_create_ai_usage_table.js
├── 020_create_ai_prompt_templates_table.js
├── 021_create_event_logs_table.js
├── 022_add_foreign_keys.js
├── migrate.js
├── create_knowledge_tables.sql
├── create_prompt_versions_table.sql
├── create_qms_tables.sql
└── phase12_event_subscriptions_webhooks.sql
```

---

# 7. API ENDPOINTS REFERENCE

## Summary by Category:

| Category | Count | Auth |
|----------|-------|------|
| Health & Metrics | 3 | ❌ |
| Authentication | 14 | Partial |
| Users | 5 | ✅ |
| Tenants | 5 | ✅ |
| Roles | 5 | ✅ |
| Permissions | 5 | ✅ |
| User-Roles | 5 | ✅ |
| User-Tenants | 5 | ✅ |
| Sessions | 5 | ✅ |
| API Keys | 8 | ✅ |
| Modules | 16 | ✅ |
| Audit Logs | 5 | ✅ |
| Event Logs | 5 | ✅ |
| Health Checks | 5 | ✅ |
| Health History | 5 | ✅ |
| AI Gateway | 9 | ✅ |
| Knowledge/RAG | 12 | ✅ |
| Prompts | 10 | ✅ |
| QMS Integration | 20 | ✅ |
| Event Subscriptions | 7 | ✅ |
| Webhooks | 8 | ✅ |
| **TOTAL** | **~157** | |

---

# 8. ARCHITECTURE

## Current State: Modular Monolith
```
┌─────────────────────────────────────────────────────────────────┐
│                 QAssure Platform Core (This Project)             │
├─────────────────────────────────────────────────────────────────┤
│  Auth/IAM │ AI Gateway │ QMS Connect │ Events │ Webhooks        │
│  Modules  │ RAG/Knowledge │ Prompts │ Audit │ Health            │
└─────────────────────────────────────────────────────────────────┘
        │           │           │           │
        ▼           ▼           ▼           ▼
   PostgreSQL    Redis       Kafka      Pinecone
```

## Target State: Microservices with Kong (Phase 21)
```
Client → Kong API Gateway → Platform Core
                         → AiCE Module (CAPA)
                         → AiCH Module (Change Control)
                         → AiTM Module (Training)
                         → etc.
```

---

# 9. CONFIGURATION

## Environment Variables (.env):
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/qassure_dev
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:29092
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Docker Services:
```bash
# Start Kafka & Zookeeper
docker-compose up -d zookeeper kafka
```

---

# 10. TEST DATA & CREDENTIALS

## Default Super Admin:
```
Email: superadmin@qassure.ai
Password: Password123!
User ID: c6e8eed6-c388-41f4-9223-24532fb1101f
```

## Default Tenant:
```
ID: 00000000-0000-0000-0000-000000000001
Name: Default Tenant
```

## Role IDs:
```
Super Admin: 01b4448d-f24e-49c6-b273-d12af933fbbd
Tenant Admin: d4cdacbd-e355-4541-99b8-ef4f80e8a6ae
Quality Manager: 049b1cbe-46f3-4218-b588-82645a196795
Viewer: 84bd26b2-3970-4bf6-974e-d1d981618146
```

---

# 11. KNOWN ISSUES & FIXES

## Issue 1: Kafka Connection
**Error:** `getaddrinfo ENOTFOUND kafka`
**Fix:** `KAFKA_BROKERS=localhost:29092`

## Issue 2: Route 404 for /ai/knowledge/*
**Fix:** In `src/routes/index.js`, register `/ai/knowledge` and `/ai/prompts` BEFORE `/ai`

## Issue 3: Webhook HMAC Fails
**Fix:** Added `secret: row.secret` to `_formatWebhook()` in `webhook.service.js`

---

# 12. REMAINING PHASES (13-22)

## Phase 13: Security & FDA Part 11 (NEXT) - 3 days
- Electronic signatures
- Enhanced audit trails
- Access reviews
- Password policies

## Phase 14: Advanced Analytics - 3 days
- Dashboards
- Reports
- KPIs

## Phase 15: Notification System - 2 days
- Email/SMS
- Push notifications
- Templates

## Phase 16: Workflow Engine - 4 days
- State machines
- Approval chains
- Escalation

## Phase 17: Document Management - 3 days
- Versioning
- Check-in/out
- Templates

## Phase 18: Training Management - 2 days
- Assignments
- Certifications
- Training matrix

## Phase 19: CAPA Module - 3 days
- CAPA workflow
- Root cause analysis
- Effectiveness

## Phase 20: Change Control - 3 days
- Change requests
- Impact analysis
- Implementation

## Phase 21: API Gateway (Kong) - 2 days
- Service routing
- Rate limiting
- Load balancing

## Phase 22: Deployment & CI/CD - 2 days
- Docker/K8s
- GitHub Actions
- Helm charts

---

# 13. DEVELOPMENT CONVENTIONS

## Permission Format:
`resource:action` (e.g., `users:read`, `modules:create`)

## API Response:
```json
{"success": true, "data": {...}, "pagination": {...}}
```

## Error Response:
```json
{"success": false, "error": {"code": "ERROR_CODE", "message": "..."}}
```

---

# 14. QUICK START COMMANDS
```bash
# Start services
brew services start redis
docker-compose up -d zookeeper kafka
npm run dev

# Get token
export TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@qassure.ai", "password": "Password123!"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")

# Test
curl http://localhost:3000/api/v1/health
curl -s http://localhost:3000/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```

---

# NEXT STEPS: Phase 13

When starting Phase 13, create:
1. `src/migrations/027_electronic_signatures.sql`
2. `src/services/electronic-signature.service.js`
3. `src/controllers/electronic-signature.controller.js`
4. `src/routes/electronic-signature.routes.js`
5. Update `src/routes/index.js`

---

**END OF CONTEXT DOCUMENT**
**Version:** 3.0 (Verified December 30, 2025)
