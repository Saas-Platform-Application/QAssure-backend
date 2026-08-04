# QAssure AI Config Service — Codebase & API Documentation

---

## 1. Codebase Layout

| File | Role |
| :--- | :--- |
| `src/routes/ai-config.routes.js` | Express router — 5 routes for CRUD + connection test |
| `src/controllers/tenant-ai-config.controller.js` | HTTP handlers — resolves tenant, delegates to service |
| `src/services/tenant-ai-config.service.js` | Core business logic — upsert, list, get, delete, test, cache |
| `src/validation/tenant-ai-config.schema.js` | Zod validation schemas for all request inputs |
| `src/utils/encryption.js` | AES-256-GCM encrypt/decrypt/mask utility |
| `src/infrastructure/ai/gateway.service.js` | AI Gateway — routes requests to correct provider per tenant |
| `src/infrastructure/ai/base-provider.js` | Abstract provider interface |
| `src/infrastructure/ai/openai.provider.js` | OpenAI direct + Azure implementation |
| `src/infrastructure/ai/anthropic.provider.js` | Anthropic direct + Azure implementation |
| `src/infrastructure/ai/gemini.provider.js` | Google Gemini AI Studio implementation |
| `src/infrastructure/ai/opensource.provider.js` | OpenAI-compatible open-source endpoint implementation |

---

## 2. Middleware Chain

All routes apply the following middleware chain:

```
authenticate  →  tenantContext  →  authorize('ai:<action>')  →  validate(Schema)  →  controller
```

| Middleware | Source | Purpose |
| :--- | :--- | :--- |
| `authenticate` | `auth.middleware.js` | Verifies JWT or API key. Populates `req.user`. |
| `tenantContext` | `tenant.middleware.js` | Resolves `req.tenantId` from JWT or `x-tenant-id` header. |
| `authorize('ai:action')` | `auth.middleware.js` | Enforces RBAC: `ai:read`, `ai:create`, `ai:delete` |
| `validate(Schema)` | `validationMiddleware.js` | Zod schema validation for body or params |

---

## 3. Validation Schemas (`tenant-ai-config.schema.js`)

### `ProviderParamsSchema`
Validates the `:provider` URL parameter.
```javascript
z.object({
  provider: z.string().min(1).max(100)
})
```

### `TestConnectionBodySchema`
Optional request body for the test connection endpoint.
```javascript
z.object({
  model: z.string().max(100).optional()
})
```

### `UpsertConfigSchema`
Full validation schema for creating or updating a provider config. Includes cross-field refinement.

| Field | Zod Type | Required | Validation |
| :--- | :--- | :--- | :--- |
| `provider` | `string` | Yes | min 1, max 100 |
| `config_type` | `enum` | Yes | `"azure"` or `"direct"` only |
| `display_name` | `string` | No | max 255 |
| `api_key` | `string` | Yes | min 10, max 500 (rejects trivially short keys) |
| `endpoint` | `string (url)` | Conditional | Required for `azure`; required for any non-builtin provider |
| `deployment` | `string` | Conditional | Required for `azure` config_type |
| `api_version` | `string` | No | max 50 |
| `custom_models` | `string[]` | No | max 20 entries, each max 100 chars |
| `custom_pricing` | `Record<string, {input: number, output: number}>` | No | Prices must be >= 0 |
| `default_model` | `string` | No | max 100 |
| `custom_embedding_models` | `string[]` | No | max 10 entries |
| `default_embedding_model` | `string` | No | max 100 |
| `fallback_provider` | `string \| null` | No | max 50 |
| `cancel_url` | `string (url) \| null` | No | max 500 |
| `is_active` | `boolean` | No | Defaults to `true` in service |

**Refinement Rule** (cross-field validation):
- If `config_type === "azure"`: both `endpoint` AND `deployment` are required.
- If provider is not in `["openai", "anthropic", "gemini", "gemini*"]`: `endpoint` is required (open-source providers need a base URL).

Built-in providers that get a pass on the endpoint requirement: `["openai", "anthropic", "gemini"]` (exported as `BUILTIN_PROVIDERS`).

---

## 4. API Endpoints

**Base path**: `/api/v1/ai-config`
**Required headers**: `Authorization: Bearer <JWT>`, `x-tenant-id: <UUID>`

---

### POST `/api/v1/ai-config`
**Create or update** a provider config for the current tenant (upsert by `(tenant_id, provider)`).

- **Permission**: `ai:create`
- **Middleware**: `authenticate`, `tenantContext`, `authorize('ai:create')`, `validate(UpsertConfigSchema)`

**Request Body**:
```json
{
  "provider": "openai",
  "config_type": "direct",
  "display_name": "Production OpenAI",
  "api_key": "sk-proj-xxxxxxxxxxxxxxxx",
  "default_model": "gpt-4o",
  "custom_models": ["gpt-4o", "gpt-4o-mini"],
  "custom_pricing": {
    "gpt-4o": { "input": 0.005, "output": 0.015 },
    "gpt-4o-mini": { "input": 0.00015, "output": 0.0006 }
  },
  "is_active": true
}
```

**Azure OpenAI Example**:
```json
{
  "provider": "openai",
  "config_type": "azure",
  "api_key": "xxxxxxxxxxxxxxxx",
  "endpoint": "https://my-resource.openai.azure.com",
  "deployment": "gpt-4o-deployment",
  "api_version": "2024-12-01-preview",
  "default_model": "gpt-4o"
}
```

**Open-Source / BYOK Provider Example**:
```json
{
  "provider": "Mistral 7B",
  "config_type": "direct",
  "api_key": "dummy-or-real-key",
  "endpoint": "http://vllm-server:8000/v1",
  "default_model": "Mistral 7B",
  "cancel_url": "http://vllm-server:8000/cancel"
}
```

**Response `200`**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenant_id": "uuid",
    "provider": "openai",
    "config_type": "direct",
    "display_name": "Production OpenAI",
    "api_key_masked": "sk-proj-x...xxxx",
    "endpoint": null,
    "deployment": null,
    "api_version": null,
    "custom_models": ["gpt-4o", "gpt-4o-mini"],
    "custom_pricing": { "gpt-4o": { "input": 0.005, "output": 0.015 } },
    "default_model": "gpt-4o",
    "custom_embedding_models": [],
    "default_embedding_model": null,
    "fallback_provider": null,
    "cancel_url": null,
    "is_active": true,
    "last_verified_at": null,
    "last_error": null,
    "created_at": "2026-06-19T12:00:00Z",
    "updated_at": "2026-06-19T12:00:00Z"
  }
}
```

**Error Responses**:
| Status | Code | Condition |
| :--- | :--- | :--- |
| 400 | `MISSING_TENANT` | `tenantId` not resolved from JWT or header |
| 400 | `CONFIG_ERROR` | Azure config missing endpoint or deployment |
| 400 | Zod error | Schema validation failed (see `details` array) |
| 500 | `CONFIG_ERROR` | Unexpected server error |

---

### GET `/api/v1/ai-config`
**List all provider configs** for the current tenant.

- **Permission**: `ai:read`
- **Middleware**: `authenticate`, `tenantContext`, `authorize('ai:read')`

**Response `200`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "provider": "openai",
      "config_type": "direct",
      "api_key_masked": "sk-proj-x...xxxx",
      "is_active": true,
      "last_verified_at": "2026-06-19T11:00:00Z",
      "last_error": null,
      ...
    },
    {
      "id": "uuid",
      "provider": "Mistral 7B",
      "config_type": "direct",
      "api_key_masked": "dum...y-ke",
      "endpoint": "http://vllm-server:8000/v1",
      "is_active": true,
      ...
    }
  ]
}
```

> **Note**: API keys are always masked in all list/get responses. The raw key is never returned.

---

### GET `/api/v1/ai-config/:provider`
**Get a single provider config** by provider name.

- **Permission**: `ai:read`
- **Middleware**: `authenticate`, `tenantContext`, `authorize('ai:read')`, `validate(ProviderParamsSchema, 'params')`
- **URL Param**: `provider` — e.g., `openai`, `anthropic`, `Mistral 7B`

**Response `200`**: Same structure as the single object in the list response above.

**Error Responses**:
| Status | Code | Condition |
| :--- | :--- | :--- |
| 404 | `NOT_FOUND` | No config for this provider in the tenant |
| 400 | `MISSING_TENANT` | Tenant not resolved |

---

### DELETE `/api/v1/ai-config/:provider`
**Remove a provider config** for the current tenant.

- **Permission**: `ai:delete`
- **Middleware**: `authenticate`, `tenantContext`, `authorize('ai:delete')`, `validate(ProviderParamsSchema, 'params')`

**Response `200`**:
```json
{
  "success": true,
  "message": "openai config removed"
}
```

**Side effects**:
- Deletes row from `tenant_ai_configs`
- Calls `configCache.delete(tenantId)` on the service in-memory cache
- Calls `getAIGateway().clearTenantCache(tenantId)` on the Gateway provider cache

**Error Responses**:
| Status | Code | Condition |
| :--- | :--- | :--- |
| 404 | `NOT_FOUND` | No config found for this provider |

---

### POST `/api/v1/ai-config/:provider/test`
**Test connectivity** for a configured provider. Decrypts the stored API key, instantiates a temporary provider, and runs `healthCheck()`.

- **Permission**: `ai:create`
- **Middleware**: `authenticate`, `tenantContext`, `authorize('ai:create')`, `validate(ProviderParamsSchema, 'params')`, `validate(TestConnectionBodySchema)`

**URL Param**: `provider` — e.g., `openai`

**Request Body** (optional):
```json
{
  "model": "gpt-4o-mini"
}
```

**Response `200`** (healthy):
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "latency_ms": 423,
    "provider": "openai",
    "model": "gpt-4o-mini",
    "fallbackUsed": false
  }
}
```

**Response `200`** (unhealthy — test completed but provider responded with an error):
```json
{
  "success": true,
  "data": {
    "healthy": false,
    "error": "401 Unauthorized — check API key",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "fallbackUsed": false
  }
}
```

**Side effects on test completion**:
- `last_verified_at` is set to `NOW()` in the database
- `last_error` is cleared on success, or set to the error message on failure
- `configCache.delete(tenantId)` is called to force fresh decryption on next real request

**Error Responses**:
| Status | Code | Condition |
| :--- | :--- | :--- |
| 500 | `TEST_FAILED` | No config found for provider, or unexpected test error |

---

## 5. Service Layer (`tenant-ai-config.service.js`)

Singleton class `TenantAIConfigService` (retrieved via `getTenantAIConfigService()`).

### Methods

| Method | Description |
| :--- | :--- |
| `upsert(tenantId, data, context)` | Encrypts API key, runs `INSERT ... ON CONFLICT DO UPDATE`, clears both caches |
| `listByTenant(tenantId)` | Fetches all rows for tenant, formats with masked keys |
| `getByProvider(tenantId, provider)` | Fetches single row, returns `null` if not found |
| `getActiveConfigs(tenantId)` | **Internal** — Decrypts and returns `Map<provider, config>` for active providers. Used by Gateway. Cache-first with 5-min TTL. |
| `remove(tenantId, provider)` | Deletes record, clears both caches |
| `testConnection(tenantId, provider, options)` | Decrypts key, instantiates appropriate provider class, runs `healthCheck()`, updates `last_verified_at`/`last_error` |
| `clearCache(tenantId?)` | Manually evicts cache for one or all tenants |
| `_formatForResponse(row)` | Private — Decrypts key for masking, returns safe response object (never returns raw key) |

### Cache Details

```javascript
// Cache structure
const configCache = new Map();
// Map: tenantId → { configs: Map<provider, decryptedConfig>, expiresAt: number }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

Cache is invalidated on every `upsert()`, `remove()`, and `testConnection()` call.

---

## 6. Gateway Service Integration (`gateway.service.js`)

The Gateway maintains its **own separate provider cache** (`tenantProviderCache`) that stores instantiated provider objects (not just config data). This avoids re-initializing SDK clients on every AI call.

```javascript
const tenantProviderCache = new Map();
// Map: tenantId → { providers: Map<name, ProviderInstance>, fallbackOrder: string[], expiresAt: number }
const TENANT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const TENANT_CACHE_MAX_SIZE = 200; // LRU eviction when exceeded
```

**Key Gateway methods consumed by AI operations:**

| Method | Description |
| :--- | :--- |
| `createCompletion(options, context)` | Main AI call. Resolves providers, tries them in fallback order. |
| `createStreamingCompletion(options, onChunk, context)` | Streaming variant. No fallback — uses first available provider. |
| `createEmbedding(input, options)` | Generates vector embeddings. Picks first embedding-capable provider. |
| `createMultimodalCompletion(options, context)` | Vision + text. Only routes to multimodal-capable providers. |
| `clearTenantCache(tenantId)` | Called by config service after any config change. |

---

## 7. Encryption Utility (`utils/encryption.js`)

| Function | Signature | Description |
| :--- | :--- | :--- |
| `encrypt(plaintext)` | `(string) → string` | AES-256-GCM encrypt. Returns `iv:authTag:ciphertext` (all base64) |
| `decrypt(encryptedStr)` | `(string) → string` | Reverses encryption. Throws if format invalid or key wrong |
| `maskApiKey(key)` | `(string) → string` | Returns `"first8chars...last4"`. Returns `'****'` if key < 16 chars |

**Environment variable required**: `ENCRYPTION_KEY` — a 64-character hex string (32 bytes).
