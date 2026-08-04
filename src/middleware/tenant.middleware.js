/**
 * Tenant Middleware - QAssure Platform
 * Handles multi-tenancy isolation and context
 */
const database = require('../config/database');

// Tenant cache for performance
const tenantCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Extract and validate tenant context
 */
const tenantContext = async (req, res, next) => {
  try {
    if (req.user) {
      const isSuperAdmin = req.user.isSuperAdmin || 
        req.user.roles?.includes('super_admin') || 
        req.user.role === 'super_admin';
      if (isSuperAdmin) {
        req.user.isSuperAdmin = true;
      }
    }

    let tenantId = 
      req.headers['x-tenant-id'] ||
      req.user?.tenantId ||
      req.query.tenant_id;
      // ||
      // process.env.DEFAULT_TENANT_ID;

      if (!tenantId) {
        // Super admin operates at platform level — no tenant required
        if (req.user?.isSuperAdmin) {
          req.tenant = null;
          return next();
        }

        // Platform users also operate at platform level — check their role scope
        if (req.user?.id) {
          const { getPermissionService } = require('../infrastructure/auth/permission.service');
          const isPlatform = await getPermissionService().isPlatformUser(req.user.id);
          if (isPlatform) {
            req.user.isPlatformUser = true;
            req.tenant = null;
            return next();
          }
        }

        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TENANT',
            message: 'Tenant context is required'
          }
        });
      }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TENANT_ID',
          message: 'Invalid tenant ID format'
        }
      });
    }

    // Check cache
    const cached = tenantCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      req.tenant = cached.tenant;
      req.tenantId = tenantId;
      return next();
    }

    // Fetch from database
    const result = await database.query(
      'SELECT * FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Tenant not found'
        }
      });
    }

    const tenant = result.rows[0];

    if (tenant.status !== 'active' && tenant.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_INACTIVE',
          message: `Tenant is ${tenant.status}`
        }
      });
    }

    // Cache tenant
    tenantCache.set(tenantId, {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        subscription_tier: tenant.subscription_tier,
        settings: tenant.settings
      },
      expiresAt: Date.now() + CACHE_TTL
    });

    req.tenant = tenantCache.get(tenantId).tenant;
    req.tenantId = tenantId;
    res.set('X-Tenant-ID', tenantId);

    next();
  } catch (error) {
    console.error('[Tenant Middleware] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_ERROR',
        message: 'Failed to resolve tenant context'
      }
    });
  }
};

/**
 * Verify user has access to the requested tenant
 */
const verifyTenantAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'NOT_AUTHENTICATED', message: 'Authentication required' }
      });
    }

    // Super admins and platform users can access any tenant — check before tenantId requirement
    const { getPermissionService } = require('../infrastructure/auth/permission.service');
    const isPlatform = req.user.isPlatformUser || await getPermissionService().isPlatformUser(req.user.id);
    if (req.user.roles?.includes('super_admin') || isPlatform) {
      req.user.isPlatformUser = true;
      return next();
    }

    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required' }
      });
    }

    // Check if user's token tenant matches
    if (req.user.tenantId === req.tenantId) {
      return next();
    }

    // Check user_tenants table
    const result = await database.query(
      `SELECT id FROM user_tenants 
       WHERE user_id = $1 AND tenant_id = $2 AND status = 'ACTIVE'`,
      [req.user.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      // 1. Fetch current violations in last 24 hours
      const violationCheck = await database.query(
        `SELECT COUNT(*)::integer as count FROM audit_logs 
         WHERE user_id = $1 AND action = 'CROSS_TENANT_VIOLATION' AND created_at > NOW() - INTERVAL '24 hours'`,
        [req.user.id]
      );
      const rawCount = violationCheck.rows[0]?.count;
      const violationCount = parseInt(rawCount !== undefined ? rawCount : 0, 10) + 1;

      // 2. Log this attempt in audit log
      const { getAuditService } = require('../services/audit.service');
      await getAuditService().log({
        action: 'CROSS_TENANT_VIOLATION',
        user_id: req.user.id,
        tenant_id: req.user.tenantId,
        resource_type: 'user',
        resource_id: req.user.id,
        request_method: req.method,
        request_path: req.path,
        response_status: 403,
        metadata: {
          attempt: violationCount,
          requested_tenant_id: req.tenantId
        },
        ip_address: req.ip || req.connection?.remoteAddress,
        user_agent: req.headers?.['user-agent']
      });

      // 3. Suspend user if count >= 5
      if (violationCount >= 5) {
        const suspensionMetadata = {
          security: {
            suspended_reason: `Cross-tenant access violation threshold exceeded (${violationCount} attempts).`,
            violation_count: violationCount,
            suspended_at: new Date().toISOString()
          }
        };

        // Update user status
        await database.query(
          `UPDATE users 
           SET status = 'suspended', preferences = COALESCE(preferences, '{}'::jsonb) || $1::jsonb
           WHERE id = $2`,
          [JSON.stringify(suspensionMetadata), req.user.id]
        );

        // Revoke sessions
        const { getAuthService } = require('../services/auth.service');
        await getAuthService().logoutAll(req.user.id);

        // Log suspension event in audit log
        await getAuditService().log({
          action: 'USER_SUSPENDED',
          user_id: req.user.id,
          tenant_id: req.user.tenantId,
          resource_type: 'user',
          resource_id: req.user.id,
          response_status: 403,
          metadata: {
            reason: 'cross_tenant_violation',
            attempts: violationCount
          }
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: 'Your account has been suspended due to security violations. Please contact your administrator.'
          }
        });
      }

      return res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ACCESS_DENIED',
          message: 'You do not have access to this tenant'
        }
      });
    }

    next();
  } catch (error) {
    console.error('[Tenant Middleware] Access error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'TENANT_ERROR', message: 'Failed to verify tenant access' }
    });
  }
};

/**
 * Optional tenant context
 */
const optionalTenantContext = async (req, res, next) => {
  try {
    if (req.user) {
      const isSuperAdmin = req.user.isSuperAdmin || 
        req.user.roles?.includes('super_admin') || 
        req.user.role === 'super_admin';
      if (isSuperAdmin) {
        req.user.isSuperAdmin = true;
      }
    }

    const tenantId = 
      req.headers['x-tenant-id'] ||
      req.user?.tenantId ||
      req.query.tenant_id;

    if (tenantId) {
      const result = await database.query(
        'SELECT * FROM tenants WHERE id = $1',
        [tenantId]
      );
      
      if (result.rows.length > 0) {
        const tenant = result.rows[0];
        req.tenant = {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          subscription_tier: tenant.subscription_tier,
          settings: tenant.settings
        };
        req.tenantId = tenantId;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

/**
 * Check if tenant has a feature enabled
 */
const requireFeature = (featureName) => {
  return (req, res, next) => {
    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required' }
      });
    }

    const settings = req.tenant.settings || {};
    if (!settings[featureName]) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FEATURE_DISABLED',
          message: `Feature '${featureName}' is not enabled`
        }
      });
    }

    next();
  };
};

/**
 * Check subscription tier
 */
const requireSubscriptionTier = (allowedTiers) => {
  const tiers = Array.isArray(allowedTiers) ? allowedTiers : [allowedTiers];
  
  return (req, res, next) => {
    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required' }
      });
    }

    if (!tiers.includes(req.tenant.subscription_tier)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_REQUIRED',
          message: `Requires ${tiers.join(' or ')} subscription`
        }
      });
    }

    next();
  };
};

const clearTenantCache = (tenantId = null) => {
  if (tenantId) {
    tenantCache.delete(tenantId);
  } else {
    tenantCache.clear();
  }
};

module.exports = {
  tenantContext,
  verifyTenantAccess,
  optionalTenantContext,
  requireFeature,
  requireSubscriptionTier,
  clearTenantCache
};
