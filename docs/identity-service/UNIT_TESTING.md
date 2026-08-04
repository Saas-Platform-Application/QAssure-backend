# QAssure Identity & Platform Service — Unit Testing Document

---

## 1. Unit Testing Strategy

Unit tests validate core logic components of the Identity Service in isolation by mocking all external dependencies (PostgreSQL, Redis, email provider, JWT library).

Key components to test in isolation:
1. **JWT Service**: Token generation, verification, extraction, and expiry detection.
2. **Password Utilities**: Hashing, comparison, policy validation, and history checks.
3. **Validation Middleware Factory**: Correct Zod error formatting for body, params, and query sources.
4. **Tenant Cache Logic**: Cache hit/miss behavior and TTL expiry.
5. **Permission Resolution**: Wildcard expansion, scope matching, and Super Admin bypass logic.

---

## 2. Test Suite Details

### 2.1 JWT Service (`infrastructure/auth/jwt.service.js`)
*   **Target**: Token generation, verification, and expiry detection.
*   **Test Cases**:
    *   *Case 1*: `generateAccessToken(payload)` returns a string with 3 dot-separated segments.
    *   *Case 2*: `verifyAccessToken(token)` returns `{ valid: true, payload }` for a valid token.
    *   *Case 3*: `verifyAccessToken(expiredToken)` returns `{ valid: false, error: { code: 'TOKEN_EXPIRED' } }`.
    *   *Case 4*: `verifyAccessToken(tamperedToken)` returns `{ valid: false, error: { code: 'INVALID_TOKEN' } }`.
    *   *Case 5*: `extractToken("Bearer abc123")` returns `"abc123"`.
    *   *Case 6*: `extractToken(undefined)` returns `null`.
    *   *Case 7*: `isTokenExpiring(token, 300)` returns `true` when token expires in < 5 minutes.

### 2.2 Validation Middleware (`middleware/validationMiddleware.js`)
*   **Target**: Correct schema validation and error response shape.
*   **Test Cases**:
    *   *Case 1*: Valid body passes schema → `next()` is called. `req.body` is replaced with parsed data.
    *   *Case 2*: Missing required field → 400 returned. `details` array contains `{ path, message, code }`.
    *   *Case 3*: `source='params'` → validates `req.params`, not `req.body`.
    *   *Case 4*: `source='query'` → validates `req.query`.
    *   *Case 5*: Schema throws unexpected error → 500 returned with `"Validation middleware error"`.

### 2.3 Tenant Cache (`middleware/tenant.middleware.js`)
*   **Target**: In-memory cache hit/miss and TTL behavior.
*   **Test Cases**:
    *   *Case 1*: First request for a tenant ID queries the database and caches the result.
    *   *Case 2*: Second request for the same tenant ID returns cached data without a DB query.
    *   *Case 3*: After 5-minute TTL, cache is considered stale and DB is queried again.
    *   *Case 4*: `clearTenantCache(tenantId)` removes only the specified entry.
    *   *Case 5*: `clearTenantCache()` with no argument clears all entries.

### 2.4 Permission Wildcard Resolution (`infrastructure/auth/permission.service.js`)
*   **Target**: Wildcard matching in permission arrays.
*   **Test Cases**:
    *   *Case 1*: `permissions = ['users:read']` — `hasPermission('users','read')` → `true`.
    *   *Case 2*: `permissions = ['users:*']` — `hasPermission('users','delete')` → `true`.
    *   *Case 3*: `permissions = ['*:*']` — `hasPermission('anything','anything')` → `true`.
    *   *Case 4*: `permissions = ['files:read']` — `hasPermission('users','read')` → `false`.
    *   *Case 5*: Super Admin user always returns `true` from `isSuperAdmin()`.

---

## 3. Mocking & Setup

```javascript
// Mock database pool
const mockDb = { query: jest.fn() };

// Mock JWT service
jest.mock('../src/infrastructure/auth/jwt.service', () => ({
  getJWTService: () => ({
    verifyAccessToken: jest.fn().mockReturnValue({
      valid: true,
      payload: {
        userId: 'user-uuid',
        email: 'test@example.com',
        tenantId: 'tenant-uuid',
        roles: ['tenant_admin'],
        permissions: ['users:read', 'users:create'],
        sessionId: 'session-uuid'
      }
    }),
    extractToken: jest.fn().mockReturnValue('mock.jwt.token'),
    isTokenExpiring: jest.fn().mockReturnValue(false)
  })
}));

// Mock auth service for session validation
jest.mock('../src/services/auth.service', () => ({
  getAuthService: () => ({
    validateSession: jest.fn().mockResolvedValue({ valid: true })
  })
}));
```

### Example: Validation Middleware Unit Test

```javascript
const { validate } = require('../src/middleware/validationMiddleware');
const { z } = require('zod');

const TestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

describe('Validation Middleware', () => {
  const mockNext = jest.fn();

  it('should call next() for a valid body', () => {
    const req = { body: { email: 'test@example.com', password: 'Secret123!' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const middleware = validate(TestSchema);

    middleware(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(req.body.email).toBe('test@example.com');
  });

  it('should return 400 for an invalid body', () => {
    const req = { body: { email: 'not-an-email', password: 'short' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const middleware = validate(TestSchema);

    middleware(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Validation failed' })
    );
  });

  it('should validate req.params when source is params', () => {
    const ParamSchema = z.object({ id: z.string().uuid() });
    const req = { params: { id: '123e4567-e89b-12d3-a456-426614174000' } };
    const res = {};
    const middleware = validate(ParamSchema, 'params');

    middleware(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});
```

### Example: Authenticate Middleware Unit Test

```javascript
const { authenticate } = require('../src/middleware/auth.middleware');

describe('authenticate middleware', () => {
  it('should populate req.user from valid JWT', async () => {
    const req = {
      headers: { authorization: 'Bearer valid.jwt.token' }
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), set: jest.fn() };
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({
      id: 'user-uuid',
      email: 'test@example.com',
      isApiKey: false
    });
  });

  it('should return 401 when no credentials provided', async () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'MISSING_TOKEN' }) })
    );
  });
});
```
