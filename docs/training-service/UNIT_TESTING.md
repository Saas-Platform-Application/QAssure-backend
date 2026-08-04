# QAssure Training Service
## Unit Testing Guide

**Document ID:** QASSURE-TRN-UT-001  
**Framework:** Jest  
**Last Updated:** 2026-06-29  

---

## 1. Setup

```bash
npm install --save-dev jest @types/jest
```

Create `jest.config.js` at project root if not present:
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  clearMocks: true
};
```

---

## 2. Mocking Strategy

The Training Service accesses three external dependencies:
1. `pool` (PostgreSQL) — via `../config/database`
2. `getAuditService()` — fire-and-forget audit logger
3. `getNotificationService()` — fire-and-forget notifier

All three must be mocked at the module level using `jest.mock()`.

---

## 3. Base Test Setup

```javascript
// __tests__/training.service.test.js

jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
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
const { getTrainingService } = require('../src/services/training.service');

// Mock DB client for transactions
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

## 4. Unit Tests

### 4.1 `createCourse`

```javascript
describe('TrainingService.createCourse', () => {
  const tenantId = 'tenant-uuid';
  const createdBy = 'user-uuid';
  const courseData = {
    course_code: 'QMS-001',
    title: 'Quality Management Basics',
    course_type: 'online',
    category: 'quality',
    duration_hours: 2.5
  };

  test('should create a course and return formatted object', async () => {
    const mockRow = {
      id: 'course-uuid',
      tenant_id: tenantId,
      course_code: 'QMS-001',
      title: 'Quality Management Basics',
      description: null,
      course_type: 'online',
      category: 'quality',
      duration_hours: '2.50',
      passing_score: 80,
      max_attempts: 3,
      prerequisites: [],
      required_for_roles: [],
      required_for_departments: [],
      status: 'draft',
      version: '1.0',
      requires_recertification: false,
      recertification_months: null,
      content_url: null,
      document_id: null,
      document_number: null,
      document_title: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    pool.query.mockResolvedValueOnce({ rows: [mockRow] }); // INSERT
    pool.query.mockResolvedValueOnce({ rows: [mockRow] }); // getCourse SELECT (called internally via return path — actually not called, but _formatCourse is)

    const service = getTrainingService();
    const result = await service.createCourse(tenantId, courseData, createdBy);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO training_courses'),
      expect.arrayContaining([tenantId, 'QMS-001', 'Quality Management Basics', 'online'])
    );

    expect(result.course_code).toBe('QMS-001');
    expect(result.status).toBe('draft');
    expect(result.passing_score).toBe(80);
    expect(result.recertification).toEqual({ required: false });
    expect(result.duration_hours).toBe(2.5); // parsed from string
  });

  test('should use default passing_score of 80 if not provided', async () => {
    const mockRow = {
      id: 'uuid', course_code: 'QMS-002', title: 'Test', course_type: 'online',
      passing_score: 80, max_attempts: 3, prerequisites: [], required_for_roles: [],
      required_for_departments: [], status: 'draft', version: '1.0',
      requires_recertification: false, recertification_months: null,
      duration_hours: '0', created_at: new Date(), updated_at: new Date()
    };

    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    const service = getTrainingService();
    const result = await service.createCourse(tenantId, { course_code: 'QMS-002', title: 'Test', course_type: 'online' }, createdBy);

    const insertCall = pool.query.mock.calls[0];
    expect(insertCall[1][7]).toBe(80); // passing_score at index 7
  });
});
```

---

### 4.2 `getCourse`

```javascript
describe('TrainingService.getCourse', () => {
  test('should return formatted course when found', async () => {
    const mockRow = {
      id: 'course-uuid', course_code: 'QMS-001', title: 'Quality Basics',
      duration_hours: '2.50', course_type: 'online', passing_score: 80,
      max_attempts: 3, prerequisites: [], required_for_roles: [],
      required_for_departments: [], status: 'active', version: '1.0',
      requires_recertification: false, recertification_months: null,
      content_url: null, document_id: null, created_at: new Date(), updated_at: new Date()
    };

    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    const service = getTrainingService();
    const result = await service.getCourse('course-uuid', 'tenant-uuid');

    expect(result).not.toBeNull();
    expect(result.course_code).toBe('QMS-001');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN documents'),
      ['course-uuid', 'tenant-uuid']
    );
  });

  test('should return null when course not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const service = getTrainingService();
    const result = await service.getCourse('non-existent', 'tenant-uuid');

    expect(result).toBeNull();
  });
});
```

---

### 4.3 `listCourses`

```javascript
describe('TrainingService.listCourses', () => {
  test('should apply status filter when provided', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })  // main query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // count query

    const service = getTrainingService();
    await service.listCourses('tenant-uuid', { status: 'active', limit: 10, offset: 0 });

    const mainQueryCall = pool.query.mock.calls[0];
    expect(mainQueryCall[0]).toContain('AND status =');
    expect(mainQueryCall[1]).toContain('active');
  });

  test('should apply ILIKE search on title and course_code', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const service = getTrainingService();
    await service.listCourses('tenant-uuid', { search: 'quality', limit: 50, offset: 0 });

    const mainQueryCall = pool.query.mock.calls[0];
    expect(mainQueryCall[0]).toContain('ILIKE');
    expect(mainQueryCall[1]).toContain('%quality%');
  });

  test('should return pagination metadata', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '42' }] });

    const service = getTrainingService();
    const result = await service.listCourses('tenant-uuid', { limit: 10, offset: 20 });

    expect(result.total).toBe(42);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(20);
  });
});
```

---

### 4.4 `assignTraining`

```javascript
describe('TrainingService.assignTraining', () => {
  const tenantId = 'tenant-uuid';
  const assignedBy = 'manager-uuid';
  const data = { course_id: 'course-uuid', user_id: 'user-uuid', reason: 'new_hire' };

  const mockCourse = { id: 'course-uuid', title: 'QMS Basics' };
  const mockAssignment = {
    id: 'assign-uuid', tenant_id: tenantId, course_id: 'course-uuid',
    user_id: 'user-uuid', assigned_by: assignedBy, status: 'assigned', assigned_at: new Date()
  };

  test('should create assignment within a transaction', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [mockCourse] }) // SELECT course
      .mockResolvedValueOnce({ rows: [mockAssignment] }) // INSERT assignment
      .mockResolvedValueOnce({}); // COMMIT

    // getAssignment internal call
    pool.query.mockResolvedValueOnce({
      rows: [{
        ...mockAssignment,
        course_code: 'QMS-001', course_title: 'QMS Basics', course_type: 'online',
        duration_hours: '2', user_email: 'user@test.com', first_name: 'Jane', last_name: 'Smith',
        assigned_by_email: 'mgr@test.com'
      }]
    });

    const service = getTrainingService();
    const result = await service.assignTraining(tenantId, data, assignedBy);

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
    expect(result).toHaveProperty('id', 'assign-uuid');
  });

  test('should rollback and throw when course not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] }); // Course not found

    const service = getTrainingService();
    await expect(
      service.assignTraining(tenantId, data, assignedBy)
    ).rejects.toThrow('Course not found');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('should calculate due_date from due_days when due_date not provided', async () => {
    const dataWithDueDays = { ...data, due_days: 14 };

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [mockCourse] })
      .mockResolvedValueOnce({ rows: [mockAssignment] })
      .mockResolvedValueOnce({}); // COMMIT

    pool.query.mockResolvedValueOnce({
      rows: [{ ...mockAssignment, course_code: 'Q', course_title: 'T', course_type: 'online',
               duration_hours: '0', user_email: 'u@t.com', first_name: 'A', last_name: 'B',
               assigned_by_email: 'm@t.com' }]
    });

    const service = getTrainingService();
    await service.assignTraining(tenantId, dataWithDueDays, assignedBy);

    const insertCall = mockClient.query.mock.calls.find(c => c[0].includes('INSERT INTO training_assignments'));
    const dueDateArg = insertCall[1][5]; // 6th param is due_date
    expect(dueDateArg).toBeInstanceOf(Date);

    const daysFromNow = Math.round((dueDateArg - new Date()) / (1000 * 60 * 60 * 24));
    expect(daysFromNow).toBe(14);
  });
});
```

---

### 4.5 `startTraining`

```javascript
describe('TrainingService.startTraining', () => {
  test('should update status to in_progress', async () => {
    const mockAssignment = { id: 'a-id', user_id: 'u-id', status: 'assigned', tenant_id: 't-id' };
    const updatedRow = { ...mockAssignment, status: 'in_progress', started_at: new Date() };

    pool.query
      .mockResolvedValueOnce({ rows: [mockAssignment] }) // SELECT check
      .mockResolvedValueOnce({ rows: [updatedRow] }) // UPDATE
      .mockResolvedValueOnce({ rows: [{ ...updatedRow, course_code: 'Q', course_title: 'T',
        course_type: 'online', duration_hours: '0', user_email: 'u@t.com',
        first_name: 'A', last_name: 'B', assigned_by_email: null }] }); // getAssignment

    const service = getTrainingService();
    const result = await service.startTraining('a-id', 't-id', 'u-id');

    expect(pool.query.mock.calls[1][0]).toContain("status = 'in_progress'");
    expect(result.status).toBe('in_progress');
  });

  test('should throw error when assignment not in assigned status', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'a-id', user_id: 'u-id', status: 'in_progress', tenant_id: 't-id' }]
    });

    const service = getTrainingService();
    await expect(
      service.startTraining('a-id', 't-id', 'u-id')
    ).rejects.toThrow('Assignment cannot be started');
  });

  test('should throw NOT FOUND when assignment does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const service = getTrainingService();
    await expect(
      service.startTraining('bad-id', 't-id', 'u-id')
    ).rejects.toThrow('Assignment not found');
  });
});
```

---

### 4.6 `completeTraining`

```javascript
describe('TrainingService.completeTraining', () => {
  const baseAssignment = {
    id: 'a-id', course_id: 'c-id', course_code: 'QMS-001',
    title: 'Quality Basics', version: '1.0',
    passing_score: 80, requires_recertification: false,
    recertification_months: null, assigned_by: 'mgr-id',
    first_name: 'Jane', last_name: 'Smith', user_id: 'u-id'
  };

  const setupMocks = (extraAssignment = {}) => {
    const assignment = { ...baseAssignment, ...extraAssignment };
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [assignment] }) // SELECT assignment JOIN
      .mockResolvedValueOnce({}) // UPDATE training_assignments
      .mockResolvedValueOnce({ rows: [{ id: 'rec-uuid', ...assignment, completed_at: new Date(), passed: true }] }) // INSERT training_records
      .mockResolvedValueOnce({}); // COMMIT

    pool.query.mockResolvedValueOnce({ rows: [{ ...assignment, course_title: 'Quality Basics',
      course_type: 'online', duration_hours: '0', user_email: 'u@t.com', assigned_by_email: null }] }); // getAssignment
  };

  test('should mark as passed when score >= passing_score', async () => {
    setupMocks();
    const service = getTrainingService();
    const result = await service.completeTraining('a-id', 't-id', 'u-id', { score: 85 });

    expect(result.passed).toBe(true);
    const updateCall = mockClient.query.mock.calls.find(c => c[0].includes('UPDATE training_assignments'));
    expect(updateCall[1][1]).toBe(true); // passed = true
  });

  test('should mark as failed when score < passing_score', async () => {
    setupMocks();
    const service = getTrainingService();
    const result = await service.completeTraining('a-id', 't-id', 'u-id', { score: 70 });

    expect(result.passed).toBe(false);
  });

  test('should calculate expires_at when recertification required and passed', async () => {
    setupMocks({ requires_recertification: true, recertification_months: 12 });
    const service = getTrainingService();
    await service.completeTraining('a-id', 't-id', 'u-id', { score: 95 });

    const insertCall = mockClient.query.mock.calls.find(c => c[0].includes('INSERT INTO training_records'));
    const expiresAt = insertCall[1][9]; // expires_at argument
    expect(expiresAt).toBeInstanceOf(Date);

    const monthsAhead = (expiresAt.getFullYear() - new Date().getFullYear()) * 12
      + (expiresAt.getMonth() - new Date().getMonth());
    expect(monthsAhead).toBe(12);
  });

  test('should rollback on error and rethrow', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error('DB failure'));

    const service = getTrainingService();
    await expect(
      service.completeTraining('a-id', 't-id', 'u-id', { score: 90 })
    ).rejects.toThrow('DB failure');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
```

---

### 4.7 `updateUserCompetency`

```javascript
describe('TrainingService.updateUserCompetency', () => {
  test('should upsert user competency', async () => {
    const mockResult = {
      id: 'uc-uuid', tenant_id: 't-id', user_id: 'u-id', competency_id: 'comp-id',
      current_level: 2, target_level: 3, assessed_by: 'assessor-id', evidence: 'Observed in audit'
    };

    pool.query.mockResolvedValueOnce({ rows: [mockResult] });

    const service = getTrainingService();
    const result = await service.updateUserCompetency(
      't-id', 'u-id', 'comp-id',
      { current_level: 2, target_level: 3, evidence: 'Observed in audit' },
      'assessor-id'
    );

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT'),
      ['t-id', 'u-id', 'comp-id', 2, 3, 'assessor-id', 'Observed in audit']
    );
    expect(result.current_level).toBe(2);
  });
});
```

---

## 5. Format Helper Unit Tests

```javascript
describe('TrainingService._formatCourse', () => {
  test('should parse duration_hours as float', () => {
    const service = getTrainingService();
    const formatted = service._formatCourse({
      id: 'x', course_code: 'C', title: 'T', duration_hours: '2.75',
      course_type: 'online', passing_score: 80, max_attempts: 3,
      prerequisites: [], required_for_roles: [], required_for_departments: [],
      status: 'draft', version: '1.0', requires_recertification: false,
      recertification_months: null, content_url: null, document_id: null,
      created_at: new Date(), updated_at: new Date()
    });

    expect(formatted.duration_hours).toBe(2.75);
    expect(typeof formatted.duration_hours).toBe('number');
  });

  test('should build recertification object when required', () => {
    const service = getTrainingService();
    const formatted = service._formatCourse({
      id: 'x', course_code: 'C', title: 'T', duration_hours: '0',
      course_type: 'online', passing_score: 80, max_attempts: 3,
      prerequisites: [], required_for_roles: [], required_for_departments: [],
      status: 'active', version: '1.0',
      requires_recertification: true, recertification_months: 12,
      content_url: null, document_id: null,
      created_at: new Date(), updated_at: new Date()
    });

    expect(formatted.recertification).toEqual({ required: true, months: 12 });
  });
});
```

---

## 6. Running Tests

```bash
# Run all training tests
npx jest __tests__/training.service.test.js

# Run with coverage
npx jest --coverage __tests__/training.service.test.js

# Watch mode
npx jest --watch __tests__/training.service.test.js
```
