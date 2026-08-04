/**
 * Permission Service - QAssure Platform
 * Handles RBAC permission checking with Redis caching
 */
const database = require("../../config/database");

class PermissionService {
  constructor() {
    // In-memory fallback cache
    this.localCache = new Map();
    this.cacheTTL = 5 * 60; // 5 minutes in seconds
    this.redisService = null;
  }

  /**
   * Initialize Redis connection (called after Redis is ready)
   */
  setRedisService(redisService) {
    this.redisService = redisService;
    console.log("[PermissionService] Redis caching enabled");
  }

  /**
   * Get from cache (Redis first, then local)
   */
  async getFromCache(key) {
    // Try Redis first
    if (this.redisService?.isConnected) {
      try {
        const cached = await this.redisService.get(key);
        if (cached) return cached;
      } catch (err) {
        console.warn("[PermissionService] Redis get error:", err.message);
      }
    }

    // Fallback to local cache
    const local = this.localCache.get(key);
    if (local && local.expiresAt > Date.now()) {
      return local.data;
    }
    return null;
  }

  /**
   * Set to cache (both Redis and local)
   */
  async setToCache(key, data) {
    // Set in Redis
    if (this.redisService?.isConnected) {
      try {
        await this.redisService.set(key, data, this.cacheTTL);
      } catch (err) {
        console.warn("[PermissionService] Redis set error:", err.message);
      }
    }

    // Also set in local cache as fallback
    this.localCache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTTL * 1000,
    });
  }

  /**
   * Get all permissions for a user within a tenant
   * @param {string} userId - User UUID
   * @param {string} tenantId - Tenant UUID
   * @param {string} moduleId - Module UUID (optional, for module-specific filtering)
   * @returns {Promise<Array>} - List of permission strings
   */
  async getUserPermissions(userId, tenantId, moduleId = null) {
    const cacheKey = moduleId 
      ? `permissions:${userId}:${tenantId}:${moduleId}`
      : `permissions:${userId}:${tenantId}`;

    // Check cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get permissions through user_roles -> roles -> permissions
      let query = `
        SELECT DISTINCT p.resource, p.action
        FROM user_roles ur
        JOIN permissions p ON p.role_id = ur.role_id
        WHERE ur.user_id = $1
          AND (ur.tenant_id = $2 OR ur.tenant_id IS NULL)
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      `;

      const params = [userId, tenantId];

      if (moduleId) {
        query += ` AND (ur.module_id = $3 OR ur.module_id IS NULL)`;
        params.push(moduleId);
      }

      const result = await database.query(query, params);

      // Build permission strings
      const permissionSet = new Set();
      result.rows.forEach((row) => {
        permissionSet.add(`${row.resource}:${row.action}`);
      });

      const permissions = Array.from(permissionSet);

      // Cache the result
      await this.setToCache(cacheKey, permissions);

      return permissions;
    } catch (error) {
      console.error("[PermissionService] Error fetching permissions:", error);
      throw error;
    }
  }

  /**
   * Get user's roles for a tenant
   * @param {string} userId - User UUID
   * @param {string} tenantId - Tenant UUID
   * @param {string} moduleId - Module UUID (optional)
   * @returns {Promise<Array>} - List of role names
   */
  async getUserRoles(userId, tenantId, moduleId = null) {
    const cacheKey = moduleId
      ? `roles:${userId}:${tenantId}:${moduleId}`
      : `roles:${userId}:${tenantId}`;

    // Check cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let query = `
        SELECT r.name, r.code
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1
          AND (ur.tenant_id = $2 OR ur.tenant_id IS NULL)
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      `;

      const params = [userId, tenantId];

      if (moduleId) {
        query += ` AND (ur.module_id = $3 OR ur.module_id IS NULL)`;
        params.push(moduleId);
      }

      const result = await database.query(query, params);
      const roles = Array.from(new Set(result.rows.map((r) => r.code || r.name)));

      // Cache the result
      await this.setToCache(cacheKey, roles);

      return roles;
    } catch (error) {
      console.error("[PermissionService] Error fetching roles:", error);
      throw error;
    }
  }

  /**
   * Get all role and module combinations assigned to a user within a tenant
   */
  async getUserRoleModuleCombinations(userId, tenantId) {
    try {
      const query = `
        SELECT r.id as role_id, r.name as role_name, r.code as role_code, 
               m.id as module_id, m.module_id as module_code, m.name as module_name
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        LEFT JOIN modules m ON m.id = ur.module_id
        WHERE ur.user_id = $1
          AND (ur.tenant_id = $2 OR ur.tenant_id IS NULL)
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      `;
      const result = await database.query(query, [userId, tenantId]);
      return result.rows.map((row) => ({
        role: { id: row.role_id, name: row.role_name, code: row.role_code },
        module: row.module_id ? { id: row.module_id, code: row.module_code, name: row.module_name } : null
      }));
    } catch (error) {
      console.error("[PermissionService] Error fetching role module combinations:", error);
      throw error;
    }
  }

  /**
   * Get user's roles for a specific module
   */
  async getUserRolesForModule(userId, tenantId, moduleId) {
    try {
      const query = `
        SELECT r.name, r.code
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1
          AND (ur.tenant_id = $2 OR ur.tenant_id IS NULL)
          AND (ur.module_id = $3 OR ur.module_id IS NULL)
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      `;
      const result = await database.query(query, [userId, tenantId, moduleId]);
      return Array.from(new Set(result.rows.map((r) => r.code || r.name)));
    } catch (error) {
      console.error("[PermissionService] Error fetching roles for module:", error);
      throw error;
    }
  }

  /**
   * Get all permissions for a user within a tenant for a specific module
   */
  async getUserPermissionsForModule(userId, tenantId, moduleId) {
    try {
      const query = `
        SELECT DISTINCT p.resource, p.action
        FROM user_roles ur
        JOIN permissions p ON p.role_id = ur.role_id
        WHERE ur.user_id = $1
          AND (ur.tenant_id = $2 OR ur.tenant_id IS NULL)
          AND (ur.module_id = $3 OR ur.module_id IS NULL)
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      `;
      const result = await database.query(query, [userId, tenantId, moduleId]);
      const permissionSet = new Set();
      result.rows.forEach((row) => {
        permissionSet.add(`${row.resource}:${row.action}`);
      });
      return Array.from(permissionSet);
    } catch (error) {
      console.error("[PermissionService] Error fetching permissions for module:", error);
      throw error;
    }
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId, tenantId, resource, action, moduleId = null) {
    const permissions = await this.getUserPermissions(userId, tenantId, moduleId);
    const requiredPermission = `${resource}:${action}`;

    // Check for exact match
    if (permissions.includes(requiredPermission)) return true;

    // Check for wildcard permissions
    if (permissions.includes("*:*")) return true;
    if (permissions.includes(`${resource}:*`)) return true;
    if (permissions.includes(`*:${action}`)) return true;

    return false;
  }

  /**
   * Check if user has ANY of the specified permissions
   */
  async hasAnyPermission(userId, tenantId, permissionsToCheck, moduleId = null) {
    for (const { resource, action } of permissionsToCheck) {
      if (await this.hasPermission(userId, tenantId, resource, action, moduleId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has ALL of the specified permissions
   */
  async hasAllPermissions(userId, tenantId, permissionsToCheck, moduleId = null) {
    for (const { resource, action } of permissionsToCheck) {
      if (!(await this.hasPermission(userId, tenantId, resource, action, moduleId))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(userId, tenantId, roleName, moduleId = null) {
    const roles = await this.getUserRoles(userId, tenantId, moduleId);
    return roles.includes(roleName);
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasAnyRole(userId, tenantId, roleNames, moduleId = null) {
    const userRoles = await this.getUserRoles(userId, tenantId, moduleId);
    return roleNames.some((role) => userRoles.includes(role));
  }

  /**
   * Check if user is a super admin (platform level)
   */
  async isSuperAdmin(userId) {
    const cacheKey = `superadmin:${userId}`;

    const cached = await this.getFromCache(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const query = `
        SELECT ur.id FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1
          AND r.code = 'super_admin'
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        LIMIT 1
      `;
      const result = await database.query(query, [userId]);
      const isSuperAdmin = result.rows.length > 0;

      await this.setToCache(cacheKey, isSuperAdmin);

      return isSuperAdmin;
    } catch (error) {
      console.error("[PermissionService] Error checking super admin:", error);
      return false;
    }
  }

  /**
   * Check if user is a tenant admin
   */
  async isTenantAdmin(userId, tenantId) {
    return this.hasRole(userId, tenantId, "tenant_admin", null);
  }

  /**
   * Check if a user has a specific permission via a platform-scoped role.
   * Platform roles: scope='platform', code != 'super_admin'
   * Supports actions: read, create, update, delete, all, *
   * @param {string} userId
   * @param {string} resource
   * @param {string} action
   * @returns {Promise<boolean>}
   */
  async hasPlatformPermission(userId, resource, action) {
    const cacheKey = `platform_perm:${userId}:${resource}:${action}`;
    const cached = await this.getFromCache(cacheKey);
    if (cached !== null) return cached;

    try {
      const query = `
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        JOIN permissions p ON p.role_id = r.id
        WHERE ur.user_id = $1
          AND r.scope = 'platform'
          AND r.code != 'super_admin'
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND (
            (p.resource = $2 AND (p.action = $3 OR p.action = 'all' OR p.action = '*'))
            OR (p.resource = '*' AND p.action = '*')
          )
        LIMIT 1
      `;
      const result = await database.query(query, [userId, resource, action]);
      const hasPerm = result.rows.length > 0;
      await this.setToCache(cacheKey, hasPerm);
      return hasPerm;
    } catch (error) {
      console.error('[PermissionService] hasPlatformPermission error:', error);
      return false;
    }
  }

  /**
   * Check if a user is a platform-level user (has any platform-scoped role, excluding super_admin).
   * Used by tenant middleware to allow platform users to bypass tenant requirement.
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async isPlatformUser(userId) {
    const cacheKey = `platform_user:${userId}`;
    const cached = await this.getFromCache(cacheKey);
    if (cached !== null) return cached;

    try {
      const query = `
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1
          AND r.scope = 'platform'
          AND r.code != 'super_admin'
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        LIMIT 1
      `;
      const result = await database.query(query, [userId]);
      const isPlatform = result.rows.length > 0;
      await this.setToCache(cacheKey, isPlatform);
      return isPlatform;
    } catch (error) {
      console.error('[PermissionService] isPlatformUser error:', error);
      return false;
    }
  }

  /**
   * Clear permission cache for a user
   */
  async clearCache(userId, tenantId = null) {
    // Clear from Redis
    if (this.redisService?.isConnected) {
      try {
        if (tenantId) {
          await this.redisService.delete(`permissions:${userId}:${tenantId}`);
          await this.redisService.deletePattern(`permissions:${userId}:${tenantId}:*`);
          await this.redisService.delete(`roles:${userId}:${tenantId}`);
        } else {
          await this.redisService.deletePattern(`permissions:${userId}:*`);
          await this.redisService.deletePattern(`roles:${userId}:*`);
        }
        await this.redisService.delete(`superadmin:${userId}`);
        await this.redisService.deletePattern(`platform_perm:${userId}:*`);
        await this.redisService.delete(`platform_user:${userId}`);
      } catch (err) {
        console.warn("[PermissionService] Redis clear error:", err.message);
      }
    }

    // Clear from local cache
    if (tenantId) {
      this.localCache.delete(`permissions:${userId}:${tenantId}`);
      this.localCache.delete(`roles:${userId}:${tenantId}`);
      // Also clear any module-specific permissions in local cache
      for (const key of this.localCache.keys()) {
        if (key.startsWith(`permissions:${userId}:${tenantId}:`)) {
          this.localCache.delete(key);
        }
      }
    } else {
      for (const key of this.localCache.keys()) {
        if (key.includes(userId)) {
          this.localCache.delete(key);
        }
      }
    }
  }

  /**
   * Clear all caches (use when roles/permissions are updated)
   */
  async clearAllCache() {
    // Clear Redis
    if (this.redisService?.isConnected) {
      try {
        await this.redisService.deletePattern("permissions:*");
        await this.redisService.deletePattern("roles:*");
        await this.redisService.deletePattern("superadmin:*");
        await this.redisService.deletePattern("platform_perm:*");
        await this.redisService.deletePattern("platform_user:*");
      } catch (err) {
        console.warn("[PermissionService] Redis clear all error:", err.message);
      }
    }

    // Clear local cache (covers all keys including platform_perm: and platform_user:)
    this.localCache.clear();
  }

  getCacheStats() {
    return {
      localCacheSize: this.localCache.size,
      ttlSeconds: this.cacheTTL,
      redisEnabled: this.redisService?.isConnected || false,
    };
  }
}

// Singleton
let instance = null;
const getPermissionService = () => {
  if (!instance) {
    instance = new PermissionService();
  }
  return instance;
};

module.exports = { PermissionService, getPermissionService };
