# AI Gateway Service API Guidance

This document provides a comprehensive guide for developers integrating with the **QAssure AI Gateway Service**. It covers the architecture, the responsibility split, full API route details, database models, and common workflows.

---

## 1. Overview & Key Capabilities

The **Multi-provider AI Gateway** provide a unified interface for AI completions (chat), prompt management, usage tracking, and cost analytics across the QAssure SaaS platform.

**Key Features:**
- **BYOK (Bring Your Own Key):** Per-tenant configuration with encrypted key storage (AES-256-GCM).
- **Open Source First-Class Support:** Unified support for 'open-source' models like Llama, Mistral, Qwen, and Gemma. These can be configured as distinct providers using their model names (e.g., `Llama 3.2B`) and feature **zero-cost** counting by default.
- **Prompt Management:** Versioning, rollout, test cases, and execution tracking of your prompts.
- **Cost & Usage Tracking:** Aggregation by tenant, provider, and model per day.
- **Zod Schema Validation:** Out-of-the-box validation on all inbound requests.
- **Kafka Integration:** Async emission of events for completed AI operations (`qassure.ai.events`).

---

## 2. Authentication & Authorization

All AI endpoints require valid authentication:
1. **Authentication:** Standard JWT (User token) or API Key.
2. **Authorization:** The gateway checks for `ai:read`, `ai:write`, or `ai:delete` permissions.
3. **Feature Guard:** Ensure the `AI` module feature is enabled for the tenant.

---

## 3. Developer Responsibility Split

### **Backend AI Service Responsibilities**
- Defines inbound validation schema via **Zod**.
- Performs AuthN/AuthZ and tenant separation.
- Orchestrates provider fallback and retry logic.
- Safely stores configured BYOK keys using AES-256-GCM.
- Connects to Azure OpenAI/AI Foundry or Direct Providers.
- Persists all request info, responses, costs, token usage, latency out-of-band.
- Fires internal Kafka events upon success.

### **Module Developer Responsibilities**
- **Auth:** Provide valid tokens & API keys.
- **Requests:** Construct valid completion requests (standard role/content structure).
- **Prompts:** Leverage execution endpoints (`/api/v1/ai/prompts/:id/execute`) for repeatable logic.
- **Configuration:** Set up specific providers for your tenant via Configuration APIs.

---

## 4. API Reference Details

### 4.1 AI Implementation (`/api/v1/ai`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/providers` | List available providers and supported models. |
| `GET` | `/providers/:provider/health` | Deep health check for a provider (e.g. `openai`, `Llama 3.2B`). |
| `GET` | `/models` | List all models and pricing. |
| `GET` | `/health` | Gateway system health status. |
| `POST` | `/completions` | **Core:** Generate completion (Kafka + Usage tracked). |
| `GET` | `/completions` | List history (supports `page`, `limit`, `provider`, `model`, `status`). |
| `GET` | `/completions/:id` | Get details of a single completion execution. |
| `GET` | `/costs` | Cost summary (supports `start_date`, `end_date`, `group_by`). |
| `POST` | `/playground` | Fast UI testing (No DB/Kafka tracking). |

---

### 4.2 Configuration Management (`/api/v1/ai/config`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/` | **Create/Update** configuration for a provider. |
| `GET` | `/` | List all configurations (API keys masked). |
| `GET` | `/:provider` | Get config details for a specific provider. |
| `DELETE`| `/:provider` | Remove tenant-specific configuration. |
| `POST` | `/:provider/test` | Connectivity test for a saved config. |

**Configuration Fields (JSON Body for POST):**
- `provider` (**Req**): `openai`, `anthropic`, or model identifier (e.g. `Llama 8B`).
- `config_type` (**Req**): `azure` or `direct`.
- `api_key` (**Req**): Plaintext key (stored encrypted).
- `endpoint` (URL, **Req** for Azure/OpenSource): Base API URL.
- `api_version` (Optional): e.g., `2024-02-15-preview`.
- `deployment` (String, **Req** for Azure): Deployment resource name.
- `default_model` (Optional): Backend host tag (e.g., `llama3.2`).
- `custom_models` (Array, Optional): List of additional model IDs.

---

### 4.3 Prompt management (`/api/v1/ai/prompts`)

#### **Core CRUD**
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/` | Create a new template. |
| `GET` | `/` | List templates (supports `use_case`, `status`, `search`, `tags`). |
| `GET` | `/:id` | Get template by ID. |
| `PUT` | `/:id` | Update template (all fields optional). |
| `PATCH` | `/:id/status` | Update status (`draft`, `active`, `archived`, `deprecated`). |
| `DELETE`| `/:id` | Remove template. |
| `POST` | `/:id/clone` | Duplicate a template. |

#### **Versions & Execution**
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/:id/versions` | List version history. |
| `GET` | `/:id/versions/:version` | Get specific version snapshot. |
| `POST` | `/:id/rollback` | Revert to a previous version number. |
| `POST` | `/:id/execute` | **Run prompt** with variables (Usage tracked). |
| `POST` | `/:id/test` | Test prompt in playground mode. |

#### **Unit Testing**
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/:id/test-cases` | Create a test case (variables + expected output). |
| `GET` | `/:id/test-cases` | List test cases. |
| `POST` | `/test-cases/:testCaseId/run` | Execute a unit test run. |
| `GET` | `/test-cases/:testCaseId/results`| Retrieve test execution results. |

---

## 5. Detailed Body Specifications

### Completion Request (`POST /api/v1/ai/completions`)
```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Analyze this data." }
  ],
  "provider": "Llama 3.2B",
  "temperature": 0.3,
  "max_tokens": 1000
}
```

### Prompt Execution (`POST /api/v1/ai/prompts/:id/execute`)
```json
{
  "variables": {
    "userInput": "Summarize the audit report.",
    "context": "Context text here..."
  },
  "temperature": 0.5
}
```

---

## 6. Typical Workflows

### Standard Completion Flow
1. **Auth:** App requests `/ai/completions` with context.
2. **Context Selection:** Gateway locates tenant API keys in Cache/DB.
3. **Execution:** Platform attempts connection, applying requested settings.
4. **Fallback:** If a provider is rate-limited, it automatically rolls to the next available one.
5. **Tracking:** Observes completion, calculates cost (**0 for Open Source**), and emits Kafka event.

### Open Source Configuration (BYOK)
1. Tenant submits `endpoint` (e.g., `http://host.docker.internal:11434/v1`) to `/ai/config`.
2. **Provider Name:** Use the specific display name (e.g., `Llama 3.2B`).
3. **Model Mapping:** Set `default_model` to the backend tag (e.g., `llama3.2`).
4. **Availability:** The model is immediately available via the chosen provider name in any completion call.

---

## 7. Model Identifiers (First-Class Support)
The following identifiers are supported as first-class providers:
- `Mistral 7B`, `Mistral 24B`
- `Llama 3.2B`, `Llama 8B`, `Llama 70B`
- `Qwen 2.5 3B`, `Qwen 2.5 7B`, `Qwen 2.5 14B`, `Qwen 2.5 72B`
- `Gemma 7B`, `Gemma 2 27B`

---

**Note**: For vector-search (Qdrant) or document processing, please refer to the respective module documentations.
