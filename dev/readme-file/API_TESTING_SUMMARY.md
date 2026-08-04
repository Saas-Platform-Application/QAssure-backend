# API Testing Summary

## 📚 Documentation Files Created

1. **API_TESTING_GUIDE.md** - Complete guide with all curl commands and Postman steps
2. **test_all_endpoints.sh** - Automated test script for all endpoints
3. **API_QUICK_REFERENCE.md** - Quick reference card for common operations

## 🎯 How to Use

### Option 1: Automated Testing (Recommended)
```bash
# Make script executable (already done)
chmod +x test_all_endpoints.sh

# Run all tests
./test_all_endpoints.sh
```

### Option 2: Manual Testing with curl
Follow the commands in `API_TESTING_GUIDE.md` section by section.

### Option 3: Postman Collection
1. Import `QAssure_API_Collection.postman_collection.json`
2. Set environment variable `base_url` = `http://localhost:3000/api/v1`
3. Run "Login" request first
4. All other requests will use the saved token automatically

## 📊 Endpoint Categories

### ✅ Public Endpoints (No Auth)
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with DB/Redis status
- `GET /metrics` - Prometheus metrics
- `GET /` - API information
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token
- `POST /auth/verify-email` - Email verification
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

### 🔒 Protected Endpoints (Auth Required)

#### Authentication
- `GET /auth/me` - Get current user
- `GET /auth/sessions` - List active sessions
- `POST /auth/logout` - Logout current session
- `POST /auth/logout-all` - Logout all sessions
- `POST /auth/validate` - Validate token
- `POST /auth/change-password` - Change password
- `DELETE /auth/sessions/:id` - Revoke session

#### User Management
- `GET /users` - List users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user (admin)
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user (admin)

#### Tenant Management
- `GET /tenants` - List tenants (super admin)
- `GET /tenants/:id` - Get tenant by ID
- `POST /tenants` - Create tenant (super admin)
- `PUT /tenants/:id` - Update tenant
- `DELETE /tenants/:id` - Delete tenant (super admin)

#### Role Management
- `GET /roles` - List roles
- `GET /roles/:id` - Get role by ID
- `POST /roles` - Create role (admin)
- `PUT /roles/:id` - Update role (admin)
- `DELETE /roles/:id` - Delete role (admin)

#### Permission Management
- `GET /permissions` - List permissions
- `GET /permissions/:id` - Get permission by ID
- `POST /permissions` - Create permission (admin)
- `PUT /permissions/:id` - Update permission (admin)
- `DELETE /permissions/:id` - Delete permission (admin)

#### API Key Management
- `GET /api-keys` - List API keys
- `GET /api-keys/:id` - Get API key by ID
- `POST /api-keys` - Create API key
- `POST /api-keys/validate` - Validate API key
- `PUT /api-keys/:id` - Update API key
- `POST /api-keys/:id/revoke` - Revoke API key
- `POST /api-keys/:id/regenerate` - Regenerate API key
- `DELETE /api-keys/:id` - Delete API key

#### Module Management
- `GET /modules` - List modules
- `GET /modules/stats` - Get module statistics
- `GET /modules/states` - Get module state diagram
- `GET /modules/:id` - Get module by ID
- `POST /modules` - Register module
- `PUT /modules/:id` - Update module
- `PATCH /modules/:id/status` - Update module status
- `POST /modules/:id/start` - Start module
- `POST /modules/:id/stop` - Stop module
- `POST /modules/:id/restart` - Restart module
- `POST /modules/:id/maintenance` - Set maintenance mode
- `POST /modules/:id/deprecate` - Deprecate module
- `PATCH /modules/:id/version` - Update version
- `POST /modules/:id/health-check` - Health check
- `GET /modules/:id/health-history` - Health history
- `DELETE /modules/:id` - Delete module

#### Session Management
- `GET /sessions` - List sessions
- `GET /sessions/:id` - Get session by ID

#### Audit Logs
- `GET /audit-logs` - List audit logs
- `GET /audit-logs/:id` - Get audit log by ID

#### QMS Integration
- `GET /qms/connections` - List QMS connections
- `POST /qms/connections` - Create QMS connection
- `GET /qms/sync-jobs` - List sync jobs
- `GET /qms/sync-conflicts` - List sync conflicts
- `GET /qms/entity-mappings` - List entity mappings

#### AI Gateway
- `POST /ai/completion` - AI completion
- `GET /ai/usage` - List AI usage

## 🧪 Testing Workflow

1. **Start Server**
   ```bash
   npm start
   ```

2. **Run Automated Tests**
   ```bash
   ./test_all_endpoints.sh
   ```

3. **Or Test Manually**
   - Follow `API_TESTING_GUIDE.md`
   - Use Postman collection

## ✅ Expected Results

- All health endpoints should return 200
- Login should return 200 with tokens
- Authenticated endpoints should return 200/201/204
- Unauthorized requests should return 401
- Forbidden requests should return 403

## 📝 Notes

- Replace `$ACCESS_TOKEN` with actual token in curl commands
- Replace `:id` placeholders with actual IDs
- Some endpoints require specific permissions (admin, super_admin)
- Check server logs if endpoints fail

---

**Last Updated:** December 30, 2025

