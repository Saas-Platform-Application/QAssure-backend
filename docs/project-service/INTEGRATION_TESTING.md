# QAssure Project Service
## Integration Testing Guide

**Document ID:** QASSURE-PRJ-INT-001  
**Framework:** Jest + Supertest  
**Last Updated:** 2026-06-29  

---

## 1. Setup

```bash
npm install --save-dev supertest
NODE_ENV=test npm run migrate
```

---

## 2. Test Helpers

```javascript
// __tests__/helpers/project.helpers.js
const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');
const { getJWTService } = require('../../src/infrastructure/auth/jwt.service');

async function createTestToken(userId, tenantId, permissions = ['projects:read','projects:create','projects:delete']) {
  return getJWTService().generateAccessToken({
    userId, email: `test@example.com`, tenantId,
    roles: ['project_manager'], permissions, sessionId: `sess-${userId}`
  });
}

async function seedTenantAndUser() {
  const t = await pool.query(`INSERT INTO tenants (name, slug, status) VALUES ('Test','test-prj','active') RETURNING *`);
  const u = await pool.query(
    `INSERT INTO users (email, first_name, last_name, tenant_id, status) VALUES ('pm@test.com','PM','User',$1,'active') RETURNING *`,
    [t.rows[0].id]
  );
  return { tenant: t.rows[0], user: u.rows[0] };
}

async function cleanup(tenantId) {
  await pool.query(`DELETE FROM project_activity_log WHERE tenant_id = $1`, [tenantId]);
  await pool.query(`DELETE FROM project_modules WHERE tenant_id = $1`, [tenantId]);
  await pool.query(`DELETE FROM project_milestones WHERE tenant_id = $1`, [tenantId]);
  await pool.query(`DELETE FROM project_members WHERE tenant_id = $1`, [tenantId]);
  await pool.query(`DELETE FROM projects WHERE tenant_id = $1`, [tenantId]);
  await pool.query(`DELETE FROM users WHERE email LIKE '%@test.com'`);
  await pool.query(`DELETE FROM tenants WHERE slug = 'test-prj'`);
}

module.exports = { request, app, createTestToken, seedTenantAndUser, cleanup };
```

---

## 3. Integration Test Suites

### 3.1 Project CRUD

```javascript
// __tests__/integration/project.crud.test.js
const { request, app, createTestToken, seedTenantAndUser, cleanup } = require('../helpers/project.helpers');

describe('Project CRUD — Integration', () => {
  let tenant, user, token, projectId;

  beforeAll(async () => {
    ({ tenant, user } = await seedTenantAndUser());
    token = await createTestToken(user.id, tenant.id);
  });

  afterAll(async () => { await cleanup(tenant.id); });

  test('POST /projects — creates project and auto-adds creator as project_manager', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Integration CER Project',
        code: 'INT-CER-001',
        project_type: 'cer_submission',
        priority: 'high',
        modules: ['aice']
      });

    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe('INT-CER-001');
    expect(res.body.data.status).toBe('planning');
    expect(res.body.data.members).toHaveLength(1);
    expect(res.body.data.members[0].role).toBe('project_manager');
    expect(res.body.data.modules).toContain('aice');
    projectId = res.body.data.id;
  });

  test('POST /projects — 409 on duplicate code', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dupe', code: 'INT-CER-001', project_type: 'custom' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_CODE');
  });

  test('GET /projects — lists with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.pagination).toHaveProperty('total');
  });

  test('GET /projects?my_projects=true — returns only user member projects', async () => {
    const res = await request(app)
      .get('/api/v1/projects?my_projects=true')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const found = res.body.data.find(p => p.id === projectId);
    expect(found).toBeDefined();
  });

  test('GET /projects/:id — returns hydrated project', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(projectId);
    expect(res.body.data).toHaveProperty('members');
    expect(res.body.data).toHaveProperty('modules');
    expect(res.body.data).toHaveProperty('milestones');
  });

  test('GET /projects/:id — 404 for wrong tenant', async () => {
    const res = await request(app)
      .get('/api/v1/projects/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test('PUT /projects/:id — updates allowed fields', async () => {
    const res = await request(app)
      .put(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated CER Project', status: 'active', priority: 'critical' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated CER Project');
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.priority).toBe('critical');
  });

  test('PUT /projects/:id — ignores code (immutable)', async () => {
    const res = await request(app)
      .put(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'HACKED-001' });

    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe('INT-CER-001'); // unchanged
  });

  test('GET /projects/:id/stats — returns all metric types', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/stats`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('members');
    expect(res.body.data).toHaveProperty('milestones');
    expect(res.body.data).toHaveProperty('workflows');
    expect(res.body.data).toHaveProperty('documents');
  });

  test('DELETE /projects/:id — archives project', async () => {
    const res = await request(app)
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('archived');

    // Verify archived
    const check = await request(app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(check.body.data.status).toBe('archived');
  });
});
```

---

### 3.2 Member Management

```javascript
// __tests__/integration/project.members.test.js
describe('Project Members — Integration', () => {
  let tenant, user, token, secondUser, projectId, memberId;

  beforeAll(async () => {
    ({ tenant, user } = await seedTenantAndUser());
    token = await createTestToken(user.id, tenant.id);

    // Create second user
    const u2 = await pool.query(
      `INSERT INTO users (email,first_name,last_name,tenant_id,status) VALUES ('dev@test.com','Dev','User',$1,'active') RETURNING *`,
      [tenant.id]
    );
    secondUser = u2.rows[0];

    // Create a project
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Member Test Project', code: 'MBR-001', project_type: 'custom' });
    projectId = res.body.data.id;
  });

  afterAll(async () => { await cleanup(tenant.id); });

  test('POST /members — adds member with default contributor role', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: secondUser.id });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('contributor');
    memberId = res.body.data.id;
  });

  test('POST /members — re-add updates role (upsert)', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: secondUser.id, role: 'reviewer' });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('reviewer');
  });

  test('GET /members — returns active members', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const found = res.body.data.find(m => m.user_id === secondUser.id);
    expect(found).toBeDefined();
    expect(found.role).toBe('reviewer');
  });

  test('PUT /members/:id — updates member role', async () => {
    const res = await request(app)
      .put(`/api/v1/projects/${projectId}/members/${memberId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'lead' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('lead');
  });

  test('DELETE /members/:id — soft removes member', async () => {
    const res = await request(app)
      .delete(`/api/v1/projects/${projectId}/members/${memberId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    // Verify not in active list
    const check = await request(app)
      .get(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${token}`);
    const found = check.body.data.find(m => m.id === memberId);
    expect(found).toBeUndefined();
  });
});
```

---

### 3.3 Milestones & Modules

```javascript
// __tests__/integration/project.milestones.modules.test.js
describe('Milestones & Modules — Integration', () => {
  let token, projectId, milestoneId;

  beforeAll(async () => { /* seed tenant, user, project */ });
  afterAll(async () => { /* cleanup */ });

  test('POST /milestones — adds milestone', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Phase Gate 1', planned_date: '2026-09-01', milestone_type: 'phase_gate', sequence: 1 });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Phase Gate 1');
    expect(res.body.data.status).toBe('pending');
    milestoneId = res.body.data.id;
  });

  test('PUT /milestones/:id — completes milestone and sets completed_by', async () => {
    const res = await request(app)
      .put(`/api/v1/projects/${projectId}/milestones/${milestoneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed', actual_date: '2026-09-01' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.completed_by).not.toBeNull();
  });

  test('POST /modules/aice/enable — enables module', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/modules/aice/enable`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.module_code).toBe('aice');
    expect(res.body.data.is_enabled).toBe(true);
  });

  test('POST /modules/aice/disable — disables module', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/modules/aice/disable`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.is_enabled).toBe(false);
  });

  test('GET /modules — returns only enabled modules', async () => {
    // Re-enable aice
    await request(app)
      .post(`/api/v1/projects/${projectId}/modules/aice/enable`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/modules`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every(m => m.is_enabled === true)).toBe(true);
  });

  test('GET /activity — includes activity entries', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/activity`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('activity_type');
    expect(res.body.data[0]).toHaveProperty('performed_at');
  });
});
```

---

## 4. Running Tests

```bash
# All project integration tests
NODE_ENV=test npx jest __tests__/integration/project.

# Run with verbose
NODE_ENV=test npx jest __tests__/integration/ --verbose

# Run all tests (unit + integration)
NODE_ENV=test npx jest --coverage
```
