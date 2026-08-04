# QAssure AI Gateway Service — Codebase & API Documentation

---

## 1. Directory Structure

The files implementing the AI Gateway are organized as follows:

```
src/
├── routes/
│   └── ai.routes.js                        # Express routes for Gateway operations
├── validation/
│   └── ai.schema.js                        # Zod payload schemas
├── controllers/
│   └── ai.controller.js                    # HTTP handler functions
├── services/
│   ├── ai.service.js                       # Usage accounting and PG store operations
│   └── system-config.service.js            # Key-value fallback settings storage
└── infrastructure/
    └── ai/
        ├── gateway.service.js              # Routing and dynamic failovers
        └── providers/
            ├── openai.provider.js          # OpenAI adapter
            ├── anthropic.provider.js       # Anthropic adapter
            ├── gemini.provider.js          # Gemini adapter
            └── opensource.provider.js      # OpenSource adapter
```

---

## 2. Express Route Registry

All routes require JWT Authentication (`authenticate`) and tenant isolation context (`tenantContext`). Prefix: `/api/v1/ai`.

| Method | Endpoint | Action | RBAC Permission | Scope |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/providers` | List available providers | `ai:read` | Tenant |
| **GET** | `/providers/:provider/health` | Check health status of provider | `ai:read` | Tenant |
| **GET** | `/models` | List all available models & costs | `ai:read` | Tenant |
| **GET** | `/health` | Check health status of all providers | `ai:read` | Tenant |
| **POST** | `/completions` | Create completion and track stats | `ai:create` | Tenant |
| **GET** | `/completions` | List historical completions | `ai:read` | Tenant |
| **GET** | `/completions/:id` | Get single completion log | `ai:read` | Tenant |
| **GET** | `/costs` | View cost reporting summary | `ai:read` | Tenant |
| **POST** | `/playground` | Run completion (bypasses log tracking) | `ai:create` | Tenant |
| **GET** | `/fallbacks` | List failover logs | `ai:read` | Super Admin |
| **GET** | `/fallback-order` | Fetch fallback execution order | `ai:read` | Super Admin |
| **POST** | `/fallback-order` | Update fallback execution order | `ai:create` | Super Admin |
| **GET** | `/fallback-mapping` | Fetch provider-to-provider mappings | `ai:read` | Super Admin |
| **POST**| `/fallback-mapping` | Update provider-to-provider mappings | `ai:create` | Super Admin |

---

## 3. Zod Validation Schemas

Enforced via `validate()` middleware.

### 3.1 `CreateCompletionSchema`
```javascript
const CreateCompletionSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant'], { message: "role must be 'system', 'user', or 'assistant'" }),
    content: z.string().min(1, 'content cannot be empty').max(100000, 'content too long')
  })).min(1, 'messages array cannot be empty').max(100, 'Too many messages'),
  model: z.string().max(100).optional(),
  provider: z.string().min(1, 'Provider name is required').max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(128000).optional(),
  top_p: z.number().min(0).max(1).optional(),
  stop: z.union([z.string(), z.array(z.string().max(100)).max(4)]).optional()
});
```

### 3.2 `ListCompletionsQuerySchema`
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

### 3.3 `UpdateFallbackOrderSchema`
```javascript
const UpdateFallbackOrderSchema = z.object({
  fallback_order: z.array(z.string().min(1).max(50)).min(1, 'fallback_order cannot be empty').max(10),
});
```

### 3.4 `UpdateFallbackMappingSchema`
```javascript
const UpdateFallbackMappingSchema = z.object({
  mapping: z.record(z.string().min(1).max(100), z.string().min(1).max(100))
});
```

---

## 4. API Request/Response Examples

### 4.1 Create Completion (`POST /completions`)
Submits messages to the active provider.

**Request payload**:
```json
{
  "messages": [
    { "role": "system", "content": "You are a translation assistant." },
    { "role": "user", "content": "Translate 'Hello' to French." }
  ],
  "provider": "openai",
  "model": "gpt-4o",
  "temperature": 0.3,
  "max_tokens": 100
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "c00ef601-5d9c-44bb-9993-e02ac1671bd8",
    "provider": "openai",
    "model": "gpt-4o",
    "content": "Bonjour",
    "usage": {
      "prompt_tokens": 20,
      "completion_tokens": 2,
      "total_tokens": 22
    },
    "cost": 0.00012,
    "latency_ms": 350,
    "fallbackUsed": false,
    "created_at": "2026-06-19T13:00:00.000Z"
  }
}
```

---

### 4.2 Get Cost Summary (`GET /costs`)
Returns cost metrics grouped by provider or model.

**Query params**:
- `start_date`: `"2026-06-19T00:00:00Z"`
- `end_date`: `"2026-06-19T23:59:59Z"`
- `group_by`: `"day"`

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_completions": 1420,
      "total_tokens": 850400,
      "total_cost": 2.451000,
      "avg_latency_ms": 1150
    },
    "by_provider": [
      { "provider": "openai", "completions": 920, "tokens": 520000, "cost": 1.850000 },
      { "provider": "gemini", "completions": 500, "tokens": 330400, "cost": 0.601000 }
    ],
    "by_model": [
      { "model": "gpt-4o", "provider": "openai", "completions": 920, "tokens": 520000, "cost": 1.850000 },
      { "model": "gemini-1.5-pro", "provider": "gemini", "completions": 500, "tokens": 330400, "cost": 0.601000 }
    ]
  }
}
```

---

### 4.3 Update Fallback Order (`POST /fallback-order`)
Configures provider priorities (Super Admin only).

**Request payload**:
```json
{
  "fallback_order": ["openai", "gemini", "anthropic", "open-source"]
}
```

**Response**:
```json
{
  "success": true,
  "data": ["openai", "gemini", "anthropic", "open-source"]
}
```
