# QAssure Training Service
## Integration Testing Guide

**Document ID:** QASSURE-TRN-INT-001  
**Framework:** Jest + Supertest  
**Last Updated:** 2026-06-29  

---

## 1. Prerequisites

```bash
npm install --save-dev supertest
```

Required environment: A running PostgreSQL test database with all migrations applied.

```bash
# Apply schema migrations to test DB
NODE_ENV=test npm run migrate
```

Test `.env.test`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qassure_test
DB_USER=postgres
DB_PASS=postgres
JWT_SECRET=test-secret-key
```

---

## 2. Test Helper Utilities

```javascript
// __tests__/helpers/training.helpers.js

const request = require('supertest');
const app = require('../../src/app'); // Express app
const { pool } = require('../../src/config/database');
const { getJWTService } = require('../../src/infrastructure/auth/jwt.service');

/**
 * Create a test JWT token for a user
 */
async function createTestToken(userId, tenantId, permissions = ['training:read', 'training:write']) {
  const jwtService = getJWTService();
  return jwtService.generateAccessToken({
    userId,
    email: `test-${userId}@example.com`,
    tenantId,
    roles: ['training_manager'],
    permissions,
    sessionId: `session-${userId}`
  });
}

/**
 * Seed a test tenant and user
 */
async function seedTenantAndUser() {
  const tenantResult = await pool.query(
    `INSERT INTO tenants (name, slug, status) VALUES ('Test Tenant', 'test-tenant', 'active') RETURNING *`
  );
  const tenant = tenantResult.rows[0];

  const userResult = await pool.query(
    `INSERT INTO users (email, first_name, last_name, tenant_id, status)
     VALUES ('trainer@test.com', 'Test', 'User', $1, 'active') RETURNING *`,
    [tenant.id]
  );
  const user = userResult.rows[0];

  return { tenant, user };
}

/**
 * Create a test course
 */
async function createTestCourse(tenantId, overrides = {}) {
  const result = await pool.query(
    `INSERT INTO training_courses (tenant_id, course_code, title, course_type, status)
     VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
    [
      tenantId,
      overrides.course_code || 'TEST-001',
      overrides.title || 'Test Course',
      overrides.course_type || 'online'
    ]
  );
  return result.rows[0];
}

/**
 * Clean up test data
 */
async function cleanupTenant(tenantId) {
  await pool.query('DELETE FROM user_competencies WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM competency_definitions WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM training_records WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM training_assignments WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM training_courses WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
  await pool.query("DELETE FROM tenants WHERE slug = 'test-tenant'");
}

module.exports = { createTestToken, seedTenantAndUser, createTestCourse, cleanupTenant, request, app };
```

---

## 3. Integration Test Suites

### 3.1 Course CRUD Integration Tests

```javascript
// __tests__/integration/training.courses.test.js

const { createTestToken, seedTenantAndUser, cleanupTenant, request, app } = require('../helpers/training.helpers');

describe('Training Courses — Integration', () => {
  let tenant, user, token;

  beforeAll(async () => {
    ({ tenant, user } = await seedTenantAndUser());
    token = await createTestToken(user.id, tenant.id);
  });

  afterAll(async () => {
    await cleanupTenant(tenant.id);
  });

  // ── GET /training/types ────────────────────────────────────────────
  describe('GET /training/types', () => {
    test('should return 5 course types', async () => {
      const res = await request(app)
        .get('/api/v1/training/types')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.data[0]).toHaveProperty('code');
      expect(res.body.data[0]).toHaveProperty('name');
    });
  });

  // ── POST /training/courses ─────────────────────────────────────────
  describe('POST /training/courses', () => {
    test('should create a course with default values', async () => {
      const res = await request(app)
        .post('/api/v1/training/courses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          course_code: 'INT-001',
          title: 'Integration Test Course',
          course_type: 'online',
          category: 'quality',
          duration_hours: 3.0
        });

      expect(res.status).toBe(201);
      expect(res.body.data.course_code).toBe('INT-001');
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.passing_score).toBe(80);
      expect(res.body.data.max_attempts).toBe(3);
      expect(res.body.data.recertification).toEqual({ required: false });
    });

    test('should return 400 when required fields missing', async () => {
      const res = await request(app)
        .post('/api/v1/training/courses')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Only Title' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/v1/training/courses')
        .send({ course_code: 'INT-002', title: 'Test', course_type: 'online' });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /training/courses ──────────────────────────────────────────
  describe('GET /training/courses', () => {
    test('should list courses for tenant', async () => {
      const res = await request(app)
        .get('/api/v1/training/courses')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toHaveProperty('total');
    });

    test('should filter by course_type', async () => {
      const res = await request(app)
        .get('/api/v1/training/courses?course_type=online')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.data.forEach(c => expect(c.course_type).toBe('online'));
    });

    test('should search by title', async () => {
      const res = await request(app)
        .get('/api/v1/training/courses?search=Integration')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach(c =>
        expect(c.title.toLowerCase()).toContain('integration')
      );
    });
  });
});
```

---

### 3.2 Assignment Lifecycle Integration Tests

```javascript
// __tests__/integration/training.assignments.test.js

const { createTestToken, seedTenantAndUser, createTestCourse, cleanupTenant, request, app } = require('../helpers/training.helpers');

describe('Training Assignment Lifecycle — Integration', () => {
  let tenant, user, token, course, assignmentId;

  beforeAll(async () => {
    ({ tenant, user } = await seedTenantAndUser());
    token = await createTestToken(user.id, tenant.id);
    course = await createTestCourse(tenant.id, { course_code: 'LIFE-001', course_type: 'online' });
  });

  afterAll(async () => {
    await cleanupTenant(tenant.id);
  });

  test('Step 1 — Assign training to user', async () => {
    const res = await request(app)
      .post('/api/v1/training/assignments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        course_id: course.id,
        user_id: user.id,
        reason: 'new_hire',
        due_days: 14
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('assigned');
    expect(res.body.data.course.id).toBe(course.id);
    assignmentId = res.body.data.id;
  });

  test('Step 2 — View in my assignments list', async () => {
    const res = await request(app)
      .get('/api/v1/training/my/assignments')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const found = res.body.data.find(a => a.id === assignmentId);
    expect(found).toBeDefined();
    expect(found.status).toBe('assigned');
  });

  test('Step 3 — Start training', async () => {
    const res = await request(app)
      .post(`/api/v1/training/assignments/${assignmentId}/start`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in_progress');
    expect(res.body.data.started_at).not.toBeNull();
  });

  test('Step 3b — Cannot start again (already in_progress)', async () => {
    const res = await request(app)
      .post(`/api/v1/training/assignments/${assignmentId}/start`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  test('Step 4 — Complete training with passing score', async () => {
    const res = await request(app)
      .post(`/api/v1/training/assignments/${assignmentId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ score: 92 });

    expect(res.status).toBe(200);
    expect(res.body.data.passed).toBe(true);
    expect(res.body.data.record).toBeDefined();
    expect(res.body.data.record.score).toBe(92);
    expect(res.body.data.assignment.status).toBe('completed');
  });

  test('Step 5 — Record appears in my training records', async () => {
    const res = await request(app)
      .get('/api/v1/training/my/records')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const record = res.body.data.find(r => r.course.id === course.id);
    expect(record).toBeDefined();
    expect(record.passed).toBe(true);
  });
});
```

---

### 3.3 Competency Integration Tests

```javascript
// __tests__/integration/training.competencies.test.js

const { createTestToken, seedTenantAndUser, cleanupTenant, request, app } = require('../helpers/training.helpers');

describe('Training Competencies — Integration', () => {
  let tenant, user, token, competencyId;

  beforeAll(async () => {
    ({ tenant, user } = await seedTenantAndUser());
    token = await createTestToken(user.id, tenant.id);
  });

  afterAll(async () => {
    await cleanupTenant(tenant.id);
  });

  test('Create competency definition', async () => {
    const res = await request(app)
      .post('/api/v1/training/competencies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'GMP Compliance',
        description: 'Understanding of GMP requirements',
        category: 'regulatory'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('GMP Compliance');
    expect(res.body.data.levels).toHaveLength(4); // Default 4-level scale
    competencyId = res.body.data.id;
  });

  test('Should return 409 for duplicate competency name', async () => {
    const res = await request(app)
      .post('/api/v1/training/competencies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'GMP Compliance', category: 'regulatory' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_NAME');
  });

  test('Get competency matrix', async () => {
    const res = await request(app)
      .get('/api/v1/training/competencies')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const found = res.body.data.find(c => c.id === competencyId);
    expect(found).toBeDefined();
    expect(found.name).toBe('GMP Compliance');
  });

  test('Upsert user competency (create)', async () => {
    const res = await request(app)
      .put(`/api/v1/training/competencies/${user.id}/${competencyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ current_level: 2, target_level: 3, evidence: 'Observed in SOPs review' });

    expect(res.status).toBe(200);
    expect(res.body.data.current_level).toBe(2);
    expect(res.body.data.target_level).toBe(3);
  });

  test('Upsert user competency (update same record)', async () => {
    const res = await request(app)
      .put(`/api/v1/training/competencies/${user.id}/${competencyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ current_level: 3, target_level: 4 });

    expect(res.status).toBe(200);
    expect(res.body.data.current_level).toBe(3);
  });

  test('Get competency matrix filtered by user_id', async () => {
    const res = await request(app)
      .get(`/api/v1/training/competencies?user_id=${user.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const userComp = res.body.data.find(c => c.id === competencyId);
    expect(userComp.user_level).toBe(3);
    expect(userComp.target_level).toBe(4);
  });
});
```

---

### 3.4 Dashboard Integration Test

```javascript
describe('Training Dashboard — Integration', () => {
  test('GET /training/dashboard returns all KPI metrics', async () => {
    const res = await request(app)
      .get('/api/v1/training/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('pending');
    expect(res.body.data).toHaveProperty('in_progress');
    expect(res.body.data).toHaveProperty('completed_30d');
    expect(res.body.data).toHaveProperty('overdue');
    expect(res.body.data).toHaveProperty('expiring_certifications');

    // All should be numeric
    Object.values(res.body.data).forEach(v => expect(typeof v).toBe('number'));
  });
});
```

---

## 4. Running Integration Tests

```bash
# All integration tests
NODE_ENV=test npx jest __tests__/integration/

# Specific suite
NODE_ENV=test npx jest __tests__/integration/training.assignments.test.js

# With verbose output
NODE_ENV=test npx jest __tests__/integration/ --verbose
```

---

## 5. Tenant Isolation Test

```javascript
describe('Tenant Isolation', () => {
  test('User from Tenant A cannot see courses from Tenant B', async () => {
    const { tenant: tenantA, user: userA } = await seedTenantAndUser();
    const { tenant: tenantB } = await seedTenantAndUser();
    const tokenA = await createTestToken(userA.id, tenantA.id);

    // Create course in Tenant B
    const courseB = await createTestCourse(tenantB.id, { course_code: 'B-001' });

    const res = await request(app)
      .get(`/api/v1/training/courses/${courseB.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404); // Not found — tenant filter blocks it

    await cleanupTenant(tenantA.id);
    await cleanupTenant(tenantB.id);
  });
});
```
