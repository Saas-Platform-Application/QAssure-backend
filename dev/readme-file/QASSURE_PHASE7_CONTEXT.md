# QAssure Platform - Phase 7 Context Document
**Last Updated:** December 25, 2025
**Session:** Phase 6-7 Completion (Kafka + AI Gateway)
**Project Location:** `/Users/yasha/Desktop/QAssure-Details/QAssure-Documents-Team/Latest-Code-Base/QAssure-Project`

---

## 📊 Overall Progress

| Phase | Name | Status | Time Spent |
|-------|------|--------|------------|
| 1 | Core Infrastructure (DB, JWT, RBAC, Multi-tenancy) | ✅ Complete | ~2 hrs |
| 2 | Redis & Sessions | ✅ Complete | ~30 min |
| 3 | Complete IAM (Registration, Password, API Keys) | ✅ Complete | ~45 min |
| 4 | Health & Observability (Prometheus, Audit, Correlation) | ✅ Complete | ~30 min |
| 5 | Module Registry & Lifecycle | ✅ Complete | ~30 min |
| 6 | Kafka Event System | ✅ Complete | ~45 min |
| 7 | AI Gateway (Multi-provider) | ✅ Complete | ~1 hr |
| 8 | RAG & Vector Database | ❌ Pending | Est. 2 hrs |
| 9 | Prompt Management | ❌ Pending | Est. 1 hr |
| 10 | QMS Integration Framework | ❌ Pending | Est. 2 hrs |
| 11 | QMS Adapters (Veeva, MasterControl) | ❌ Pending | Est. 3 hrs |
| 12 | Cross-Module Communication | ❌ Pending | Est. 1 hr |
| 13 | Security & FDA Part 11 Compliance | ❌ Pending | Est. 2 hrs |
| 14 | Audit System (7-year retention) | ❌ Pending | Est. 1 hr |
| 15 | Observability (ELK + Tracing) | ❌ Pending | Est. 2 hrs |
| 16 | Monitoring & Alerting | ❌ Pending | Est. 1 hr |
| 17 | Dashboard & Real-time APIs | ❌ Pending | Est. 2 hrs |
| 18 | WebSocket/SSE Server | ❌ Pending | Est. 1 hr |
| 19 | Reporting & Analytics Service | ❌ Pending | Est. 2 hrs |
| 20 | Notification Service | ❌ Pending | Est. 1.5 hrs |
| 21 | Kubernetes & Helm Charts | ❌ Pending | Est. 2 hrs |
| 22 | CI/CD Pipeline | ❌ Pending | Est. 2 hrs |

**Estimated Completion:** ~70% of core backend complete (7/22 phases)

---

## ✅ Phase 6: Kafka Event System - COMPLETE

### Docker Services Running
```bash
# Zookeeper
Container: qassure-zookeeper
Port: 2181
Status: HEALTHY

# Kafka
Container: qassure-kafka
Ports: 9092 (internal), 29092 (external)
Status: HEALTHY
```

### Kafka Topics Created
| Topic | Description |
|-------|-------------|
| `qassure.system.events` | System startup, shutdown, errors |
| `qassure.auth.events` | Login, logout, password changes |

### Files Created

#### Producer Service
**Location:** `src/infrastructure/kafka/producer.service.js`
- Singleton pattern with `getKafkaProducer()`
- Connection management with retry logic
- Methods: `connect()`, `disconnect()`, `publish()`, `publishBatch()`, `healthCheck()`
- Auto-adds metadata: timestamp, version, headers

#### Consumer Service
**Location:** `src/infrastructure/kafka/consumer.service.js`
- Singleton pattern with `getKafkaConsumer()`
- Consumer group management
- Methods: `subscribe()`, `subscribeToMany()`, `startConsuming()`, `pause()`, `resume()`
- Auto-reconnection on crash

#### Event Schemas
**Location:** `src/infrastructure/kafka/events.js`

**Topic Constants:**
- `qassure.auth.events` - Authentication events
- `qassure.user.events` - User lifecycle
- `qassure.tenant.events` - Tenant management
- `qassure.module.events` - Module lifecycle
- `qassure.apikey.events` - API key operations
- `qassure.audit.events` - Audit trail
- `qassure.system.events` - System events
- `qassure.ai.events` - AI Gateway (future)

**Event Types (60+ defined):**
- Auth: login.success, login.failed, logout, logout.all, token.refresh, password.changed, etc.
- User: created, updated, deleted, activated, deactivated, role.assigned, etc.
- Tenant: created, updated, suspended
- Module: registered, started, stopped, failed, health.passed, etc.
- API Key: created, revoked, used
- System: startup, shutdown, error

**Event Builders:**
- `AuthEvents.*` - 9 builder functions
- `UserEvents.*` - 8 builder functions
- `TenantEvents.*` - 3 builder functions
- `ModuleEvents.*` - 8 builder functions
- `ApiKeyEvents.*` - 3 builder functions
- `SystemEvents.*` - 3 builder functions

#### Event Service
**Location:** `src/infrastructure/kafka/event.service.js`
- Unified interface wrapping producer/consumer
- Singleton pattern with `getEventService()`
- Publisher methods for all event types
- Subscriber methods for event consumption

#### Index Export
**Location:** `src/infrastructure/kafka/index.js`

### Integration Points
- **app.js**: Kafka initialization on startup, graceful shutdown
- **auth.service.js**: Events for login, logout, password changes

### Verification Commands
```bash
# List Kafka topics
docker exec qassure-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Read auth events
docker exec qassure-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic qassure.auth.events --from-beginning --max-messages 5

# Read system events
docker exec qassure-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic qassure.system.events --from-beginning --max-messages 5
```

---

## ✅ Phase 7: AI Gateway - COMPLETE

### Providers Configured
| Provider | Status | Default Model | Models Available |
|----------|--------|---------------|------------------|
| OpenAI | ✅ Enabled | gpt-4o-mini | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, gpt-3.5-turbo, gpt-3.5-turbo-16k |
| Anthropic | ✅ Enabled | claude-sonnet-4-20250514 | claude-sonnet-4-20250514, claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus, claude-3-sonnet, claude-3-haiku |

### Pricing (per 1K tokens)
| Model | Input | Output |
|-------|-------|--------|
| gpt-4o | $0.005 | $0.015 |
| gpt-4o-mini | $0.00015 | $0.0006 |
| gpt-4-turbo | $0.01 | $0.03 |
| claude-sonnet-4 | $0.003 | $0.015 |
| claude-3-5-haiku | $0.0008 | $0.004 |
| claude-3-opus | $0.015 | $0.075 |

### Files Created

#### Base Provider
**Location:** `src/infrastructure/ai/base-provider.js`
- Abstract base class for all providers
- Methods: `initialize()`, `healthCheck()`, `createCompletion()`, `createEmbedding()`
- Cost calculation with pricing tables
- Response formatting to standard structure

#### OpenAI Provider
**Location:** `src/infrastructure/ai/openai.provider.js`
- Full OpenAI API integration
- Chat completions (streaming & non-streaming)
- Embeddings support (text-embedding-3-small)
- Error handling with specific codes

#### Anthropic Provider
**Location:** `src/infrastructure/ai/anthropic.provider.js`
- Full Anthropic Claude API integration
- Message format conversion (OpenAI → Anthropic)
- Chat completions (streaming & non-streaming)
- Error handling with specific codes

#### Gateway Service
**Location:** `src/infrastructure/ai/gateway.service.js`
- Multi-provider orchestration
- Automatic fallback on provider failure
- Model routing (finds correct provider for model)
- Health checks across all providers
- Cost estimation

#### AI Service
**Location:** `src/services/ai.service.js`
- Business logic layer
- Usage tracking in database
- Completion history
- Cost summaries by provider/model/tenant
- Audit logging integration

#### AI Controller
**Location:** `src/controllers/ai.controller.js`
- HTTP handlers for all AI endpoints
- Input validation
- Error response formatting

#### AI Routes
**Location:** `src/routes/ai.routes.js`
- All routes require authentication
- Permission-based access control

### API Endpoints
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/v1/ai/providers` | List configured providers | ai:read |
| GET | `/api/v1/ai/providers/:provider/health` | Provider health check | ai:read |
| GET | `/api/v1/ai/models` | List all models with pricing | ai:read |
| GET | `/api/v1/ai/health` | Gateway health status | ai:read |
| POST | `/api/v1/ai/completions` | Create completion | ai:create |
| GET | `/api/v1/ai/completions` | List completions (paginated) | ai:read |
| GET | `/api/v1/ai/completions/:id` | Get completion by ID | ai:read |
| GET | `/api/v1/ai/costs` | Cost summary | ai:read |
| POST | `/api/v1/ai/playground` | Test prompts (no tracking) | ai:create |

### Environment Variables Required
```env
# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
```

### Test Commands
```bash
# Get token
export TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@qassure.ai", "password": "Password123!"}' | sed 's/.*"access_token":"\([^"]*\)".*/\1/')

# List providers
curl -s http://localhost:3000/api/v1/ai/providers \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# List models
curl -s http://localhost:3000/api/v1/ai/models \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Create completion (requires valid API keys)
curl -s -X POST http://localhost:3000/api/v1/ai/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Say hello in 5 words"}],
    "model": "gpt-4o-mini",
    "max_tokens": 50
  }' | python3 -m json.tool

# Get cost summary
curl -s http://localhost:3000/api/v1/ai/costs \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

---

## 📁 Project Structure (Current)
```
QAssure-Project/
├── app.js                              # Express app + Kafka init
├── server.js                           # Server entry point
├── package.json
├── .env
├── .env.example
├── .gitignore
├── .dockerignore
├── Dockerfile
├── docker-compose.yml                  # Full stack (API, DB, Redis, Kafka, monitoring)
├── DEPLOYMENT_GUIDE.md                 # DevOps documentation
├── QASSURE_PHASE7_CONTEXT.md          # This file
├── README.md
│
├── deploy/
│   ├── prometheus/
│   │   └── prometheus.yml
│   └── grafana/
│       └── provisioning/
│           └── datasources/
│               └── datasources.yml
│
└── src/
    ├── config/
    │   ├── config.js
    │   ├── database.js
    │   └── logger.js
    │
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── api_key.controller.js
    │   ├── module.controller.js
    │   ├── ai.controller.js            # ✅ NEW (Phase 7)
    │   └── ... (other controllers)
    │
    ├── infrastructure/
    │   ├── auth/
    │   │   ├── jwt.service.js
    │   │   ├── permission.service.js
    │   │   └── index.js
    │   │
    │   ├── cache/
    │   │   └── redis.service.js
    │   │
    │   ├── email/
    │   │   └── email.service.js
    │   │
    │   ├── metrics/
    │   │   └── prometheus.service.js
    │   │
    │   ├── kafka/                       # ✅ NEW (Phase 6)
    │   │   ├── producer.service.js
    │   │   ├── consumer.service.js
    │   │   ├── events.js
    │   │   ├── event.service.js
    │   │   └── index.js
    │   │
    │   ├── ai/                          # ✅ NEW (Phase 7)
    │   │   ├── base-provider.js
    │   │   ├── openai.provider.js
    │   │   ├── anthropic.provider.js
    │   │   ├── gateway.service.js
    │   │   └── index.js
    │   │
    │   └── index.js
    │
    ├── middleware/
    │   ├── auth.middleware.js
    │   ├── tenant.middleware.js
    │   ├── correlation.middleware.js
    │   └── metrics.middleware.js
    │
    ├── routes/
    │   ├── index.js
    │   ├── auth.routes.js
    │   ├── api_key_routes.js
    │   ├── module_routes.js
    │   ├── ai.routes.js                 # ✅ NEW (Phase 7)
    │   └── ... (other routes)
    │
    ├── services/
    │   ├── auth.service.js              # ✅ UPDATED (Kafka events)
    │   ├── api_key.service.js
    │   ├── audit.service.js
    │   ├── module.service.js
    │   ├── ai.service.js                # ✅ NEW (Phase 7)
    │   └── ... (other services)
    │
    └── models/
        └── ... (22 models)
```

---

## 🖥️ Running the Application

### Prerequisites
```bash
# PostgreSQL running on localhost:5432
psql -h localhost -U postgres -c "SELECT 1"

# Redis running on localhost:6379
redis-cli ping

# Kafka running (via Docker)
docker ps | grep kafka
```

### Start All Services
```bash
# Start Kafka stack (if not running)
docker-compose up -d zookeeper kafka

# Start the API server
npm run dev
```

### Expected Console Output
```
[KafkaProducer] ✅ Connected to Kafka brokers: localhost:29092
[EventService] ✅ Initialized successfully
✅ Database connected
[KafkaProducer] Published to qassure.system.events: system.startup
[Kafka] ✅ Event service initialized
[Redis] ✅ Connected successfully
[Redis] ✅ Ready to accept commands
✅ Redis connected successfully
[PermissionService] Redis caching enabled
[AuthService] Redis session caching enabled
🚀 Server is running on 0.0.0.0:3000
📍 Environment: development
🌐 API prefix: /api/v1
```

---

## 🧪 Test Credentials

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| superadmin@qassure.ai | Password123! | super_admin | *:* (all) |
| admin@qassure.ai | Password123! | tenant_admin | tenant admin |
| manager@qassure.ai | Password123! | quality_manager | QMS access |
| viewer@qassure.ai | Password123! | viewer | Read only |
| testuser@qassure.ai | NewPass456! | viewer | Read only |

---

## 📝 Notes for Next Session

### Phase 8: RAG & Vector Database

1. **Install Packages:**
```bash
   npm install @pinecone-database/pinecone chromadb pdf-parse mammoth
```

2. **Components to Build:**
   - Vector database service (Pinecone/ChromaDB)
   - Document processor (PDF, DOCX extraction)
   - Embedding service (using OpenAI embeddings)
   - Knowledge base management
   - Semantic search

3. **API Endpoints:**
   - `GET /api/v1/ai/knowledge/collections` - List collections
   - `POST /api/v1/ai/knowledge/collections` - Create collection
   - `POST /api/v1/ai/knowledge/documents` - Upload document
   - `GET /api/v1/ai/knowledge/documents/:id/status` - Processing status
   - `POST /api/v1/ai/knowledge/search` - Semantic search

### Phase 9: Prompt Management

1. **Components to Build:**
   - Prompt template CRUD
   - Version management
   - Prompt testing
   - A/B testing support

2. **API Endpoints:**
   - `GET/POST /api/v1/ai/prompts` - CRUD
   - `GET /api/v1/ai/prompts/:id/versions` - Version history
   - `POST /api/v1/ai/prompts/:id/test` - Test prompt

---

## 🔗 Related Documents

- `QASSURE_FINAL_ROADMAP_V3.md` - Full 22-phase roadmap
- `QASSURE_API_ENDPOINTS_SPECIFICATION.md` - API specs
- `QASSURE_IAM_SPECIFICATION.md` - IAM details
- `QASSURE_PHASE2_CONTEXT.md` - Previous context document
- `DEPLOYMENT_GUIDE.md` - DevOps documentation

---

## 📋 Git Commit Summary
```
Phase 6-7: Kafka Event System + AI Gateway

Phase 6 - Kafka Events:
- Kafka producer/consumer services
- Event schemas for auth, user, tenant, module, system events
- Event service with publish helpers
- Integrated with auth service for login/logout events
- Docker Compose with Zookeeper + Kafka
- Topics: qassure.system.events, qassure.auth.events

Phase 7 - AI Gateway:
- Multi-provider support (OpenAI + Anthropic)
- Base provider class with cost calculation
- Gateway service with automatic fallback
- AI service with usage tracking
- 9 API endpoints: providers, models, completions, costs, playground
- Database integration for completion tracking
- Kafka events for AI completions
```

---

**End of Context Document**
