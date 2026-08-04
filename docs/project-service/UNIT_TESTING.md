# QAssure Project Service
## Unit Testing Guide

**Document ID:** QASSURE-PRJ-UT-001  
**Framework:** Jest  
**Last Updated:** 2026-06-29  

---

## 1. Setup & Mocking

```javascript
// __tests__/project.service.test.js

jest.mock('../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() }
}));
jest.mock('../src/services/audit.service', () => ({
  getAuditService: () => ({ log: jest.fn().mockResolvedValue(undefined) })
}));
jest.mock('../src/services/notification.service', () => ({
  getNotificationService: () => ({
    sendFromTemplate: jest.fn().mockResolvedValue(undefined)
  })
}));

const { pool } = require('../src/config/database');
const { getProjectService } = require('../src/services/project.service');

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

beforeEach(() => {
  jest.clearAllMocks();
  pool.connect.mockResolvedValue(mockClient);
});
```

---

## 2. Unit Tests

### 2.1 `create`

```javascript
describe('ProjectService.create', () => {
  const tenantId = 'tenant-uuid';
  const createdBy = 'user-uuid';

  const projectRow = {
    id: 'proj-uuid', tenant_id: tenantId, name: 'CER Project',
    code: 'CER-001', project_type: 'cer_submission', status: 'planning',
    priority: 'medium', owner_id: createdBy, created_by: createdBy,
    created_at: new Date(), updated_at: new Date()
  };

  const hydrated = {
    ...projectRow,
    owner_email: 'u@t.com', owner_first_name: 'A', owner_last_name: 'B',
    created_by_email: 'u@t.com',
    members: [], modules: [], milestones: []
  };

  beforeEach(() => {
    mockClient.query
      .mockResolvedValueOnce({})                       // BEGIN
      .mockResolvedValueOnce({ rows: [projectRow] })   // INSERT projects
      .mockResolvedValueOnce({})                       // INSERT project_members
      .mockResolvedValueOnce({})                       // INSERT activity_log
      .mockResolvedValueOnce({});                      // COMMIT

    pool.query
      .mockResolvedValueOnce({ rows: [hydrated] })     // getById - project
      .mockResolvedValueOnce({ rows: [] })             // getById - members
      .mockResolvedValueOnce({ rows: [] })             // getById - modules
      .mockResolvedValueOnce({ rows: [] });            // getById - milestones
  });

  test('should create project within a transaction', async () => {
    const service = getProjectService();
    const result = await service.create(tenantId, {
      name: 'CER Project', code: 'CER-001', project_type: 'cer_submission'
    }, createdBy);

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
    expect(result).toHaveProperty('id', 'proj-uuid');
  });

  test('should auto-assign owner_id to createdBy when not provided', async () => {
    const service = getProjectService();
    await service.create(tenantId, { name: 'Test', code: 'T-001', project_type: 'custom' }, createdBy);

    const insertCall = mockClient.query.mock.calls.find(c => c[0].includes('INSERT INTO projects'));
    const ownerIdIndex = 18; // position 19 in VALUES array (0-indexed: 18)
    expect(insertCall[1][ownerIdIndex]).toBe(createdBy);
  });

  test('should rollback and rethrow on error', async () => {
    mockClient.query
      .mockResolvedValueOnce({})  // BEGIN
      .mockRejectedValueOnce(new Error('unique_project_code_per_tenant'));

    const service = getProjectService();
    await expect(
      service.create(tenantId, { name: 'T', code: 'DUPE', project_type: 'custom' }, createdBy)
    ).rejects.toThrow('unique_project_code_per_tenant');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('should insert each module when modules array provided', async () => {
    jest.clearAllMocks();
    mockClient.query
      .mockResolvedValue({});
    mockClient.query
      .mockResolvedValueOnce({})                     // BEGIN
      .mockResolvedValueOnce({ rows: [projectRow] }) // INSERT projects
      .mockResolvedValueOnce({})                     // INSERT project_members
      .mockResolvedValueOnce({})                     // INSERT module 1
      .mockResolvedValueOnce({})                     // INSERT module 2
      .mockResolvedValueOnce({})                     // activity_log
      .mockResolvedValueOnce({});                    // COMMIT

    pool.query.mockResolvedValue({ rows: [] });
    pool.query.mockResolvedValueOnce({ rows: [hydrated] });

    const service = getProjectService();
    await service.create(tenantId, {
      name: 'T', code: 'T-001', project_type: 'cer_submission',
      modules: ['aice', 'dhf']
    }, createdBy);

    const moduleCalls = mockClient.query.mock.calls.filter(
      c => c[0].includes('INSERT INTO project_modules')
    );
    expect(moduleCalls).toHaveLength(2);
    expect(moduleCalls[0][1][2]).toBe('aice');
    expect(moduleCalls[1][1][2]).toBe('dhf');
  });
});
```

---

### 2.2 `update`

```javascript
describe('ProjectService.update', () => {
  test('should update allowed fields only', async () => {
    const currentRow = { id: 'p-id', name: 'Old', status: 'planning', priority: 'medium' };
    const updatedRow = { ...currentRow, name: 'New', status: 'active' };

    mockClient.query
      .mockResolvedValueOnce({})                         // BEGIN
      .mockResolvedValueOnce({ rows: [currentRow] })     // SELECT current
      .mockResolvedValueOnce({ rows: [updatedRow] })     // UPDATE
      .mockResolvedValueOnce({})                         // _logActivity
      .mockResolvedValueOnce({});                        // COMMIT

    pool.query.mockResolvedValue({ rows: [] });

    const service = getProjectService();
    await service.update('p-id', 'tenant-id', { name: 'New', status: 'active', code: 'IGNORED' }, 'user-id');

    const updateCall = mockClient.query.mock.calls.find(c => c[0].includes('UPDATE projects'));
    expect(updateCall[0]).not.toContain('code =');  // code is not in allowedFields
    expect(updateCall[0]).toContain('name =');
    expect(updateCall[0]).toContain('status =');
  });

  test('should throw NOT FOUND when project missing', async () => {
    mockClient.query
      .mockResolvedValueOnce({})             // BEGIN
      .mockResolvedValueOnce({ rows: [] });  // SELECT returns nothing

    const service = getProjectService();
    await expect(
      service.update('bad-id', 'tenant-id', { name: 'Test' }, 'user-id')
    ).rejects.toThrow('Project not found');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('should return current project when no valid fields provided', async () => {
    const currentRow = { id: 'p-id', name: 'Current' };
    mockClient.query
      .mockResolvedValueOnce({})                      // BEGIN
      .mockResolvedValueOnce({ rows: [currentRow] }); // SELECT current

    pool.query.mockResolvedValue({ rows: [currentRow] });
    pool.query
      .mockResolvedValueOnce({ rows: [currentRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const service = getProjectService();
    const result = await service.update('p-id', 't-id', { project_type: 'ignored' }, 'u-id');
    expect(result).toBeDefined();
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK'); // Early return path
  });
});
```

---

### 2.3 `delete`

```javascript
describe('ProjectService.delete', () => {
  test('should set status to archived', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'p-id', status: 'archived' }] });

    const service = getProjectService();
    const result = await service.delete('p-id', 'tenant-id', 'user-id');

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'archived'"),
      ['p-id', 'tenant-id', 'user-id']
    );
    expect(result.status).toBe('archived');
  });

  test('should throw NOT FOUND when no rows affected', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const service = getProjectService();
    await expect(
      service.delete('bad-id', 'tenant-id', 'user-id')
    ).rejects.toThrow('Project not found');
  });
});
```

---

### 2.4 `addMember`

```javascript
describe('ProjectService.addMember', () => {
  const memberRow = {
    id: 'm-id', project_id: 'p-id', user_id: 'u-id',
    role: 'contributor', status: 'active'
  };

  test('should add member with default role and permissions', async () => {
    mockClient.query
      .mockResolvedValueOnce({})                        // BEGIN
      .mockResolvedValueOnce({ rows: [memberRow] })     // INSERT ON CONFLICT
      .mockResolvedValueOnce({})                        // _logActivity
      .mockResolvedValueOnce({});                       // COMMIT

    const service = getProjectService();
    const result = await service.addMember('p-id', 't-id', { user_id: 'u-id' }, 'adder-id');

    const insertCall = mockClient.query.mock.calls.find(c => c[0].includes('INSERT INTO project_members'));
    expect(insertCall[1][3]).toBe('contributor'); // default role
    expect(result.id).toBe('m-id');
  });

  test('should rollback on failure', async () => {
    mockClient.query
      .mockResolvedValueOnce({})  // BEGIN
      .mockRejectedValueOnce(new Error('FK violation'));

    const service = getProjectService();
    await expect(
      service.addMember('p-id', 't-id', { user_id: 'bad' }, 'adder-id')
    ).rejects.toThrow('FK violation');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
```

---

### 2.5 `updateMilestone`

```javascript
describe('ProjectService.updateMilestone', () => {
  test('should auto-set completed_by when status = completed', async () => {
    const row = { id: 'm-id', status: 'completed', completed_by: 'u-id' };
    pool.query.mockResolvedValueOnce({ rows: [row] });

    const service = getProjectService();
    await service.updateMilestone('m-id', 'p-id', 't-id', { status: 'completed' }, 'u-id');

    const updateCall = pool.query.mock.calls[0];
    expect(updateCall[0]).toContain('completed_by');
    expect(updateCall[1]).toContain('u-id');
  });

  test('should throw NOT FOUND when milestone missing', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const service = getProjectService();
    await expect(
      service.updateMilestone('bad-id', 'p-id', 't-id', { status: 'completed' }, 'u-id')
    ).rejects.toThrow('Milestone not found');
  });
});
```

---

### 2.6 `enableModule` / `disableModule`

```javascript
describe('ProjectService Module Management', () => {
  test('enableModule should upsert module as enabled', async () => {
    const moduleRow = { id: 'mod-id', module_code: 'aice', is_enabled: true };
    pool.query.mockResolvedValueOnce({ rows: [moduleRow] });

    const service = getProjectService();
    const result = await service.enableModule('p-id', 't-id', 'aice', 'u-id');

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT'),
      ['t-id', 'p-id', 'aice', 'u-id']
    );
    expect(result.is_enabled).toBe(true);
  });

  test('disableModule should set is_enabled = false', async () => {
    const moduleRow = { id: 'mod-id', module_code: 'aice', is_enabled: false };
    pool.query.mockResolvedValueOnce({ rows: [moduleRow] });

    const service = getProjectService();
    const result = await service.disableModule('p-id', 't-id', 'aice');

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('is_enabled = false'),
      ['p-id', 't-id', 'aice']
    );
    expect(result.is_enabled).toBe(false);
  });
});
```

---

### 2.7 `getStats`

```javascript
describe('ProjectService.getStats', () => {
  test('should return all stats with correct types', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '4' }] })  // members
      .mockResolvedValueOnce({ rows: [{ total: '8', completed: '3', missed: '1', overdue: '2' }] }) // milestones
      .mockResolvedValueOnce({ rows: [{ total: '5', active: '2', completed: '3' }] }) // workflows
      .mockResolvedValueOnce({ rows: [{ count: '12' }] }); // documents

    const service = getProjectService();
    const stats = await service.getStats('p-id', 't-id');

    expect(stats.members).toBe(4);
    expect(stats.documents).toBe(12);
    expect(stats.milestones.total).toBe('8');
    expect(stats.workflows.active).toBe('2');
  });
});
```

---

## 3. Running Tests

```bash
# All project tests
npx jest __tests__/project.service.test.js

# With coverage
npx jest --coverage __tests__/project.service.test.js

# Watch mode
npx jest --watch __tests__/project.service.test.js
```
