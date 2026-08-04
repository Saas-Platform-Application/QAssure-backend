# QAssure AI Gateway Service — Testing & Test Cases Document

---

## 1. Test Strategy

Testing of the AI Gateway Service focuses on token routing, billing calculations, fallback behaviors, and tenant isolation:

1. **Authentication & RBAC**: Confirm that only authorized users can request completions, and only Super Admins can modify fallback parameters.
2. **Provider Health & Mapping**: Verify health check status and pricing lookups.
3. **Completion & Playground**: Test both tracked completions (`/completions`) and untracked playground requests (`/playground`).
4. **Resiliency & Fallback Chains**: Verify that failures automatically trigger fallbacks.
5. **Multi-Tenant BYOK isolation**: Confirm that tenants cannot access each other's credentials.

---

## 2. Test Case Matrix

| ID | Endpoint | Scope | Test Scenario | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **GW-TC-01** | `GET /providers` | Metadata | Fetch available providers for a tenant | 200 OK. Returns list of providers and configurations. |
| **GW-TC-02** | `GET /providers/:provider/health`| Health | Check healthy provider connection | 200 OK. Returns `healthy: true` and latency. |
| **GW-TC-03** | `GET /providers/:provider/health`| Health | Check unreachable provider connection | 200 OK. Returns `healthy: false` and error. |
| **GW-TC-04** | `GET /models` | Metadata | Fetch models and cost tables | 200 OK. Returns models and input/output cost structures. |
| **GW-TC-05** | `POST /completions` | Execution | Submit valid completion request | 200 OK. Completion content, token count, and cost returned. |
| **GW-TC-06** | `POST /completions` | Validation | Submit completion with empty message list | 400 Bad Request. Zod returns messages validation error. |
| **GW-TC-07** | `POST /completions` | Validation | Submit temperature parameter out of range (> 2.0) | 400 Bad Request. Zod fails constraints check. |
| **GW-TC-08** | `GET /completions` | Audit | Retrieve list of tenant completions | 200 OK. Paginated completions history. |
| **GW-TC-09** | `GET /completions/:id` | Audit | Fetch completion log details by ID | 200 OK. Returns metadata, prompt, and response. |
| **GW-TC-10** | `GET /costs` | Metrics | Fetch daily cost summary for tenant | 200 OK. Returns summary grouped by model/provider. |
| **GW-TC-11** | `POST /playground` | Playground | Submit playground completion | 200 OK. Returns response. No record created in `ai_completions`. |
| **GW-TC-12** | `GET /fallbacks` | Security | Tenant attempts to access failover logs | 403 Forbidden. Restricted to Super Admin role. |
| **GW-TC-13** | `GET /fallbacks` | Monitoring | Super Admin fetches failover incident history | 200 OK. Returns list of records in `ai_fallbacks`. |
| **GW-TC-14** | `POST /fallback-order` | Resiliency | Update fallback order setting | 200 OK. New order stored, gateway cache cleared. |
| **GW-TC-15** | `POST /fallback-mapping` | Resiliency | Configure provider fallback mapping | 200 OK. Stored globally, gateway cache cleared. |
| **GW-TC-16** | `POST /completions` | Resiliency | Primary provider rate-limited (429 failover test) | 200 OK. Fallback triggered, response contains `fallbackUsed: true`. |
| **GW-TC-17** | `POST /completions` | Security | BYOK cost verification | 200 OK. Response verifies cost is set to 0. |

---

## 3. Step-by-Step Test Scenarios

### Scenario A: Completion Logging and Cost Calculation Flow
1. **Send Request**: Send a `POST /completions` with provider `"openai"` and model `"gpt-4o"`.
2. **Verify Response**: Confirm that token usage counts (`prompt_tokens`, `completion_tokens`) are returned.
3. **Verify Database Log**: Query `ai_completions` for the returned ID. Ensure prompt and response are stored, and cost matches token rates.
4. **Verify Aggregation**: Send a `GET /costs`. Confirm that stats reflect the new execution.

### Scenario B: Dynamic Fallback and Recovery Flow
1. **Configure Fallback**: Update mappings (`POST /fallback-mapping`) to route `"openai"` failures to `"gemini"`.
2. **Simulate Outage**: Temporarily invalidate OpenAI keys to simulate a service outage.
3. **Send Request**: Send a `POST /completions` targeting OpenAI.
4. **Verify Fallback Response**: Confirm the request succeeds, returns content from Gemini, and includes `fallbackUsed: true`.
5. **Verify Incident Log**: Confirm that an entry was added to `ai_fallbacks` with the error description.

### Scenario C: BYOK Cost Suppression Flow
1. **Configure Tenant Key**: Configure tenant-specific credentials in `tenant_ai_configs`.
2. **Send Request**: Send a `POST /completions`.
3. **Verify Billing Output**: Confirm that the returned completion cost is set to `0`, preventing internal billing calculations.
