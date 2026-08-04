# Audit Log Service - Integration Testing Document

---

## 1. Integration Testing Strategy
Integration tests verify the correct cooperation between different layers of the Audit Log Service: HTTP middleware, controllers, database models, and the PostgreSQL storage layer. Testing also checks authentication, tenant context injection, and permission boundaries.

Testing focus areas:
1.  **Middleware Execution**: Ensuring `auditMiddleware` correctly intercepts active routes, calls `setImmediate()`, and writes audit records to the database.
2.  **Sequelize Associations**: Checking that audit logs are correctly linked to user, tenant, and module entities.
3.  **Tenancy Separation**: Validating that tenant admins cannot retrieve data from other tenants' logs during queries, exports, or statistical calculations.

---

## 2. Integration Test Cases (supertest Example)

### 2.1 Testing Ingestion Flow via REST Endpoint
```javascript
const request = require('supertest');
const { expect } = require('chai');
const app = require('../../src/app');
const Auditlog = require('../../src/sequelize-models/audit_log');

describe('Audit Log Integration', () => {
  let tenantAdminToken;
  let tenantId = '352d7e21-5155-4ff8-8169-284bf5ece3e7';

  before(async () => {
    // Acquire active tenant admin token (authentication bypass or mock helper)
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'tenant8admin@gmail.com', password: 'Password12345' });
    tenantAdminToken = loginRes.body.data.access_token;
  });

  it('should automatically generate an audit log on resource modification', async () => {
    // 1. Perform action on some resource (e.g. creating a dummy designation)
    const resourceRes = await request(app)
      .post('/api/v1/designations')
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .send({ name: 'Quality Lead Analyst', code: 'QLA' });

    expect(resourceRes.status).to.equal(201);
    const createdResourceId = resourceRes.body.data.id;

    // Wait short time to allow setImmediate out-of-band audit operation to finish
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. Query the audit logs database directly to check if the action was captured
    const capturedLog = await Auditlog.findOne({
      where: {
        resource_id: createdResourceId,
        action: 'CREATE',
        tenant_id: tenantId
      }
    });

    expect(capturedLog).to.not.be.null;
    expect(capturedLog.request_method).to.equal('POST');
    expect(capturedLog.response_status).to.equal(201);
  });
});
```

### 2.2 Testing Statistical Aggregations
*   **Verification Objective**: Assert that `/api/v1/audit-logs/stats` correctly rolls up counts by action and day.
*   **Methodology**:
    1. Log in and acquire a valid Tenant Admin JWT.
    2. Read initial statistics payload.
    3. Perform 3 resource creation calls.
    4. Call the stats endpoint again.
    5. Compare counts and verify that the `CREATE` action count has increased by exactly 3.
