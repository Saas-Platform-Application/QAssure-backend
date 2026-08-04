# QAssure Prompt Management Service — Codebase & API Documentation

---

## 1. Directory Structure

The files implementing prompt management are organized as follows:

```
src/
├── routes/
│   └── prompt.routes.js                    # Express route definitions & upload configuration
├── validation/
│   └── prompt.schema.js                    # Zod payload schemas
├── controllers/
│   └── prompt.controller.js                # Request processing and SSE stream headers
├── services/
│   ├── prompt.service.js                   # Core CRUD, versioning, playground, and logging
│   └── execution-registry.service.js       # In-memory abort signal tracking
└── infrastructure/
    └── ai/
        ├── gateway.service.js              # BYOK resolving and fallback completions
        └── document.processor.js           # Multi-format parsing and vision formatting
```

---

## 2. Express Route Registry

All routes require JWT Authentication (`authenticate`) and tenant isolation context (`tenantContext`). Prefix: `/api/v1/ai/prompts`.

| Method | Endpoint | Action | RBAC Permission |
| :--- | :--- | :--- | :--- |
| **POST** | `/` | Create prompt template | `ai:create` |
| **GET** | `/` | List prompts (paginated, filtered) | `ai:read` |
| **GET** | `/:id` | Get single prompt template | `ai:read` |
| **PUT** | `/:id` | Update prompt template | `ai:create` |
| **PATCH**| `/:id/status` | Change prompt lifecycle state | `ai:create` |
| **DELETE**| `/:id` | Permanent delete (transactional) | `ai:delete` |
| **POST** | `/:id/clone` | Duplicate prompt to draft | `ai:create` |
| **GET** | `/:id/versions` | List prompt version history | `ai:read` |
| **GET** | `/:id/versions/:version` | Get specific historical version | `ai:read` |
| **POST** | `/:id/rollback` | Revert template to old version | `ai:create` |
| **POST** | `/:id/execute` | Run completion (JSON or SSE) | `ai:create` |
| **POST** | `/:id/cancel` | Abort active completion run | `ai:create` |
| **POST** | `/:id/execute-with-file` | Extract/rasterize upload & run | `ai:create` |
| **POST** | `/:id/test` | Test execution (bypasses active check) | `ai:create` |
| **POST** | `/:id/test-cases` | Create test input scenario | `ai:create` |
| **GET** | `/:id/test-cases` | List test scenarios | `ai:read` |
| **POST** | `/test-cases/:testCaseId/run`| Run test case and log result | `ai:create` |
| **GET** | `/test-cases/:testCaseId/results`| Get past results for test case | `ai:read` |
| **GET** | `/:id/executions` | View execution history + averages | `ai:read` |

---

## 3. Zod validation Schemas

Enforced via `validate()` middleware.

### 3.1 `CreatePromptSchema`
```javascript
const CreatePromptSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).optional(),
  use_case: z.string().min(1).max(100),
  system_message: z.string().max(50000).optional(),
  user_template: z.string().min(1, 'User template is required').max(50000),
  model: z.string().max(100).optional(),
  provider: z.string().min(1, 'Provider name is required').max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(128000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  variables: z.array(z.object({
    name: z.string().min(1).max(100),
    type: z.enum(['string', 'number', 'boolean', 'array']).optional(),
    required: z.boolean().optional(),
    default: z.any().optional()
  })).optional(),
  is_default: z.boolean().optional(),
  change_notes: z.string().max(1000).optional(),
  module_ids: z.array(z.string().uuid()).max(50).optional().nullable(),
  module_id: z.string().uuid().optional().nullable()
});
```

### 3.2 `ExecutePromptSchema`
```javascript
const ExecutePromptSchema = z.object({
  variables: z.record(z.string(), z.any()).optional(),
  model: z.string().max(100).optional(),
  provider: z.string().min(1).max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(128000).optional(),
  stream: z.boolean().optional()
});
```

### 3.3 `ListPromptsQuerySchema`
```javascript
const ListPromptsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().max(100)).optional(),
  use_case: z.string().max(100).optional(),
  status: z.enum(['draft', 'active', 'archived', 'deprecated']).optional(),
  search: z.string().max(200).optional(),
  tags: z.string().max(500).optional(),
  module_id: z.string().uuid().optional().nullable()
});
```

---

## 4. API Request/Response Examples

### 4.1 Execute Prompt (`POST /:id/execute`)
Runs the prompt template using variables.

**Request payload**:
```json
{
  "variables": {
    "user_name": "John Doe",
    "project_scope": "Building a react dashboard"
  },
  "provider": "openai",
  "model": "gpt-4o",
  "temperature": 0.5,
  "max_tokens": 500,
  "stream": false
}
```

**Response (Standard)**:
```json
{
  "success": true,
  "data": {
    "promptId": "50c60810-7213-41bb-b850-2d88ad1779ba",
    "promptVersion": 3,
    "content": "Here is the summary of the project scope for John Doe...",
    "provider": "openai",
    "model": "gpt-4o",
    "usage": {
      "prompt_tokens": 120,
      "completion_tokens": 85,
      "total_tokens": 205
    },
    "cost": 0.00185,
    "latency_ms": 1150,
    "request_id": "chatcmpl-98a2..."
  }
}
```

**SSE Stream Response Header**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```
**SSE Stream Response Body Chunks**:
```
data: {"clientRequestId":"dfd38a0b-1188-466d-a111-d002ac1671bd"}

data: {"content":"Here"}

data: {"content":" is"}

data: {"content":" the"}

data: {"done":true,"metadata":{"promptId":"50c60810-7213-41bb-b850-2d88ad1779ba","promptVersion":3,"content":"Here is the","provider":"openai","model":"gpt-4o","usage":{"prompt_tokens":120,"completion_tokens":3,"total_tokens":123},"cost":0.000645,"latency_ms":240,"request_id":"chatcmpl-98a2..."}}
```

---

### 4.2 Execute With File (`POST /:id/execute-with-file`)
Takes file as `multipart/form-data`.

**Request Fields**:
- `file`: (binary payload)
- `variables`: `{"subject":"Taxes"}`
- `stream`: `false`
- `provider`: `"gemini"`

**Response**:
```json
{
  "success": true,
  "data": {
    "promptId": "50c60810-7213-41bb-b850-2d88ad1779ba",
    "promptVersion": 2,
    "content": "Analysis of the document subject taxes...",
    "provider": "gemini",
    "model": "gemini-1.5-pro",
    "usage": {
      "prompt_tokens": 4050,
      "completion_tokens": 240,
      "total_tokens": 4290
    },
    "cost": 0.0035,
    "latency_ms": 2840,
    "requestId": "90d1bf2...",
    "fileProcessing": {
      "fileName": "tax_doc.xlsx",
      "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "mode": "text",
      "fileSize": 18204
    }
  }
}
```

---

### 4.3 Get Execution Stats (`GET /:id/executions`)
Returns execution listings along with aggregate performance rates.

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "usage_count": 150,
      "success_rate": 98.67,
      "avg_cost": 0.002451,
      "avg_latency": 1240,
      "failed_runs": 2,
      "success_runs": 148
    },
    "data": [
      {
        "id": "e30129a0-f89a-411a-b333-f09c855a805f",
        "provider": "openai",
        "model": "gpt-4o",
        "status": "completed",
        "cost": 0.00185,
        "latency_ms": 1150,
        "created_at": "2026-06-19T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```
