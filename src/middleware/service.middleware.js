/**
 * Service Guard Middleware - QAssure Platform
 *
 * Provides serviceEnabled(key) factory — gates any route group behind a
 * per-tenant platform service check.
 *
 * Usage (in any route file, after authenticate + tenantContext):
 *   const { serviceEnabled } = require('../middleware/service.middleware');
 *   router.use(serviceEnabled('document'));
 *
 * Rules:
 *   - Super Admin always bypasses (isSuperAdmin flag set by auth middleware)
 *   - No tenant context → bypass (auth middleware handles that case)
 *   - Result cached in memory per tenantId+serviceKey for CACHE_TTL_MS
 *   - Fail-open: if DB is unreachable, request continues
 *   - invalidateCache(tenantId, key) — called after a service is toggled
 *   - invalidateTenantCache(tenantId) — called after bulk toggle
 */

const database = require('../config/database');

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Simple in-memory TTL cache
// Key: `${tenantId}:${serviceKey}` → { enabled: bool, expiresAt: timestamp }
const _cache = new Map();

function _getCached(tenantId, serviceKey) {
  const entry = _cache.get(`${tenantId}:${serviceKey}`);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    _cache.delete(`${tenantId}:${serviceKey}`);
    return null;
  }
  return entry.enabled;
}

function _setCache(tenantId, serviceKey, enabled) {
  _cache.set(`${tenantId}:${serviceKey}`, {
    enabled,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Invalidate cached result for one tenant+service (call after single toggle).
 */
function invalidateCache(tenantId, serviceKey) {
  _cache.delete(`${tenantId}:${serviceKey}`);
}

/**
 * Invalidate all cached results for a tenant (call after bulk toggle or tenant update).
 */
function invalidateTenantCache(tenantId) {
  const prefix = `${tenantId}:`;
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) {
      _cache.delete(key);
    }
  }
}

/**
 * Middleware factory.
 *
 * @param {string} serviceKey - Must match a key in the platform_services table
 *                              e.g. 'document', 'capa', 'ai', 'qms'
 */
function serviceEnabled(serviceKey) {
  return async (req, res, next) => {
    try {
      // Super Admin always has access — bypasses all service gates
      if (req.user?.isSuperAdmin === true) {
        return next();
      }

      // No tenant context — let auth/tenant middleware handle this downstream
      const tenantId = req.user?.tenantId || req.tenantId;
      if (!tenantId) {
        return next();
      }

      // Check in-memory cache
      const cached = _getCached(tenantId, serviceKey);
      if (cached !== null) {
        return cached ? next() : _sendDisabled(res, serviceKey);
      }

      // DB lookup
      const result = await database.query(
        `SELECT tps.is_enabled
         FROM tenant_platform_services tps
         JOIN platform_services ps ON ps.id = tps.service_id
         WHERE tps.tenant_id = $1
           AND ps.key = $2
         LIMIT 1`,
        [tenantId, serviceKey]
      );

      // If no row exists yet (e.g. tenant pre-dates migration), treat as enabled
      const isEnabled = result.rows.length === 0 ? true : result.rows[0].is_enabled;

      _setCache(tenantId, serviceKey, isEnabled);

      return isEnabled ? next() : _sendDisabled(res, serviceKey);
    } catch (err) {
      // Fail-open: do not block users on infrastructure issues
      console.error(`[ServiceMiddleware] Error checking '${serviceKey}':`, err.message);
      return next();
    }
  };
}

function _sendDisabled(res, serviceKey) {
  const label = serviceKey.replace(/_/g, ' ');
  return res.status(403).json({
    success: false,
    error: {
      code: 'SERVICE_DISABLED',
      service: serviceKey,
      message: `The '${label}' service is not enabled for your organization. Please contact your system administrator.`,
    }
  });
}

module.exports = { serviceEnabled, invalidateCache, invalidateTenantCache };
