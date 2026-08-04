# QAssure AI Config Service — Functional & Module-Level Documentation

---

## 1. Module Purpose

The AI Config Service is responsible for **one thing done securely**: allowing tenant administrators to bring their own AI provider credentials into QAssure. Without this service, all AI operations would use platform-level API keys. With it, a tenant's AI costs are billed directly to their own vendor account, and their data never passes through a shared platform key.

---

## 2. Functional Flows

### 2.1 Creating / Updating a Provider Config (Upsert)

The `POST /api/v1/ai-config` endpoint uses an SQL `INSERT ... ON CONFLICT DO UPDATE` (upsert) pattern, meaning:
- First call for a `(tenant_id, provider)` pair **creates** a new record.
- Subsequent calls for the same pair **update** all fields of the existing record.

This eliminates the need for a separate `PUT` endpoint and makes the API idempotent.

**Step-by-step internal flow**:
1. `authenticate` validates the JWT and sets `req.user`.
2. `tenantContext` extracts `req.tenantId` from the JWT claim or `x-tenant-id` header.
3. `authorize('ai:create')` verifies the user has the `ai:create` permission.
4. `validate(UpsertConfigSchema)` runs Zod validation. For `azure` config, it enforces `endpoint + deployment`. For open-source providers, it enforces `endpoint`.
5. Controller resolves `tenantId` from `req.tenantId || req.user?.tenantId`.
6. Service calls `encrypt(api_key)` → stores encrypted key in `encrypted_api_key`.
7. DB upsert executes. On conflict, `last_error` is reset to `NULL` (clean slate after update).
8. Both the **config cache** (`configCache`) and the **Gateway provider cache** (`tenantProviderCache`) are invalidated for this tenant.
9. The newly created/updated row is returned via `_formatForResponse()`, which **decrypts** the key only for masking (to return `api_key_masked`). The raw key is never returned.

---

### 2.2 Listing Configs (List / Get)

- `list` returns all configs ordered by `provider` — no pagination (tenant configs are expected to be small, typically < 10 providers).
- `getByProvider` returns a single config or 404 if not found.
- Both use `_formatForResponse()` which masks the API key before returning.
- **`getActiveConfigs()`** is an **internal-only** method used by the AI Gateway. It decrypts keys fully and returns them in a `Map<provider, config>`. This is never called by the HTTP API layer.

---

### 2.3 Deleting a Config

Permanently removes the DB record and invalidates both in-memory caches. After deletion, any AI operation by this tenant will fall back to global/system providers.

---

### 2.4 Testing a Connection (`testConnection`)

The test flow is designed for real end-to-end validation of the stored credential:

1. Fetches the DB record for the tenant+provider.
2. Calls `decrypt(row.encrypted_api_key)` to get the plaintext key.
3. Instantiates a **temporary, throw-away provider instance** (not cached):
   - `openai` → `OpenAIProvider`
   - `anthropic` → `AnthropicProvider`
   - `gemini` / `gemini*` → `GeminiProvider`
   - anything else → `OpenSourceProvider` (applies to `Mistral 7B`, `Llama 8B`, custom vLLM, etc.)
4. For named open-source models (e.g., `provider = "Mistral 7B"`), the provider's model list is constrained to just that model name so the health check uses the correct model.
5. Calls `provider.initialize()` — creates the SDK client.
6. Calls `provider.healthCheck()` — sends a minimal test message (e.g., `"ping"` with `max_tokens: 5`).
7. Updates `last_verified_at = NOW()` and `last_error = null/errorMsg` in the DB.
8. Invalidates the config cache.
9. Returns the health result including `healthy`, `latency_ms`, `provider`, and `model`.

---

## 3. In-Memory Cache Architecture

Two separate caches exist in the system:

| Cache | Location | Contents | TTL | Invalidated By |
| :--- | :--- | :--- | :--- | :--- |
| **Config Cache** | `tenant-ai-config.service.js` | `Map<tenantId, { configs: Map<provider, decryptedConfig>, expiresAt }>` | 5 min | `upsert()`, `remove()`, `testConnection()`, `clearCache()` |
| **Provider Cache** | `gateway.service.js` | `Map<tenantId, { providers: Map<name, ProviderInstance>, fallbackOrder, expiresAt }>` | 5 min | `clearTenantCache()` called by config service on any change |

The **Config Cache** stores raw config data (decrypted keys). It is used only by `getActiveConfigs()` → called by the Gateway.

The **Provider Cache** stores fully initialized SDK provider instances. It avoids re-creating `OpenAI()` / `Anthropic()` objects on every AI call. It supports a maximum of 200 entries (LRU eviction).

---

## 4. Provider Type Details

### 4.1 OpenAI (`openai.provider.js`)
Supports both **direct API** (`apiKey`) and **Azure OpenAI Service** (`azureEndpoint + azureApiKey + azureDeployment + azureApiVersion`). Supports multimodal (GPT-4o vision). Supports embeddings (`text-embedding-ada-002`, `text-embedding-3-small`, `text-embedding-3-large`).

### 4.2 Anthropic (`anthropic.provider.js`)
Supports direct API and Azure Foundry. Multimodal via Claude 3.5+ Sonnet. No native embedding support.

### 4.3 Gemini (`gemini.provider.js`)
Connects to Google AI Studio (`generativelanguage.googleapis.com`) or Vertex AI. Multimodal. Configured via `apiKey` + optional `apiVersion` (default `v1beta`).

### 4.4 Open-Source / BYOK (`opensource.provider.js`)
Connects to **any OpenAI-compatible REST endpoint**. Tested with:
- **vLLM** (self-hosted)
- **Ollama** (local models)
- **Together.ai**
- **Groq**
- **LM Studio**

Supports the full model list: `Mistral 7B/24B/Large`, `Llama 3.2B/8B/70B`, `Qwen 2.5 3B/7B/14B/72B`, `Gemma 7B/2 27B`, `DeepSeek-V3/R1`, `Phi-3 Mini/Phi-4`.

**Special behavior**: When a specific model name is used as the `provider` value (e.g., `"Mistral 7B"`), the provider's model list is overridden to contain only that model. This enables per-model configuration and routing.

**Cancellation**: Open-source providers support in-flight request cancellation via a configured `cancel_url`. The service sends `POST <cancel_url> { request_id }` with appropriate auth headers.

**Cost**: Always `0` for open-source providers (`calculateCost()` always returns `0`).

---

## 5. Error Handling & Edge Cases

| Scenario | Behavior |
| :--- | :--- |
| `ENCRYPTION_KEY` env var not set | `encrypt()` throws immediately. All config mutations fail at encryption step. |
| Decryption failure (wrong key or tampered ciphertext) | `getActiveConfigs()` logs the error, updates `last_error` in DB, skips the broken config |
| Provider not found after upsert (cache just invalidated) | Next AI call triggers a fresh `getActiveConfigs()` DB query |
| Tenant has no configs at all | Gateway falls back to global configs → system env var keys |
| `testConnection` called for unknown provider string | Service throws `"Unsupported provider: <name>"` → 500 `TEST_FAILED` |
| Azure config missing endpoint | Zod refinement returns 400 with `path: ["endpoint"]` |
| Open-source provider missing endpoint | Zod refinement returns 400. `OpenSourceProvider.initialize()` also returns `false` if no endpoint |
