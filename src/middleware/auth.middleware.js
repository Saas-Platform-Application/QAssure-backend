/**
 * Authentication & Authorization Middleware - QAssure Platform
 * Provides JWT verification, API Key validation, permission checking, and role-based access
 */
const { getJWTService } = require('../infrastructure/auth/jwt.service');
const { getPermissionService } = require('../infrastructure/auth/permission.service');
const { getApiKeyService } = require('../services/api_key.service');
const database = require('../config/database');
const config = require('../config/config');

/**
 * Authenticate request using JWT or API Key
 * Checks for API Key first (X-API-Key header), then JWT (Authorization: Bearer)
 */
const authenticate = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const jwtService = getJWTService();
    const authHeader = req.headers.authorization;
    const token = jwtService.extractToken(authHeader);

    // MODE 1: Combined JWT + API Key (module calling platform service on behalf of user)
    if (token && apiKey) {
      return authenticateWithCombined(req, res, next, token, apiKey);
    }

    // MODE 2: API Key only (verify-launch-token, system/cron operations)
    if (apiKey) {
      return authenticateWithApiKey(req, res, next, apiKey);
    }

    // MODE 3: JWT only (QAssure UI users)
    if (token) {
      const result = jwtService.verifyAccessToken(token);

      if (!result.valid) {
        return res.status(401).json({
          success: false,
          error: {
            code: result.error.code,
            message: result.error.message
          }
        });
      }

      // Validate session in Redis/DB
      const { getAuthService } = require('../services/auth.service');
      const authService = getAuthService();
      const sessionValid = await authService.validateSession(
        result.payload.sessionId,
        result.payload.userId
      );

      if (!sessionValid.valid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'SESSION_EXPIRED',
            message: 'Session has expired or been revoked'
          }
        });
      }

      req.user = {
        id: result.payload.userId,
        email: result.payload.email,
        tenantId: result.payload.tenantId,
        roles: result.payload.roles,
        permissions: result.payload.permissions,
        sessionId: result.payload.sessionId,
        isApiKey: false
      };

      if (jwtService.isTokenExpiring(token, 300)) {
        res.set('X-Token-Expiring', 'true');
      }

      // ── UPDATE last_activity_at (debounced via Redis) ─────────────────────
      // Keeps active users' idle timer reset on every API call.
      // DB write is debounced to once per 60s per session via a Redis key,
      // so high-frequency API calls don't cause a DB write on every request.
      if (config.session.idleTimeoutEnabled) {
        setImmediate(async () => {
          try {
            const sessionId = result.payload.sessionId;
            const debounceKey = `qassure:idle_debounce:${sessionId}`;
            let shouldWrite = true;

            if (authService.redisService?.isConnected) {
              const existing = await authService.redisService.get(debounceKey);
              if (existing) {
                shouldWrite = false;
              } else {
                await authService.redisService.set(debounceKey, '1', 60);
              }
            }

            if (shouldWrite) {
              await database.query(
                `UPDATE sessions SET last_activity_at = NOW(), updated_at = NOW() WHERE id = $1 AND revoked_at IS NULL`,
                [sessionId]
              );
            }
          } catch (activityErr) {
            // Non-critical — never block the request
            console.warn('[Auth Middleware] Failed to update last_activity_at:', activityErr.message);
          }
        });
      }
      // ── END last_activity_at UPDATE ───────────────────────────────────────

      return next();
    }

    // No credentials provided
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authentication token is required',
        hint: 'Include Authorization: Bearer <token> header OR X-API-Key: <key> header'
      }
    });
  } catch (error) {
    console.error('[Auth Middleware] Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    });
  }
};

/**
 * Authenticate using API Key
 * @param {Request} req 
 * @param {Response} res 
 * @param {Function} next 
 * @param {string} apiKey 
 */
const authenticateWithApiKey = async (req, res, next, apiKey) => {
  try {
    const apiKeyService = getApiKeyService();
    const result = await apiKeyService.validate(apiKey);

    if (!result.valid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: result.error || 'Invalid API key'
        }
      });
    }

    // Resolve tenant: API key's own tenant, or X-Tenant-ID header fallback
    let tenantId = result.apiKey.tenantId;
    const headerTenantId = req.headers['x-tenant-id'];

    if (!tenantId && headerTenantId) {
      tenantId = headerTenantId;
    } else if (!tenantId && !headerTenantId) {
      // No tenant from API key or header — allow through for endpoints
      // like verify-launch-token that derive tenant from request body.
      // Downstream controllers must validate tenantId if required.
    }

    // If X-Tenant-ID provided AND API key has a tenant, verify they match
    if (headerTenantId && result.apiKey.tenantId && headerTenantId !== result.apiKey.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_MISMATCH',
          message: 'X-Tenant-ID does not match API key tenant'
        }
      });
    }

    // Verify module is active for this tenant (if module-linked key)
    if (result.apiKey.moduleId && tenantId) {
      const moduleCheck = await database.query(`
        SELECT module_id FROM (
          SELECT module_id FROM tenant_modules WHERE tenant_id = $1 AND module_id = $2 AND status = 'active'
          UNION
          SELECT module_id FROM tenant_module_access WHERE tenant_id = $1 AND module_id = $2 AND enabled = true
        ) AS active_check
      `, [tenantId, result.apiKey.moduleId]);

      if (moduleCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'MODULE_NOT_ACTIVE',
            message: 'Module is not active for this tenant'
          }
        });
      }
    }

    // Attach API key info to request
    req.user = {
      id: result.apiKey.userId,
      tenantId: tenantId,
      permissions: result.apiKey.permissions,
      isApiKey: true,
      apiKeyId: result.apiKey.id,
      apiKeyName: result.apiKey.name,
      moduleId: result.apiKey.moduleId,
      moduleCode: result.apiKey.moduleCode || null,
      moduleName: result.apiKey.moduleName || null
    };

    next();


  } catch (error) {
    console.error('[Auth Middleware] API Key authentication error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'API key authentication failed'
      }
    });
  }
};

/**
 * Combined authentication: JWT (user identity) + API Key (module identity)
 * Used when a module calls platform services on behalf of a user
 * - JWT identifies WHO (the user)
 * - API Key identifies WHICH MODULE and verifies it's active for the tenant
 */
const authenticateWithCombined = async (req, res, next, token, apiKey) => {
  try {
    // Step 1: Verify JWT — get user identity
    const jwtService = getJWTService();
    const jwtResult = jwtService.verifyAccessToken(token);

    if (!jwtResult.valid) {
      return res.status(401).json({
        success: false,
        error: {
          code: jwtResult.error.code,
          message: jwtResult.error.message
        }
      });
    }

    // Validate session in Redis/DB
    const { getAuthService } = require('../services/auth.service');
    const authService = getAuthService();
    const sessionValid = await authService.validateSession(
      jwtResult.payload.sessionId,
      jwtResult.payload.userId
    );

    if (!sessionValid.valid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session has expired or been revoked'
        }
      });
    }

    // Step 2: Validate API Key — get module identity
    const apiKeyService = getApiKeyService();
    const apiKeyResult = await apiKeyService.validate(apiKey);

    if (!apiKeyResult.valid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: apiKeyResult.error || 'Invalid API key'
        }
      });
    }

    // Step 3: Cross-check — JWT tenant must match API Key tenant
    const jwtTenantId = jwtResult.payload.tenantId;
    const apiKeyTenantId = apiKeyResult.apiKey.tenantId;

    if (jwtTenantId && apiKeyTenantId && jwtTenantId !== apiKeyTenantId) {
      console.warn(`[Auth Middleware] Tenant mismatch: JWT=${jwtTenantId}, APIKey=${apiKeyTenantId}`);
      return res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_MISMATCH',
          message: 'User tenant does not match module tenant'
        }
      });
    }

    const effectiveTenantId = jwtTenantId || apiKeyTenantId;

    // Step 4: Verify module is still active for this tenant
    if (apiKeyResult.apiKey.moduleId) {
      const moduleCheck = await database.query(`
        SELECT module_id FROM (
          SELECT module_id FROM tenant_modules WHERE tenant_id = $1 AND module_id = $2 AND status = 'active'
          UNION
          SELECT module_id FROM tenant_module_access WHERE tenant_id = $1 AND module_id = $2 AND enabled = true
        ) AS active_check
      `, [effectiveTenantId, apiKeyResult.apiKey.moduleId]);

      if (moduleCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'MODULE_NOT_ACTIVE',
            message: 'Module is not active for this tenant'
          }
        });
      }
    }

    // Step 5: Set req.user from JWT (user identity drives permissions)
    req.user = {
      id: jwtResult.payload.userId,
      email: jwtResult.payload.email,
      tenantId: effectiveTenantId,
      roles: jwtResult.payload.roles,
      permissions: jwtResult.payload.permissions,
      sessionId: jwtResult.payload.sessionId,
      isApiKey: false  // CRITICAL: user permissions are enforced, not module bypass
    };

    // Step 6: Set req.module (module context for audit trail)
    req.module = {
      id: apiKeyResult.apiKey.moduleId,
      code: apiKeyResult.apiKey.moduleCode,
      name: apiKeyResult.apiKey.moduleName,
      apiKeyId: apiKeyResult.apiKey.id
    };

    // Token expiry warning
    if (jwtService.isTokenExpiring(token, 300)) {
      res.set('X-Token-Expiring', 'true');
    }

    next();
  } catch (error) {
    console.error('[Auth Middleware] Combined authentication error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Combined authentication failed'
      }
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for public routes that behave differently for authenticated users
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Check for API Key first
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      const apiKeyService = getApiKeyService();
      const result = await apiKeyService.validate(apiKey);
      if (result.valid) {
        req.user = {
          id: result.apiKey.userId,
          tenantId: result.apiKey.tenantId,
          permissions: result.apiKey.permissions,
          isApiKey: true,
          apiKeyId: result.apiKey.id,
          apiKeyName: result.apiKey.name,
          moduleId: result.apiKey.moduleId,
          moduleCode: result.apiKey.moduleCode || null,
          moduleName: result.apiKey.moduleName || null
        };
      }
      return next();
    }

    // Check for JWT
    const jwtService = getJWTService();
    const authHeader = req.headers.authorization;
    const token = jwtService.extractToken(authHeader);

    if (token) {
      const result = jwtService.verifyAccessToken(token);
      if (result.valid) {
        const { getAuthService } = require('../services/auth.service');
        const authService = getAuthService();
        const sessionValid = await authService.validateSession(
          result.payload.sessionId,
          result.payload.userId
        );
        if (sessionValid.valid) {
          req.user = {
            id: result.payload.userId,
            email: result.payload.email,
            tenantId: result.payload.tenantId,
            roles: result.payload.roles,
            permissions: result.payload.permissions,
            sessionId: result.payload.sessionId,
            isApiKey: false
          };
        }
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    next();
  }
};

/**
 * Require specific permission(s)
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @returns {Function} Express middleware
 * 
 * Usage: authorize('users', 'read')
 *        authorize('tenants', 'write')
 */
const authorize = (resource, action) => {
  // Handle resource:action format
  if (resource && resource.includes(":") && action === undefined) {
    const parts = resource.split(":");
    resource = parts[0];
    action = parts[1];
  }
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'Authentication required'
          }

        });
      }

      const requiredPermission = `${resource}:${action}`;

      // For API Key authentication, check permissions from the key
      if (req.user.isApiKey) {
        // Module-linked API keys are trusted services — full platform access
        if (req.user.moduleCode) return next();
        const permissions = req.user.permissions || [];

        const hasPermission =
          permissions.includes(requiredPermission) ||
          permissions.includes('*:*') ||
          permissions.includes(`${resource}:*`) ||
          permissions.includes(`*:${action}`);

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: `API key does not have permission: ${requiredPermission}`,
              required: requiredPermission
            }
          });
        }
        return next();
      }

      // For JWT authentication, use permission service
      const permissionService = getPermissionService();

      // Super admin bypasses all permission checks
      const isSuperAdmin = await permissionService.isSuperAdmin(req.user.id);
      if (isSuperAdmin) {
        req.user.isSuperAdmin = true;
        return next();
      }

      // 1. Module-specific check (If module context is set via X-API-Key + JWT)
      if (req.module && req.module.id) {
        // PLATFORM BYPASS: Allow modules to always push audit/event logs regardless of user role
        if ((resource === 'audit_logs' || resource === 'event_logs') && action === 'create') {
          return next();
        }

        const hasPermission = await permissionService.hasPermission(
          req.user.id,
          req.user.tenantId,
          resource,
          action,
          req.module.id
        );

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: `Your role in this module does not have permission to ${action} ${resource}`,
              required: requiredPermission,
              module: req.module.name
            }
          });
        }
        return next();
      }

      // 2. Platform-wide check (JWT only)
      // Check permission from token first (faster)
      if (req.user.permissions && req.user.permissions.includes(requiredPermission)) {
        return next();
      }

      // Check wildcard permissions from token
      if (req.user.permissions) {
        if (req.user.permissions.includes('*:*')) return next();
        if (req.user.permissions.includes(`${resource}:*`)) return next();
        if (req.user.permissions.includes(`*:${action}`)) return next();
      }

      // Fallback: Check database (handles permission updates since token issued)
      const hasPermission = await permissionService.hasPermission(
        req.user.id,
        req.user.tenantId,
        resource,
        action,
        null // No specific module context
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `You don't have permission to ${action} ${resource}`,
            required: requiredPermission
          }
        });
      }

      next();
    } catch (error) {
      console.error('[Auth Middleware] Authorization error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Authorization check failed'
        }
      });
    }
  };
};

/**
 * Require ANY of the specified permissions
 * @param {Array<{resource: string, action: string}>} permissions
 * @returns {Function} Express middleware
 * 
 * Usage: authorizeAny([
 *   { resource: 'users', action: 'read' },
 *   { resource: 'users', action: 'admin' }
 * ])
 */
const authorizeAny = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'Authentication required'
          }
        });
      }

      // For API Key authentication
      if (req.user.isApiKey) {
        const userPerms = req.user.permissions || [];
        const hasAny = permissions.some(p => {
          const required = `${p.resource}:${p.action}`;
          return userPerms.includes(required) ||
            userPerms.includes('*:*') ||
            userPerms.includes(`${p.resource}:*`) ||
            userPerms.includes(`*:${p.action}`);
        });

        if (!hasAny) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Insufficient permissions',
              requiredAny: permissions.map(p => `${p.resource}:${p.action}`)
            }
          });
        }
        return next();
      }

      const permissionService = getPermissionService();

      // Super admin bypasses
      if (await permissionService.isSuperAdmin(req.user.id)) {
        req.user.isSuperAdmin = true;
        return next();
      }

      const hasAny = await permissionService.hasAnyPermission(
        req.user.id,
        req.user.tenantId,
        permissions,
        req.module?.id
      );

      if (!hasAny) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
            requiredAny: permissions.map(p => `${p.resource}:${p.action}`)
          }
        });
      }

      next();
    } catch (error) {
      console.error('[Auth Middleware] Authorization error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Authorization check failed'
        }
      });
    }
  };
};

/**
 * Require ALL of the specified permissions
 * @param {Array<{resource: string, action: string}>} permissions
 * @returns {Function} Express middleware
 */
const authorizeAll = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'Authentication required'
          }
        });
      }

      // For API Key authentication
      if (req.user.isApiKey) {
        const userPerms = req.user.permissions || [];
        const hasAll = permissions.every(p => {
          const required = `${p.resource}:${p.action}`;
          return userPerms.includes(required) ||
            userPerms.includes('*:*') ||
            userPerms.includes(`${p.resource}:*`) ||
            userPerms.includes(`*:${p.action}`);
        });

        if (!hasAll) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Missing required permissions',
              requiredAll: permissions.map(p => `${p.resource}:${p.action}`)
            }
          });
        }
        return next();
      }

      const permissionService = getPermissionService();

      // Super admin bypasses
      if (await permissionService.isSuperAdmin(req.user.id)) {
        req.user.isSuperAdmin = true;
        return next();
      }

      const hasAll = await permissionService.hasAllPermissions(
        req.user.id,
        req.user.tenantId,
        permissions,
        req.module?.id
      );

      if (!hasAll) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Missing required permissions',
            requiredAll: permissions.map(p => `${p.resource}:${p.action}`)
          }
        });
      }

      next();
    } catch (error) {
      console.error('[Auth Middleware] Authorization error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Authorization check failed'
        }
      });
    }
  };
};

/**
 * Require specific role(s)
 * @param {string|Array<string>} roles - Required role(s)
 * @returns {Function} Express middleware
 * 
 * Usage: requireRole('tenant_admin')
 *        requireRole(['tenant_admin', 'quality_manager'])
 */
const requireRole = (roles) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];

  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'Authentication required'
          }
        });
      }

      // API Keys don't have roles - they have permissions
      if (req.user.isApiKey) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'This endpoint requires user authentication with specific roles',
            requiredRoles: roleArray
          }
        });
      }

      const permissionService = getPermissionService();

      // Super admin bypasses
      if (await permissionService.isSuperAdmin(req.user.id)) {
        req.user.isSuperAdmin = true;
        return next();
      }

      const hasRole = await permissionService.hasAnyRole(
        req.user.id,
        req.user.tenantId,
        roleArray,
        req.module?.id
      );

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Required role not assigned',
            requiredRoles: roleArray
          }
        });
      }

      next();
    } catch (error) {
      console.error('[Auth Middleware] Role check error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ROLE_CHECK_ERROR',
          message: 'Role verification failed'
        }
      });
    }
  };
};

/**
 * Helper to dynamically map request paths and methods to resources and actions
 */
const getResourceAndActionFromRequest = (req, explicitResource, explicitAction) => {
  if (explicitResource && explicitAction) {
    return { resource: explicitResource, action: explicitAction };
  }

  const url = (req.baseUrl || '') + (req.path || '');
  let resource = null;
  if (url.includes('tenant')) resource = 'tenants';
  else if (url.includes('module')) resource = 'modules';
  else if (url.includes('audit-log')) resource = 'audit_logs';
  else if (url.includes('notification') || url.includes('categories') || url.includes('codes')) resource = 'notifications';
  else if (url.includes('smtp')) resource = 'smtp_config';
  else if (url.includes('settings')) resource = 'settings';
  else if (url.includes('security')) resource = 'security';
  else if (url.includes('audit-resource')) resource = 'audit_resources';
  else if (url.includes('api-key')) resource = 'api_keys';

  let action = null;
  const method = req.method.toUpperCase();
  if (method === 'GET') action = 'read';
  else if (method === 'POST') action = 'create';
  else if (method === 'PUT' || method === 'PATCH') action = 'update';
  else if (method === 'DELETE') action = 'delete';

  return { resource, action };
};

/**
 * Require platform-level access — super admin OR platform user with matching permission.
 */
const _superAdminCore = (explicitResource, explicitAction) => async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    // API Keys are not platform users
    if (req.user.isApiKey) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Super admin access required (API keys not allowed)'
        }
      });
    }

    const permissionService = getPermissionService();

    // 1. Super admin always passes
    if (await permissionService.isSuperAdmin(req.user.id)) {
      req.user.isSuperAdmin = true;
      return next();
    }

    // 2. Platform user with required permission fallback
    const { resource, action } = getResourceAndActionFromRequest(req, explicitResource, explicitAction);

    if (resource && action) {
      const hasPerm = await permissionService.hasPlatformPermission(
        req.user.id, resource, action
      );

      if (hasPerm) {
        req.user.isPlatformUser = true;
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Super admin access or platform permission required'
      }
    });
  } catch (error) {
    console.error('[Auth Middleware] Super admin check error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authorization check failed'
      }
    });
  }
};

/**
 * requireSuperAdmin — dual-mode middleware.
 *
 * Used as direct middleware:
 *   router.get('/', requireSuperAdmin, handler)
 *
 * Used as factory with explicit resource+action:
 *   router.get('/', requireSuperAdmin('tenants', 'read'), handler)
 */
const requireSuperAdmin = function(resourceOrReq, actionOrRes, nextParam) {
  if (
    resourceOrReq &&
    typeof resourceOrReq === 'object' &&
    typeof resourceOrReq.method === 'string'
  ) {
    return _superAdminCore(null, null)(resourceOrReq, actionOrRes, nextParam);
  }
  return _superAdminCore(resourceOrReq || null, actionOrRes || null);
};

/**
 * Require tenant admin access — with optional platform user delegation.
 *
 * DUAL-MODE: works both as:
 *   (a) Direct middleware (backward compat):  router.post('/', requireTenantAdmin, handler)
 *       Passes: super_admin, tenant_admin
 *
 *   (b) Factory with resource+action:         router.post('/', requireTenantAdmin('roles','create'), handler)
 *       Passes: super_admin, platform_user_with_permission, tenant_admin
 *
 * This keeps ALL existing routes working unchanged while letting new
 * platform-delegatable routes use requireTenantAdmin('resource', 'action').
 */
const _tenantAdminCore = (resource, action) => async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    // API Keys cannot be tenant admin or platform user
    if (req.user.isApiKey) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Tenant admin access required (API keys not allowed)'
        }
      });
    }

    const permissionService = getPermissionService();

    // 1. Super admin always passes
    if (await permissionService.isSuperAdmin(req.user.id)) {
      req.user.isSuperAdmin = true;
      return next();
    }

    // 2. Platform user with the required permission (only when resource+action given)
    if (resource && action) {
      const hasPlatformPerm = await permissionService.hasPlatformPermission(
        req.user.id, resource, action
      );
      if (hasPlatformPerm) {
        req.user.isPlatformUser = true;
        return next();
      }
    }

    // 3. Tenant admin check
    const isTenantAdmin = await permissionService.isTenantAdmin(
      req.user.id,
      req.user.tenantId
    );

    if (!isTenantAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Tenant admin access required'
        }
      });
    }

    req.user.isTenantAdmin = true;
    return next();
  } catch (error) {
    console.error('[Auth Middleware] Tenant admin check error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authorization check failed'
      }
    });
  }
};

/**
 * requireTenantAdmin — dual-mode middleware.
 *
 * Used as direct middleware (existing routes, no platform check):
 *   router.post('/', requireTenantAdmin, handler)
 *
 * Used as factory (platform-delegatable routes):
 *   router.post('/', requireTenantAdmin('roles', 'create'), handler)
 */
const requireTenantAdmin = function(resourceOrReq, actionOrRes, nextParam) {
  // Detect direct middleware call: requireTenantAdmin(req, res, next)
  // A real Express req object always has a .method string property
  if (
    resourceOrReq &&
    typeof resourceOrReq === 'object' &&
    typeof resourceOrReq.method === 'string'
  ) {
    // Called as: router.use(requireTenantAdmin) — backward compat
    return _tenantAdminCore(null, null)(resourceOrReq, actionOrRes, nextParam);
  }
  // Called as factory: requireTenantAdmin('roles', 'create')
  return _tenantAdminCore(resourceOrReq || null, actionOrRes || null);
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  authorizeAny,
  authorizeAll,
  requireRole,
  requireSuperAdmin,
  requireTenantAdmin
};
