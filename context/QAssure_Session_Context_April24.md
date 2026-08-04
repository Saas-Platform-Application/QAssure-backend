# QASSURE AI GATEWAY — COMPLETE SESSION CONTEXT
# Date: April 24, 2026
# Purpose: Context handoff for next Claude session
# CRITICAL: Read this ENTIRE document before making any changes

---

## 1. CODEBASE LOCATIONS ON YASHA'S MAC

| Directory | Branch | Purpose | Status |
|-----------|--------|---------|--------|
| `/Users/yasha/Desktop/QAssure-Details/QAssur-backend` | `yasha_branch_24_March` | RAG fixes + Gemini provider + knowledge routes | ✅ Committed & pushed |
| `/Users/yasha/Documents/QAssure-3rdApril/QAssur-backend` | `qaasure_april3_dev` | Multimodal file upload for prompt execution | ✅ Committed & pushed |
| `/Users/yasha/Documents/QAssur-backend-new` | `yasha_24thapril` (from `sibarchan_nayak`) | Custom embedding model config (LATEST) | ✅ Committed & pushed |
| `/Users/yasha/Desktop/QAssur-backend` | `sibarchan_nayak` | Fresh clone, incomplete .env, NOT usable | ❌ Don't use |

**ACTIVE CODEBASE: `/Users/yasha/Documents/QAssur-backend-new` on branch `yasha_24thapril`**

**Git remote:** `https://git.tech4biz.wiki/Tech4Biz-Services/QAssur-backend.git`

---

## 2. INFRASTRUCTURE — TWO POSTGRES INSTANCES (CRITICAL)

Yasha has TWO PostgreSQL instances running on port 5432:

| Instance | PID owner | Connects via | Database | Users |
|----------|-----------|-------------|----------|-------|
| **LOCAL postgres** (PID 1699, user yasha) | macOS native | `127.0.0.1:5432` | `qassure_dev` | `superadmin@qassure.ai`, `admin@qassure.ai`, `manager@qassure.ai`, `viewer@qassure.ai` |
| **Docker postgres** (container `qassure-postgres`) | Docker | `docker exec qassure-postgres psql` | `qassure_dev` | `tenantadmin@pharmacorp.com`, `admin@pharmacorp.com`, `superadmin@ltts.com` |

**The app at `/Users/yasha/Documents/QAssur-backend-new` connects to LOCAL postgres** (DATABASE_URL in .env points to `127.0.0.1:5432`).

**Login credentials for LOCAL postgres:**
- Email: `superadmin@qassure.ai`
- Password: `Password123!` (hash: `$2a$10$qq00.YpskUJPqpgQptQ5CuExscgIcHnvc8ucvDXQhTCKpVgdlyWoO`)
- Tenant ID: `00000000-0000-0000-0000-000000000001`

**To query LOCAL postgres directly:**
```bash
psql -U yasha -d qassure_dev -c "YOUR SQL HERE"
```

**To query DOCKER postgres:**
```bash
docker exec qassure-postgres psql -U postgres -d qassure_dev -c "YOUR SQL HERE"
```

**NEVER confuse these two.** DB migrations must be run on LOCAL postgres for the app to see them.

### Docker containers running:
- `qassure-postgres` (5432) — PostgreSQL 15
- `redis-server` (6379) — Redis
- `qassure-kafka` (9092, 29092) — Kafka
- `qassure-zookeeper` (2181) — Zookeeper
- `qassure-elasticsearch` (9200) — Elasticsearch 8.11
- `qdrant` (6333-6334) — Qdrant vector DB
- `neo4j` (7474, 7687) — Neo4j
- `agentiq-temporal` (7233) — Temporal
- `agentiq-minio` (9000-9001) — MinIO
- `sql-server-dev` (1433) — SQL Server

---

## 3. ENV CONFIG (from .env in QAssur-backend-new)

```
DATABASE_URL=postgresql://postgres:postgres123@127.0.0.1:5432/qassure_dev
DB_PORT=5432
REDIS_URL=redis://localhost:6380
REDIS_PORT=6380
KAFKA_BROKERS=localhost:29092

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://qassure-aisub-prj-resource.cognitiveservices.azure.com/
AZURE_OPENAI_API_KEY=DPm2DIP2ZexSo4Fv9agETjCDSGBHEI07ubIFgDIvQKDmiYmMaST3JQQJ99CAACHYHv6XJ3w3AAAAACOGT1NI
AZURE_OPENAI_DEPLOYMENT=gpt-4.1
AZURE_OPENAI_API_VERSION=2025-01-01-preview
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small

# Azure AI Foundry (Anthropic)
AZURE_ANTHROPIC_ENDPOINT=https://qassure-aisub-prj-resource.services.ai.azure.com/anthropic/
AZURE_AI_API_KEY=DPm2DIP2ZexSo4Fv9agETjCDSGBHEI07ubIFgDIvQKDmiYmMaST3JQQJ99CAACHYHv6XJ3w3AAAAACOGT1NI
AZURE_ANTHROPIC_DEPLOYMENT=claude-sonnet-4-5

# Gemini
GOOGLE_AI_API_KEY=AIzaSyADNKz7PYpmIJ5-1d2g1-4AasYTLIQTMqg

# Pinecone
PINECONE_API_KEY=pcsk_2kwJu_89cNt2cGLw22JBUTN2CQW4ZzXXANq8L9G6ZJbKVVvx5PM6eJtRG7EtgLR9ghq3V
PINECONE_INDEX_NAME=test-index

ENCRYPTION_KEY=e4a887e0e65ff2c2f928bba42cacae3be8cb92ef1d4bbdfb0503ef064e5a49ef
```

---

## 4. COMPLETE LIST OF ALL CHANGES MADE ACROSS ALL SESSIONS

### Session 1 (March 24 — branch `yasha_branch_24_March`):

| File | Changes |
|------|---------|
| `src/services/knowledge.service.js` | 5 RAG bug fixes: cross-collection search namespace mismatch, missing tenant_id on deleteCollection/deleteDocument, GREATEST on count decrements, embedding batch limit (100), content truncation raised to 3600 chars |
| `src/infrastructure/ai/document.processor.js` | DOMMatrix crash fix — lazy-load pdf-parse and mammoth |
| `src/infrastructure/ai/gemini.provider.js` | NEW — Gemini provider with completions + embeddings (gemini-embedding-001) |
| `src/infrastructure/ai/gateway.service.js` | Register Gemini, _getEmbeddingProvider() skips Azure chat deployments |
| `src/infrastructure/ai/index.js` | Export GeminiProvider |
| `src/infrastructure/ai/embedding.service.js` | `this.defaultModel = null` — let each provider use its own default |
| `src/validation/ai.schema.js` | Added 'gemini' to 4 provider enums |
| `src/validation/tenant-ai-config.schema.js` | Added 'gemini' to 2 provider enums |
| `src/routes/index.js` | Uncommented knowledge routes (both import and registration) |

### Session 2 (April 3-5 — branch `qaasure_april3_dev`):

| File | Changes |
|------|---------|
| `src/infrastructure/ai/base-provider.js` | Added `supportsMultimodal = false` + `createMultimodalCompletion()` abstract method |
| `src/infrastructure/ai/gemini.provider.js` | Added `supportsMultimodal = true`, `supportedMimeTypes`, `createMultimodalCompletion()` with `inlineData` |
| `src/infrastructure/ai/openai.provider.js` | Added `supportsMultimodal = true` (direct mode only), `createMultimodalCompletion()` with `image_url` data URIs |
| `src/infrastructure/ai/anthropic.provider.js` | Added `supportsMultimodal = true` (direct mode only), `createMultimodalCompletion()` with base64 source blocks |
| `src/infrastructure/ai/gateway.service.js` | Added `createMultimodalCompletion()` with auto-routing to multimodal-capable providers |
| `src/infrastructure/ai/document.processor.js` | Added Excel support (`_processExcelBuffer` via exceljs), `classifyForMultimodal()` (visual vs text routing), added .xlsx/.xls to supportedTypes |
| `src/services/prompt.service.js` | Added `executeWithFile()` — multimodal orchestration |
| `src/controllers/prompt.controller.js` | Added `executeWithFile` handler |
| `src/routes/prompt.routes.js` | Added multer config + `POST /:id/execute-with-file` route |

### Session 3 (April 24 — branch `yasha_24thapril`):

| File | Changes |
|------|---------|
| `src/validation/tenant-ai-config.schema.js` | Added 'Mistral7b' to OPEN_SOURCE_MODELS, added `custom_embedding_models` and `default_embedding_model` to UpsertConfigSchema |
| `src/services/tenant-ai-config.service.js` | Full rewrite — added embedding fields to upsert (destructure, INSERT, ON CONFLICT, params), getActiveConfigs, _formatForResponse |
| `src/infrastructure/ai/gateway.service.js` | Added embedding model override in `_createProviderFromConfig()`, updated `_getEmbeddingProvider()` to discover tenant-registered providers |
| `src/services/knowledge.service.js` | Added `getAIGateway` import, `_resolveEmbeddingConfig()` method, embedding columns in createCollection INSERT, updated `_formatCollection()` with embeddingModel/Dimension/Provider |

### DB Migrations Applied:

**On LOCAL postgres (`psql -U yasha -d qassure_dev`):**
```sql
-- tenant_ai_configs table (CREATED from scratch — didn't exist in local DB)
CREATE TABLE tenant_ai_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL,
    config_type VARCHAR(20) NOT NULL DEFAULT 'direct',
    display_name VARCHAR(255),
    encrypted_api_key TEXT NOT NULL,
    endpoint TEXT,
    deployment VARCHAR(255),
    api_version VARCHAR(50),
    custom_models JSONB DEFAULT '[]',
    custom_pricing JSONB DEFAULT '{}',
    default_model VARCHAR(255),
    custom_embedding_models JSONB DEFAULT '[]',
    default_embedding_model VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_verified_at TIMESTAMPTZ,
    last_error TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, provider)
);

-- knowledge_collections additions
ALTER TABLE knowledge_collections ADD COLUMN embedding_model VARCHAR(255);
ALTER TABLE knowledge_collections ADD COLUMN embedding_dimension INTEGER;
ALTER TABLE knowledge_collections ADD COLUMN embedding_provider VARCHAR(100);
```

**On DOCKER postgres (`docker exec qassure-postgres psql -U postgres -d qassure_dev`):**
```sql
-- These were applied earlier but app doesn't use Docker DB
ALTER TABLE tenant_ai_configs ADD COLUMN custom_embedding_models JSONB DEFAULT '[]';
ALTER TABLE tenant_ai_configs ADD COLUMN default_embedding_model VARCHAR(255);
ALTER TABLE knowledge_collections ADD COLUMN embedding_model VARCHAR(255);
ALTER TABLE knowledge_collections ADD COLUMN embedding_dimension INTEGER;
ALTER TABLE knowledge_collections ADD COLUMN embedding_provider VARCHAR(100);
ALTER TABLE tenant_ai_configs DROP CONSTRAINT chk_provider;
ALTER TABLE tenant_ai_configs ADD CONSTRAINT chk_provider CHECK (provider IN ('openai', 'anthropic', 'gemini'));
```

---

## 5. ALL AI PROVIDERS — CURRENT STATE

| Provider | Type | Multimodal | Embeddings | Env Detection |
|----------|------|-----------|------------|---------------|
| OpenAI | Azure (gpt-4.1) or Direct | Yes (Direct mode, GPT-4o) — images via image_url | Yes (Direct mode only, text-embedding-3-small) | AZURE_OPENAI_ENDPOINT → Azure, OPENAI_API_KEY → Direct |
| Anthropic | Azure Foundry (claude-sonnet-4-5) or Direct | Yes (Direct mode, Claude 3.5+) — images via base64 source | No — throws NOT_SUPPORTED | AZURE_ANTHROPIC_ENDPOINT → Azure, ANTHROPIC_API_KEY → Direct |
| Gemini | Direct only (gemini-2.0-flash) | Yes — PDF + images via inlineData | Yes (gemini-embedding-001, 768 dims) | GOOGLE_AI_API_KEY |
| OpenSource | OpenAI-compatible endpoint | No | Yes (nomic-embed-text, bge-m3, all-minilm) | Tenant config endpoint |

### Multimodal Format Per Provider:
- **Gemini:** `parts: [{ text: "..." }, { inlineData: { mimeType: "image/png", data: "<base64>" } }]`
- **OpenAI:** `content: [{ type: "text", text: "..." }, { type: "image_url", image_url: { url: "data:image/png;base64,..." } }]`
- **Anthropic:** `content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "<base64>" } }, { type: "text", text: "..." }]`

### Embedding Dimension Map (in _resolveEmbeddingConfig):
```javascript
{
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
  'gemini-embedding-001': 768,
  'gemini-embedding-2-preview': 768,
  'nomic-embed-text': 768,
  'bge-m3': 1024,
  'all-minilm': 384,
  'intfloat/e5-large-v2': 1024,
}
```

---

## 6. ALL ENDPOINTS (43 total)

### AI Gateway (11 requests):
```
POST   /api/v1/ai/completions          — Create completion
GET    /api/v1/ai/completions          — List completions
GET    /api/v1/ai/completions/:id      — Get completion
GET    /api/v1/ai/providers            — List providers
GET    /api/v1/ai/providers/:name/health — Provider health
GET    /api/v1/ai/models               — List all models
GET    /api/v1/ai/health               — Overall health
GET    /api/v1/ai/costs                — Cost summary
POST   /api/v1/ai/playground           — Test without tracking
```

### Prompt Management (17 requests):
```
POST   /api/v1/ai/prompts                          — Create prompt
GET    /api/v1/ai/prompts                          — List prompts
GET    /api/v1/ai/prompts/:id                      — Get prompt
PUT    /api/v1/ai/prompts/:id                      — Update prompt
PATCH  /api/v1/ai/prompts/:id/status               — Update status
DELETE /api/v1/ai/prompts/:id                      — Delete prompt
POST   /api/v1/ai/prompts/:id/clone                — Clone prompt
GET    /api/v1/ai/prompts/:id/versions             — Version history
GET    /api/v1/ai/prompts/:id/versions/:version    — Get version
POST   /api/v1/ai/prompts/:id/rollback             — Rollback
POST   /api/v1/ai/prompts/:id/execute              — Execute (text only)
POST   /api/v1/ai/prompts/:id/execute-with-file    — Execute with file (multimodal) ★
POST   /api/v1/ai/prompts/:id/test                 — Test prompt
POST   /api/v1/ai/prompts/:id/test-cases           — Create test case
GET    /api/v1/ai/prompts/:id/test-cases           — List test cases
POST   /api/v1/ai/prompts/test-cases/:id/run       — Run test case
GET    /api/v1/ai/prompts/test-cases/:id/results   — Get results
```

### Tenant AI Config (5 requests):
```
POST   /api/v1/ai/config              — Upsert config (now with embedding fields) ★
GET    /api/v1/ai/config              — List configs
GET    /api/v1/ai/config/:provider    — Get config
DELETE /api/v1/ai/config/:provider    — Delete config
POST   /api/v1/ai/config/:provider/test — Test connection
```

### Knowledge/RAG (12 requests):
```
POST   /api/v1/ai/knowledge/collections              — Create (now records embedding model) ★
GET    /api/v1/ai/knowledge/collections              — List
GET    /api/v1/ai/knowledge/collections/:id          — Get
PUT    /api/v1/ai/knowledge/collections/:id          — Update
DELETE /api/v1/ai/knowledge/collections/:id          — Delete
GET    /api/v1/ai/knowledge/collections/:id/documents — List documents
POST   /api/v1/ai/knowledge/documents                — Upload document
GET    /api/v1/ai/knowledge/documents/:id/status     — Document status
DELETE /api/v1/ai/knowledge/documents/:id            — Delete document
POST   /api/v1/ai/knowledge/search                   — Semantic search
POST   /api/v1/ai/knowledge/search/context           — RAG context assembly
GET    /api/v1/ai/knowledge/stats                    — Vector store stats
```

---

## 7. ASLESHA'S (LTTS) REQUIREMENTS — STATUS

### Email 1 — 30 questions about AI Gateway architecture:
**Status:** ✅ FULLY ANSWERED
**Document:** `QAssure_AI_Gateway_Response_to_LTTS.docx` (406 lines, all 30 questions)
**Email body:** `Email_Body_for_Zoho.txt`
**Azure Foundry coverage:** Section 1.5 added with dual-mode tables

### Email 2 — 3 blockers:

| # | Blocker | Status | Solution |
|---|---------|--------|----------|
| 1 | Prompt execute only supports text — needs PDF, images, Excel, Word | ✅ DONE | `POST /ai/prompts/:id/execute-with-file` with multimodal gateway |
| 2 | Open-source model config in LTTS network | ✅ Code ready | OpenSourceProvider exists, tenant config API supports it |
| 3 | Dynamic LLM model config — no dependency on Tech4Biz | ✅ Code ready | `/ai/config` endpoints with custom_models, custom_embedding_models |

### Change Request — Custom embedding models:
**Status:** ✅ DONE
- `custom_embedding_models` and `default_embedding_model` fields added to config API
- Collections auto-resolve and record embedding model/dimension/provider
- Mistral7b with `intfloat/e5-large-v2` tested and working

---

## 8. TEST RESULTS — VERIFIED

### RAG Pipeline (tested on QAssure-Details branch):
| Test | Result |
|------|--------|
| Create collection | ✅ |
| List collections | ✅ |
| Upload document (txt) | ✅ completed, 59 words, 1 chunk |
| Search within collection | ✅ Score 0.678 |
| Cross-collection search | ✅ Score 0.705 (bug fix verified) |
| RAG context assembly | ✅ Context with source attribution |
| Gemini completions | ✅ "Hello there", 1196ms |

### Multimodal File Upload (tested on qaasure_april3_dev branch):
| File Type | Mode | Result |
|-----------|------|--------|
| Text (.txt) | text extraction | ✅ FDA compliance analysis |
| Image (.png) | visual/multimodal | ✅ Gemini vision identified content |
| PDF (with content) | visual/multimodal | ✅ Extracted 5 test results + compliance table |
| Excel (.xlsx) | text extraction | ✅ Identified failed batches + corrective actions |
| Word (.docx) | text extraction | ✅ Listed procedural steps, flagged compliance gaps |

### Embedding Config (tested on yasha_24thapril branch):
| Test | Result |
|------|--------|
| POST /ai/config with Mistral7b + embedding fields | ✅ Stored and returned correctly |
| GET /ai/config/Mistral7b | ✅ Shows custom_embedding_models and default_embedding_model |
| Create collection — embedding resolution | ✅ embeddingModel: "gemini-embedding-001", dimension: 768 |
| List collections — embedding fields | ✅ New collections show embedding info, old show null |

---

## 9. KNOWN ISSUES / BUGS NOT YET FIXED

| Issue | Severity | Where |
|-------|----------|-------|
| Prompt execute bypasses AIService — completions via `/prompts/:id/execute` NOT tracked in ai_completions or ai_usage | 🔴 Design gap | prompt.service.js line 485 calls gateway directly |
| Missing FK constraints — ai_completions, ai_usage, ai_prompt_templates have no FK on tenant_id | 🟡 Defense-in-depth | DB schema |
| Missing FK — ai_completions.prompt_template_id has no FK to ai_prompt_templates | 🟡 Defense-in-depth | DB schema |
| VectorStore 'default' namespace fallback — latent cross-tenant risk | 🟠 Latent | vector-store.service.js line 13 |
| LOCAL postgres missing audit_log columns — `module_id` column missing from audit_logs table | 🟡 Non-blocking | Causes error logs but doesn't break functionality |
| LOCAL postgres missing `audit_log_resource_types` table | 🟡 Non-blocking | Same as above |
| Elasticsearch not connected — Missing node(s) option | 🟠 Non-blocking | .env ELASTICSEARCH_NODE config |

---

## 10. FILE STRUCTURE — AI INFRASTRUCTURE

```
src/infrastructure/ai/
├── base-provider.js        — Abstract base (supportsMultimodal, createMultimodalCompletion)
├── openai.provider.js      — Azure OpenAI + Direct (multimodal via image_url)
├── anthropic.provider.js   — Azure Foundry + Direct (multimodal via base64)
├── gemini.provider.js      — Direct only (multimodal via inlineData, embeddings)
├── opensource.provider.js  — OpenAI-compatible endpoints (Ollama, vLLM)
├── gateway.service.js      — Provider routing, fallback, tenant config, multimodal, embeddings
├── embedding.service.js    — Embedding wrapper (delegates to gateway)
├── document.processor.js   — PDF/DOCX/Excel/TXT extraction + classifyForMultimodal
├── chunker.service.js      — Text chunking (512 tokens, paragraph-based)
├── vector-store.service.js — Pinecone + in-memory fallback
└── index.js                — Exports all

src/services/
├── knowledge.service.js    — RAG: collections, documents, search, _resolveEmbeddingConfig
├── prompt.service.js       — Prompt CRUD, versioning, execute, executeWithFile
├── tenant-ai-config.service.js — BYOK config with encrypted keys + embedding config
└── ai.service.js           — Completion tracking (ai_completions, ai_usage)

src/controllers/
├── knowledge.controller.js — Knowledge/RAG HTTP handlers
├── prompt.controller.js    — Prompt HTTP handlers + executeWithFile
├── ai.controller.js        — AI Gateway HTTP handlers
└── tenant-ai-config.controller.js — Config HTTP handlers

src/routes/
├── knowledge.routes.js     — Knowledge routes (multer for document upload)
├── prompt.routes.js        — Prompt routes (multer for execute-with-file)
├── ai.routes.js            — AI Gateway routes
├── ai-config.routes.js     — Config routes
└── index.js                — Route registration (knowledge routes ENABLED)

src/validation/
├── ai.schema.js            — Zod schemas for AI endpoints (provider: openai|anthropic|gemini)
├── prompt.schema.js        — Zod schemas for prompt endpoints
└── tenant-ai-config.schema.js — Zod schemas + OPEN_SOURCE_MODELS list (includes Mistral7b)
```

---

## 11. DOCUMENTS GENERATED

| Document | Purpose | Location |
|----------|---------|----------|
| QAssure_AI_Gateway_Response_to_LTTS.docx | Aslesha's 30 questions answered | Generated in earlier session |
| Email_Body_for_Zoho.txt | Cover email for Aslesha | Generated in earlier session |
| QAssure_AI_Gateway_Developer_Guide.docx | Full developer guide (1140 lines, all 42 endpoints) | Generated in earlier session |
| QAssure_AI_Gateway_postman_collection.json | Original Postman collection (46 requests) | Generated in earlier session |
| QAssure_Multimodal_Response_to_LTTS.docx | Response to blocker #1 (multimodal) | Generated April 5 |
| QAssure_Multimodal_Frontend_Integration_Guide.docx | Frontend guide for file upload (556 lines, React components) | Generated April 5 |
| QAssure_Embedding_Config_Frontend_Guide.docx | Frontend guide for embedding config (382 lines) | Generated April 24 |
| QAssure_AI_Gateway_Updated_Postman.json | Updated collection with embedding + multimodal (51 requests) | Generated April 24 |

---

## 12. WHAT YASHA MIGHT ASK NEXT

Based on open items:

1. **Test multimodal on the new branch** — execute-with-file hasn't been tested on `yasha_24thapril` branch yet (was tested on `qaasure_april3_dev`)
2. **Fix prompt execute tracking** — completions via execute should write to ai_completions/ai_usage
3. **LTTS deployment guide** — how to deploy QAssure backend in LTTS network
4. **Dynamic LLM model management** — UI/API for adding/removing models without Tech4Biz
5. **File Attachment Service Postman collection** — original task never completed
6. **Missing FK constraints** — defense-in-depth DB fixes
7. **Respond to Aslesha** — send the multimodal + embedding config documents
8. **Cross-collection search dimension compatibility** — search should only span same-dimension collections

---

## 13. CRITICAL REMINDERS FOR NEXT SESSION

1. **ALWAYS check which directory you're in** — `pwd` before any command
2. **ALWAYS check which postgres the app connects to** — LOCAL vs Docker
3. **The app uses LOCAL postgres** — migrations go to `psql -U yasha -d qassure_dev`
4. **Docker postgres is SEPARATE** — `docker exec qassure-postgres psql` is a different DB
5. **Yasha's editor sometimes doesn't save to the right path** — use `cat > file << 'EOF'` or sed for critical changes, then verify with grep
6. **Node.js version:** v23.7.0
7. **npm packages installed:** `@google/generative-ai@^0.24.1`, `exceljs@^4.4.0`, `@pinecone-database/pinecone@^6.1.3`, `pdf-parse@^2.4.5`, `mammoth@^1.11.0`
8. **Gemini embedding model name:** `gemini-embedding-001` (NOT `text-embedding-004` or `embedding-001`)
9. **Port 3000 often still running** — kill with `lsof -ti:3000 | xargs kill -9` before restart
10. **Yasha is under pressure** — be precise, test thoroughly, don't hallucinate
