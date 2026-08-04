/**
 * API Key Authentication Middleware - QAssure Platform
 * Validates API keys for module-to-platform communication
 */
const { getApiKeyService } = require('../services/api_key.service');
const database = require('../config/database');

/**
 * Authenticate request using API Key
 * Looks for X-API-Key header
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required',
          hint: 'Include X-API-Key header with your request'
        }
      });
    }

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

    // Resolve tenant context:
    // - Tenant-scoped key (tenantId set) → use directly
    // - Module-scoped key (tenantId null) → require X-Tenant-ID header
    const tenantIdFromHeader = req.headers['x-tenant-id'];
    const resolvedTenantId = result.apiKey.tenantId || tenantIdFromHeader;

    if (!resolvedTenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'Module API keys require X-Tenant-ID header',
          hint: 'Include X-Tenant-ID: <tenant-uuid> header with your request'
        }
      });
    }

    // Validate module is assigned to this tenant (for module-scoped keys only)
    if (!result.apiKey.tenantId && result.apiKey.moduleId) {
      // const { query } = require('../config/database');
      // const tenantCheck = await query(
      //   `SELECT id FROM tenant_module_access 
      //    WHERE module_id = $1 AND tenant_id = $2 AND enabled = true`,
      //   [result.apiKey.moduleId, resolvedTenantId]
      // );
      const tenantCheck = await database.query(`
              SELECT module_id FROM (
                SELECT module_id FROM tenant_modules WHERE tenant_id = $1 AND module_id = $2 AND status = 'active'
                UNION
                SELECT module_id FROM tenant_module_access WHERE tenant_id = $1 AND module_id = $2 AND enabled = true
              ) AS active_check
            `, [resolvedTenantId, result.apiKey.moduleId]);

      if (tenantCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'MODULE_NOT_ASSIGNED',
            message: 'This module is not assigned to the specified tenant',
            hint: 'Ensure the module is enabled for this tenant in QAssure'
          }
        });
      }
    }

    // Attach resolved context to request
    req.apiKey = result.apiKey;
    req.user = {
      id: result.apiKey.userId,
      tenantId: resolvedTenantId,
      permissions: result.apiKey.permissions,
      isApiKey: true,
      apiKeyId: result.apiKey.id,
      apiKeyName: result.apiKey.name,
      moduleId: result.apiKey.moduleId,
      moduleCode: result.apiKey.moduleCode
    };

    next();
  } catch (error) {
    console.error('[ApiKey Middleware] Authentication error:', error);
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
 * Authenticate with either JWT or API Key
 * Tries JWT first, then API Key
 */
const authenticateAny = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  // If JWT token is present, use JWT auth
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const { authenticate } = require('./auth.middleware');
    return authenticate(req, res, next);
  }

  // If API key is present, use API key auth
  if (apiKey) {
    return authenticateApiKey(req, res, next);
  }

  // Neither present
  return res.status(401).json({
    success: false,
    error: {
      code: 'MISSING_CREDENTIALS',
      message: 'Authentication required',
      hint: 'Include either Authorization: Bearer <token> OR X-API-Key: <key> header'
    }
  });
};

/**
 * Check if API key has required permission
 */
const authorizeApiKey = (resource, action) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.isApiKey) {
      return next(); // Not an API key request, skip
    }

    const requiredPermission = `${resource}:${action}`;
    const permissions = req.user.permissions || [];

    // Check for exact permission or wildcards
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
          required: requiredPermission,
          available: permissions
        }
      });
    }

    next();
  };
};

module.exports = {
  authenticateApiKey,
  authenticateAny,
  authorizeApiKey
};
