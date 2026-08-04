# QAssure AI Config Service — Testing & Test Cases Document

---

## 1. Test Strategy

AI Config testing spans four dimensions:

1. **Validation**: Zod schema enforcement for all input types.
2. **Encryption**: API key encryption, decryption, and masking correctness.
3. **CRUD Lifecycle**: Upsert, list, get, delete behavior against the database.
4. **Provider Connectivity**: Real end-to-end health check verification.

---

## 2. Test Case Matrix

| ID | Endpoint | Feature | Description | Input | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AIC-TC-01** | `POST /ai-config` | Upsert | Create new OpenAI direct config | Valid body, `config_type: "direct"` | 200. Config created. `api_key_masked` in response. Raw key not present. |
| **AIC-TC-02** | `POST /ai-config` | Upsert | Update existing config (same provider) | Same `provider`, new `api_key` | 200. Record updated (no duplicate). `last_error` reset to `null`. |
| **AIC-TC-03** | `POST /ai-config` | Validation | Azure config without endpoint | `config_type: "azure"`, no `endpoint` | 400. Zod error on `endpoint` field. |
| **AIC-TC-04** | `POST /ai-config` | Validation | Azure config without deployment | `config_type: "azure"`, no `deployment` | 400. Zod error on `endpoint` path (refinement). |
| **AIC-TC-05** | `POST /ai-config` | Validation | Open-source provider without endpoint | `provider: "Mistral 7B"`, no `endpoint` | 400. Zod refinement fails: endpoint required. |
| **AIC-TC-06** | `POST /ai-config` | Validation | API key too short | `api_key: "short"` | 400. `api_key` must be at least 10 characters. |
| **AIC-TC-07** | `POST /ai-config` | Validation | Invalid `config_type` | `config_type: "gcp"` | 400. `config_type` must be `"azure"` or `"direct"`. |
| **AIC-TC-08** | `POST /ai-config` | Validation | Too many custom models | `custom_models: [21 entries]` | 400. Array must have at most 20 elements. |
| **AIC-TC-09** | `POST /ai-config` | Validation | Negative pricing value | `custom_pricing: { "gpt-4o": { "input": -1, "output": 0 } }` | 400. Input price must be >= 0. |
| **AIC-TC-10** | `POST /ai-config` | Auth | Missing JWT | No Authorization header | 401. MISSING_TOKEN |
| **AIC-TC-11** | `POST /ai-config` | Auth | Missing `ai:create` permission | User without `ai:create` | 403. FORBIDDEN |
| **AIC-TC-12** | `POST /ai-config` | Tenant | Missing tenant context | No JWT tenant + no `x-tenant-id` | 400. MISSING_TENANT |
| **AIC-TC-13** | `GET /ai-config` | List | List all tenant configs | Valid JWT with `ai:read` | 200. Array of configs. All `api_key` fields masked. |
| **AIC-TC-14** | `GET /ai-config` | List | Empty list | Tenant with no configs | 200. `data: []` |
| **AIC-TC-15** | `GET /ai-config` | Auth | Missing `ai:read` permission | User without `ai:read` | 403. FORBIDDEN |
| **AIC-TC-16** | `GET /ai-config/:provider` | Get | Get existing provider | `provider: "openai"` | 200. Single config object with masked key. |
| **AIC-TC-17** | `GET /ai-config/:provider` | Get | Get non-existent provider | `provider: "unknown"` | 404. `NOT_FOUND` |
| **AIC-TC-18** | `GET /ai-config/:provider` | Isolation | Get Tenant A's provider using Tenant B token | Cross-tenant attempt | 404. Record not found (scoped by tenantId). |
| **AIC-TC-19** | `DELETE /ai-config/:provider` | Delete | Delete existing provider | `provider: "anthropic"` | 200. `"anthropic config removed"`. |
| **AIC-TC-20** | `DELETE /ai-config/:provider` | Delete | Delete non-existent provider | `provider: "gemini"` (not configured) | 404. `NOT_FOUND` |
| **AIC-TC-21** | `DELETE /ai-config/:provider` | Auth | Missing `ai:delete` permission | User without `ai:delete` | 403. FORBIDDEN |
| **AIC-TC-22** | `POST /ai-config/:provider/test` | Test | Test valid OpenAI key | `provider: "openai"`, real key | 200. `healthy: true`, `latency_ms` populated. |
| **AIC-TC-23** | `POST /ai-config/:provider/test` | Test | Test invalid API key | `provider: "openai"`, wrong key stored | 200. `healthy: false`, `error: "401 Unauthorized"`. |
| **AIC-TC-24** | `POST /ai-config/:provider/test` | Test | Test with optional model override | `{ model: "gpt-4o-mini" }` | 200. Response includes `model: "gpt-4o-mini"`. |
| **AIC-TC-25** | `POST /ai-config/:provider/test` | Test | Test non-existent provider | `provider: "unconfigured"` | 500. `TEST_FAILED`. |
| **AIC-TC-26** | `POST /ai-config/:provider/test` | Test | Test Azure OpenAI | Azure config stored | 200. `healthy: true` or `false` with error message. |
| **AIC-TC-27** | `POST /ai-config/:provider/test` | Test | Test open-source vLLM endpoint | `provider: "Mistral 7B"` | 200. Health based on vLLM server availability. |
| **AIC-TC-28** | `POST /ai-config/:provider/test` | Side Effect | Verify DB updated after test | Any test | `last_verified_at` set. `last_error` cleared on success. |
| **AIC-TC-29** | `POST /ai-config` | Encryption | Verify key never appears raw | Any upsert | Response `api_key_masked` is `"first8...last4"`. DB `encrypted_api_key` starts with base64. |
| **AIC-TC-30** | *Internal* | Cache | Cache invalidated after upsert | Upsert config | Subsequent `getActiveConfigs()` hits DB, not cache. |
| **AIC-TC-31** | *Internal* | Cache | Cache invalidated after delete | Delete config | Gateway provider cache cleared for tenant. |
| **AIC-TC-32** | *Internal* | Fallback | Tenant uses global config if no custom | Tenant with no configs, global config present | AI calls use global configs (UUID `00000000-...0001`). |
| **AIC-TC-33** | `POST /ai-config` | Embedding | Config with embedding models | `custom_embedding_models: ["nomic-embed-text"]` | 200. Embedding model stored and returned. |
| **AIC-TC-34** | `POST /ai-config` | Fallback | Config with `fallback_provider` | `fallback_provider: "anthropic"` | 200. Stored. Gateway uses anthropic if primary fails. |

---

## 3. Step-by-Step Test Scenarios

### Scenario A: Full BYOK OpenAI Configuration Lifecycle

1. **Create** — `POST /ai-config` with `{ provider: "openai", config_type: "direct", api_key: "sk-proj-...", default_model: "gpt-4o" }` → 200. Check `api_key_masked` is returned, not the raw key.
2. **List** — `GET /ai-config` → 200. Exactly 1 config with `provider: "openai"`.
3. **Get** — `GET /ai-config/openai` → 200. Same object.
4. **Test** — `POST /ai-config/openai/test` → 200. `healthy: true`. DB row `last_verified_at` is now set.
5. **Update** — `POST /ai-config` again with same `provider` but new `api_key` → 200. Row updated, not duplicated. `last_error: null`.
6. **Delete** — `DELETE /ai-config/openai` → 200. `GET /ai-config/openai` now returns 404.

### Scenario B: Azure OpenAI Config Validation

1. **Fail missing endpoint** — `POST /ai-config` with `config_type: "azure"`, no `endpoint` → 400. `details[0].path: ["endpoint"]`.
2. **Fail missing deployment** — Add `endpoint` but no `deployment` → 400.
3. **Succeed** — Add both `endpoint` and `deployment` → 200. Config created.

### Scenario C: Open-Source BYOK Provider

1. **Create** — `POST /ai-config` with `{ provider: "Mistral 7B", config_type: "direct", api_key: "any-key", endpoint: "http://vllm:8000/v1", default_model: "Mistral 7B" }` → 200.
2. **Test** — `POST /ai-config/Mistral 7B/test` → 200. Health depends on vLLM server. `model` in response is `"Mistral 7B"`.
3. **Verify Gateway routing** — After config created, any AI call for this tenant should resolve `Mistral 7B` as the provider.

### Scenario D: Tenant Isolation Test

1. Login as **Tenant A admin**. Create `openai` config.
2. Login as **Tenant B admin**. Attempt `GET /ai-config/openai` → **404** (Tenant B has no `openai` config).
3. Verify both tenants' configs remain independent via separate list calls.

### Scenario E: Failed Test Connection Logging

1. Create config with a deliberately wrong `api_key`.
2. `POST /ai-config/openai/test` → 200. `{ healthy: false, error: "401 Unauthorized..." }`.
3. Check DB: `last_error` column is set to the error string. `last_verified_at` is still set (test ran, even if unhealthy).
4. Fix the key via upsert. `last_error` is reset to `NULL` by the ON CONFLICT clause.
