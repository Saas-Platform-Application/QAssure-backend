# QAssure AI Gateway Service — Integration Testing Document

---

## 1. Integration Scope

Integration testing verifies database interactions, provider routing, failovers, and caching logic:

```
                  +--------------------------------+
                  |    Integration Test Runner     |
                  +--------------------------------+
                                  |
                                  v
                  +--------------------------------+
                  |         Express Router         |
                  +--------------------------------+
                                  |
                                  v
                  +--------------------------------+
                  |          AIController          |
                  +--------------------------------+
                                  |
                                  v
                  +--------------------------------+
                  |           AIService            |
                  +--------------------------------+
                                  |
                                  v
                  +--------------------------------+
                  |        AIGatewayService        |
                  +--------------------------------+
                     /            |             \
                    /             |              \
                   v              v               v
            +------------+  +------------+  +------------+
            |  Database  |  |  Cache Map |  | Providers  |
            +------------+  +------------+  +------------+
```

---

## 2. Database Constraint & Cascading Integrity

Ensures database constraints function correctly.

- **Cascade Deletion**: When a tenant is deleted, all records in `ai_completions`, `ai_usage`, and `ai_fallbacks` must be removed via PostgreSQL foreign key cascades.
- **Unique Constraints**: Daily usage records are constrained by `(tenant_id, provider, model, period_start)`. The integration test must verify that multiple calls within the same day update the existing record rather than creating a new one.

---

## 3. Provider Integration & Fallbacks

Verifies integration with external APIs and failover flows:

- **Mocked Provider Execution**: Tests mock HTTP requests to verify routing behavior.
- **Dynamic Failover Execution**:
  - Simulates connection errors for the primary provider.
  - Verifies that the gateway catches the exception, creates a record in `ai_fallbacks`, and retries using the next provider.
  - Confirms the final response returns content from the fallback provider.

---

## 4. End-to-End Integration Scenarios

### 4.1 Scenario A: completion and Usage Update Flow
1. Send a `POST /completions` request.
2. Verify the response is `200 OK`.
3. Check the database to confirm:
   - A new log has been added to `ai_completions`.
   - The token values and cost estimate are stored.
   - The aggregate record in `ai_usage` has been updated.

### 4.2 Scenario B: Fallback Mapping Update Flow
1. As a super admin, configure a fallback mapping: `POST /fallback-mapping` with `{"openai": "gemini"}`.
2. Send a completion request targeting OpenAI while simulating an outage.
3. Verify that:
   - The gateway automatically retries using Gemini.
   - A failover log is created in `ai_fallbacks`.
   - The response includes `fallbackUsed: true`.

### 4.3 Scenario C: Cache Invalidation Flow
1. As a super admin, update the fallback order setting: `POST /fallback-order`.
2. Confirm the update triggers cache invalidation in `gateway.service`.
3. Send a new completion request and confirm the gateway uses the updated provider order.
