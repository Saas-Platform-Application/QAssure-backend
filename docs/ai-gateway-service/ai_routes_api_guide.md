# QAssure Platform AI Routes API Guide (Knowledge Transfer)

This document provides a detailed API reference and architecture guide for the QAssure Platform's **AI Gateway Routes** (`ai.routes.js`). It is designed to assist client developers in understanding, maintaining, testing, and expanding the AI API endpoints.

---

## 1. Global Middleware Pipeline

Every route defined under the `/api/v1/ai` prefix passes through the following two global Express middlewares:

1. **`authenticate`**
   - **Role**: Validates the JSON Web Token (JWT) in the `Authorization` header.
   - **Context Injection**: Sets `req.user` with fields like `id`, `tenantId`, `role`, and `roles`.
   - **Failure**: Returns `401 Unauthorized` if the token is missing, expired, or invalid.

2. **`tenantContext`**
   - **Role**: Extracts and enforces the current tenant's context boundary.
   - **Context Injection**: populates `req.tenantId` (or validates that the user belongs to the requested tenant) to prevent cross-tenant data leaks.
   - **Failure**: Returns `403 Forbidden` if tenant boundary validation fails.

---

## 2. API Routes Summary Matrix

| Method | Endpoint | Allowed Roles | Permission | Validation Schema | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/ai/providers` | All | `ai:read` | None | Get available providers for tenant |
| `GET` | `/api/v1/ai/providers/:provider/health` | All | `ai:read` | `ProviderParamsSchema` | Live health check for a single provider |
| `GET` | `/api/v1/ai/models` | All | `ai:read` | None | Get supported models & pricing |
| `GET` | `/api/v1/ai/health` | All | `ai:read` | None | Check health of all providers |
| `POST` | `/api/v1/ai/completions` | All | `ai:create` | `CreateCompletionSchema` | Execute a logged completion request |
| `GET` | `/api/v1/ai/completions` | All | `ai:read` | `ListCompletionsQuerySchema` | List historical completions |
| `GET` | `/api/v1/ai/completions/:id` | All | `ai:read` | `IdParamsSchema` | Get details of a single completion |
| `GET` | `/api/v1/ai/costs` | All | `ai:read` | `CostQuerySchema` | Fetch token usage cost stats |
| `POST` | `/api/v1/ai/playground` | All | `ai:create` | `PlaygroundSchema` | Test completions without saving history |
| `GET` | `/api/v1/ai/fallbacks` | Super Admin | `ai:read` | `ListFallbacksQuerySchema` | Get failover incidents logs |
| `GET` | `/api/v1/ai/fallback-order` | Super Admin | `ai:read` | None | Fetch default fallback priority order |
| `POST` | `/api/v1/ai/fallback-order` | Super Admin | `ai:create` | `UpdateFallbackOrderSchema` | Update default fallback priority order |
| `GET` | `/api/v1/ai/fallback-mapping` | Super Admin | `ai:read` | None | Fetch mapping of provider failovers |
| `POST` | `/api/v1/ai/fallback-mapping` | Super Admin | `ai:create` | `UpdateFallbackMappingSchema` | Set target fallback mapping |

---

## 3. Route Details and Payload Specifications

### 3.1. Providers Configuration & Status

#### Get Active Providers
* **Route**: `GET /api/v1/ai/providers`
* **Authorization Guard**: `authorize('ai:read')`
* **Zod Schema**: None
* **Controller**: `aiController.getProviders`
* **Logic**: Queries the active tenant's configurations to list which providers (e.g. `openai`, `gemini`, `anthropic`, `open-source`) are configured, active, and available for use.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "provider": "openai",
        "displayName": "Production OpenAI",
        "configType": "direct",
        "isActive": true
      },
      {
        "provider": "gemini",
        "displayName": "Google Gemini",
        "configType": "direct",
        "isActive": true
      }
    ]
  }
  ```

#### Get Provider Health Check
* **Route**: `GET /api/v1/ai/providers/:provider/health`
* **Authorization Guard**: `authorize('ai:read')`
* **Zod Schema**: `ProviderParamsSchema` (validates path parameter `provider`)
  ```javascript
  const ProviderParamsSchema = z.object({
    provider: z.string().min(1).max(100)
  });
  ```
* **Controller**: `aiController.getProviderHealth`
* **Logic**: Resolves the decryption keys for the specific provider from `tenant_ai_configs` and triggers a simple hello/ping query to check its latency and validity.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "provider": "openai",
      "status": "healthy",
      "latency_ms": 142,
      "last_checked": "2026-06-11T06:00:00.000Z"
    }
  }
  ```

#### Get All Providers Health Status
* **Route**: `GET /api/v1/ai/health`
* **Authorization Guard**: `authorize('ai:read')`
* **Zod Schema**: None
* **Controller**: `aiController.getHealthStatus`
* **Logic**: Runs parallelized checks across all registered providers inside the tenant's workspace and aggregates status results.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "openai": { "status": "healthy", "latency_ms": 128 },
      "gemini": { "status": "degraded", "error": "Rate limit exceeded" }
    }
  }
  ```

---

### 3.2. Model Details
* **Route**: `GET /api/v1/ai/models`
* **Authorization Guard**: `authorize('ai:read')`
* **Zod Schema**: None
* **Controller**: `aiController.getModels`
* **Logic**: Returns lists of supported models mapped to pricing schemes (input cost per million tokens, output cost per million tokens) based on tenant configuration and system defaults.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "openai": [
        { "model": "gpt-4o", "max_tokens": 4096, "input_cost_per_1m": 5.0, "output_cost_per_1m": 15.0 },
        { "model": "gpt-3.5-turbo", "max_tokens": 4096, "input_cost_per_1m": 0.5, "output_cost_per_1m": 1.5 }
      ]
    }
  }
  ```

---

### 3.3. Prompt Executions & Completions

#### Create Completion
* **Route**: `POST /api/v1/ai/completions`
* **Authorization Guard**: `authorize('ai:create')`
* **Zod Schema**: `CreateCompletionSchema` (body)
  ```javascript
  const CreateCompletionSchema = z.object({
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().min(1).max(100000)
    })).min(1).max(100),
    model: z.string().max(100).optional(),
    provider: z.string().min(1).max(100).optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().min(1).max(128000).optional(),
    top_p: z.number().min(0).max(1).optional(),
    stop: z.union([z.string(), z.array(z.string().max(100)).max(4)]).optional()
  });
  ```
* **Controller**: `aiController.createCompletion`
* **Logic**:
  1. Validates schema payload.
  2. Forwards request payload to `aiService.createCompletion()`.
  3. Invokes `AIGatewayService` to resolve tenant configuration and invoke target provider models.
  4. Persists the transaction in `ai_completions` database with latency, tokens, cost calculations, and fallback markers (if a backup provider was triggered).
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "e229c9df-ffde-4a94-9669-0260408544cb",
      "content": "Hello! I am ready to assist with QAssure auditing requirements.",
      "role": "assistant",
      "provider": "openai",
      "model": "gpt-4o",
      "usage": {
        "prompt_tokens": 15,
        "completion_tokens": 12,
        "total_tokens": 27
      },
      "cost": 0.000255,
      "latency_ms": 530,
      "fallbackUsed": false
    }
  }
  ```

#### List Completion Logs
* **Route**: `GET /api/v1/ai/completions`
* **Authorization Guard**: `authorize('ai:read')`
* **Zod Schema**: `ListCompletionsQuerySchema` (query parameters)
  ```javascript
  const ListCompletionsQuerySchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().max(100)).optional(),
    provider: z.string().min(1).max(100).optional(),
    model: z.string().max(100).optional(),
    user_id: z.string().uuid().optional(),
    module_id: z.string().uuid().optional(),
    start_date: optionalDateQuery,
    end_date: optionalDateQuery,
    status: z.enum(['completed', 'failed', 'pending']).optional()
  });
  ```
* **Controller**: `aiController.listCompletions`
* **Logic**: Retrieves paginated audit completions history for the active tenant.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "e229c9df-ffde-4a94-9669-0260408544cb",
        "provider": "openai",
        "model": "gpt-4o",
        "status": "completed",
        "total_tokens": 27,
        "cost_usd": 0.000255,
        "created_at": "2026-06-11T06:07:00.000Z"
      }
    ],
    "pagination": {
      "total": 124,
      "page": 1,
      "limit": 20,
      "pages": 7
    }
  }
  ```

#### Get Completion Details
* **Route**: `GET /api/v1/ai/completions/:id`
* **Authorization Guard**: `authorize('ai:read')`
* **Zod Schema**: `IdParamsSchema` (verifies UUID)
  ```javascript
  const IdParamsSchema = z.object({
    id: z.string().uuid()
  });
  ```
* **Controller**: `aiController.getCompletion`
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "e229c9df-ffde-4a94-9669-0260408544cb",
      "tenant_id": "890ff456-11f2-4da4-9889-ff0123456789",
      "user_id": "a119c8de-a901-44de-9922-0a1122334455",
      "provider": "openai",
      "model": "gpt-4o",
      "prompt": "[System: ...][User: Hello]",
      "response": "Hello! I am ready to assist...",
      "prompt_tokens": 15,
      "completion_tokens": 12,
      "total_tokens": 27,
      "cost_usd": 0.000255,
      "latency_ms": 530,
      "status": "completed",
      "created_at": "2026-06-11T06:07:00.000Z"
    }
  }
  ```

---

### 3.4. Token Costs and Summaries
* **Route**: `GET /api/v1/ai/costs`
* **Authorization Guard**: `authorize('ai:read')`
* **Zod Schema**: `CostQuerySchema` (query)
  ```javascript
  const CostQuerySchema = z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    group_by: z.enum(['day', 'week', 'month']).optional()
  });
  ```
* **Controller**: `aiController.getCostSummary`
* **Logic**: Processes sum aggregations on `ai_completions` and daily usage caches (`ai_usage`) to output cost structures.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "total_cost": 42.15,
      "currency": "USD",
      "breakdown": [
        { "period": "2026-06-10", "cost": 15.10, "tokens": 820000 },
        { "period": "2026-06-11", "cost": 27.05, "tokens": 1450000 }
      ]
    }
  }
  ```

---

### 3.5. Playground Operations
* **Route**: `POST /api/v1/ai/playground`
* **Authorization Guard**: `authorize('ai:create')`
* **Zod Schema**: `PlaygroundSchema` (body)
  ```javascript
  const PlaygroundSchema = z.object({
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().min(1).max(100000)
    })).min(1).max(100),
    model: z.string().max(100).optional(),
    provider: z.string().min(1).max(100).optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().min(1).max(128000).optional()
  });
  ```
* **Controller**: `aiController.playground`
* **Logic**: Bypasses the telemetry/database logs (`ai_completions`) completely. Calls `AIGatewayService` directly to test model outputs. Ideal for debugging connectivity, prompt latency, and system keys directly.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "content": "This is a direct playground validation response.",
      "provider": "openai",
      "model": "gpt-4o",
      "usage": { "prompt_tokens": 10, "completion_tokens": 9, "total_tokens": 19 },
      "cost": 0.000185,
      "latency_ms": 320,
      "fallbackUsed": false
    }
  }
  ```

---

### 3.6. Resiliency Controls (Super Admin Only)

All fallback configuration modifications are restricted to Platform **Super Admins**.

#### List Fallback Incidents
* **Route**: `GET /api/v1/ai/fallbacks`
* **Guards**: `requireSuperAdmin` + `authorize('ai:read')`
* **Zod Schema**: `ListFallbacksQuerySchema`
  ```javascript
  const ListFallbacksQuerySchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().max(100)).optional()
  });
  ```
* **Controller**: `aiController.listFallbacks`
* **Logic**: Displays records from `ai_fallbacks` detailing failover history across all tenants.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "c88f11ba-0012-4aa3-bb66-0260408511cb",
        "tenant_id": "890ff456-11f2-4da4-9889-ff0123456789",
        "failed_provider": "openai",
        "failed_model": "gpt-4o",
        "fallback_provider": "gemini",
        "fallback_model": "gemini-1.5-pro",
        "error_message": "Rate limit exceeded (Status Code 429)",
        "created_at": "2026-06-11T05:30:00.000Z"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 20, "pages": 1 }
  }
  ```

#### Get Fallback Priority Order Array
* **Route**: `GET /api/v1/ai/fallback-order`
* **Guards**: `requireSuperAdmin` + `authorize('ai:read')`
* **Controller**: `aiController.getFallbackOrderSetting`
* **Logic**: Retrieves the order of providers evaluated when no explicit mapping matches.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": ["openai", "anthropic", "gemini", "open-source"]
  }
  ```

#### Update Fallback Priority Order Array
* **Route**: `POST /api/v1/ai/fallback-order`
* **Guards**: `requireSuperAdmin` + `authorize('ai:create')`
* **Zod Schema**: `UpdateFallbackOrderSchema`
  ```javascript
  const UpdateFallbackOrderSchema = z.object({
    fallback_order: z.array(z.string().min(1).max(50)).min(1).max(10)
  });
  ```
* **Controller**: `aiController.updateFallbackOrderSetting`
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": ["openai", "gemini", "open-source"]
  }
  ```

#### Get Per-Provider Fallback Mappings
* **Route**: `GET /api/v1/ai/fallback-mapping`
* **Guards**: `requireSuperAdmin` + `authorize('ai:read')`
* **Controller**: `aiController.getFallbackMappingSetting`
* **Logic**: Resolves direct provider mappings (e.g. if A fails, immediately failover to B).
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "openai": "gemini",
      "anthropic": "openai",
      "gemini": "open-source"
    }
  }
  ```

#### Update Per-Provider Fallback Mappings
* **Route**: `POST /api/v1/ai/fallback-mapping`
* **Guards**: `requireSuperAdmin` + `authorize('ai:create')`
* **Zod Schema**: `UpdateFallbackMappingSchema`
  ```javascript
  const UpdateFallbackMappingSchema = z.object({
    mapping: z.record(z.string().min(1).max(100), z.string().min(1).max(100))
  });
  ```
* **Controller**: `aiController.updateFallbackMappingSetting`
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "openai": "gemini",
      "anthropic": "openai"
    }
  }
  ```

---

## 4. Error Response Format and Codes

When an execution or authorization fails, the API responds with consistent JSON blocks:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message describing the error",
    "provider": "openai" 
  }
}
```

> [!NOTE]
> The `provider` field inside the `error` block is populated when the error originated directly from an upstream API provider (e.g. Rate limits, authorization issues at OpenAI or Google Gemini).

### Standard Error Codes Map

| HTTP Status | Error Code (`error.code`) | Scenario |
| :--- | :--- | :--- |
| `400` | `INVALID_INPUT` | Payload fails Zod validation criteria (e.g., missing messages, invalid formats). |
| `401` | `AUTH_FAILED` | Upstream provider credentials/API Key rejected client request. |
| `403` | `FORBIDDEN` | Missing required permission scope (`ai:read` or `ai:create`) or failing tenant context isolation. |
| `429` | `RATE_LIMITED` | Tenant hit token/request rate limits either on QAssure platform or upstream provider. |
| `503` | `NO_PROVIDERS` | All configured providers and system backup pathways are offline or exhausted. |
| `500` | `SERVER_ERROR` / `AI_ERROR` | Database connectivity failures, unhandled code bugs, or general gateway failures. |
