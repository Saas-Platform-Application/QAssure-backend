/**
 * Tenant Module Service - QAssure Platform
 * Handles enabling/disabling modules for tenants (Super Admin operations)
 */
const crypto = require('crypto');
const database = require('../config/database');
const { getAuditService } = require('./audit.service');
const tenantService = require('./tenant_service');
const { getModuleService } = require('./module.service');
// Note: roleService is loaded lazily to avoid circular dependency

class TenantModuleService {
  constructor() {
    this.auditService = getAuditService();
  }

  /**
   * Enable a module for a tenant
   * @param {string} tenantId - Tenant UUID
   * @param {string} moduleId - Module UUID
   * @param {string} enabledBy - User UUID (Super Admin)
   * @param {Object} settings - Optional tenant-specific settings
   */
  async enableModuleForTenant(tenantId, moduleId, enabledBy, settings = null) {
    // Verify tenant exists
    const tenant = await tenantService.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    const tenantData = tenant.toJSON ? tenant.toJSON() : tenant;

    // Resolve module (handles both UUID and code)
    const moduleService = getModuleService();
    let module;
    try {
      if (moduleId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        module = await moduleService.getById(moduleId);
      } else {
        module = await moduleService.getByModuleId(moduleId);
      }
    } catch (e) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    const resolvedModuleId = module.id;

    // Check if already exists
    const existingResult = await database.query(
      'SELECT id, enabled FROM tenant_module_access WHERE tenant_id = $1 AND module_id = $2',
      [tenantId, resolvedModuleId]
    );

    let result;
    let action;

    if (existingResult.rows.length > 0) {
      // Update existing record
      result = await database.query(`
        UPDATE tenant_module_access 
        SET enabled = true,
            enabled_by = $1,
            enabled_at = NOW(),
            disabled_at = NULL,
            disabled_by = NULL,
            settings = COALESCE($2, settings),
            updated_at = NOW()
        WHERE tenant_id = $3 AND module_id = $4
        RETURNING *
      `, [enabledBy, settings ? JSON.stringify(settings) : null, tenantId, resolvedModuleId]);
      action = 'module.enabled_for_tenant';
    } else {
      // Insert new record
      const id = crypto.randomUUID();
      result = await database.query(`
        INSERT INTO tenant_module_access (
          id, tenant_id, module_id, enabled, enabled_by, enabled_at, settings, created_at, updated_at
        ) VALUES ($1, $2, $3, true, $4, NOW(), $5, NOW(), NOW())
        RETURNING *
      `, [id, tenantId, resolvedModuleId, enabledBy, settings ? JSON.stringify(settings) : null]);
      action = 'module.enabled_for_tenant';
    }

    // ALSO update tenant_modules table to ensure it shows up in accessible modules listing
    const tmResult = await database.query(`
      INSERT INTO tenant_modules (
        id, tenant_id, module_id, assigned_by, assigned_at, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), 'active', NOW(), NOW())
      ON CONFLICT (tenant_id, module_id) 
      DO UPDATE SET status = 'active', assigned_by = $4, updated_at = NOW()
      RETURNING *
    `, [crypto.randomUUID(), tenantId, resolvedModuleId, enabledBy]);

    // Audit log
    await this.auditService.log({
      action,
      user_id: enabledBy,
      tenant_id: tenantId,
      resource_type: 'tenant_module_access',
      resource_id: result.rows[0].id,
      metadata: {
        tenant_id: tenantId,
        tenant_name: tenantData.name,
        module_id: resolvedModuleId,
        module_code: module.module_id,
        module_name: module.name
      }
    });

    try {
      getModuleService().sendIdentityUpdate(action === 'module.enabled_for_tenant' && !existingResult.rows.length ? 'create' : 'update', 'tenant_module_access', result.rows[0].id, enabledBy);
      getModuleService().sendIdentityUpdate(action === 'module.enabled_for_tenant' && !existingResult.rows.length ? 'create' : 'update', 'tenant_modules', tmResult.rows[0].id, enabledBy);
    } catch (e) {
      console.error('Failed to send identity update for tenant_module_access/tenant_modules', e);
    }

    return {
      success: true,
      data: result.rows[0],
      message: `Module "${module.name}" enabled for tenant "${tenantData.name}"`
    };
  }

  /**
   * Disable a module for a tenant
   */
  async disableModuleForTenant(tenantId, moduleId, disabledBy) {
    // Verify tenant exists
    const tenant = await tenantService.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    const tenantData = tenant.toJSON ? tenant.toJSON() : tenant;

    // Resolve module (handles both UUID and code)
    const moduleService = getModuleService();
    let module;
    try {
      if (moduleId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        module = await moduleService.getById(moduleId);
      } else {
        module = await moduleService.getByModuleId(moduleId);
      }
    } catch (e) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    const resolvedModuleId = module.id;

    // Check if exists
    const existingResult = await database.query(
      'SELECT id, enabled FROM tenant_module_access WHERE tenant_id = $1 AND module_id = $2',
      [tenantId, resolvedModuleId]
    );

    if (existingResult.rows.length === 0) {
      throw new Error('Module is not enabled for this tenant');
    }

    if (!existingResult.rows[0].enabled) {
      throw new Error('Module is already disabled for this tenant');
    }

    // Disable
    const result = await database.query(`
      UPDATE tenant_module_access 
      SET enabled = false,
          disabled_at = NOW(),
          disabled_by = $1,
          updated_at = NOW()
      WHERE tenant_id = $2 AND module_id = $3
      RETURNING *
    `, [disabledBy, tenantId, resolvedModuleId]);

    // ALSO update tenant_modules table
    const tmResult = await database.query(`
      UPDATE tenant_modules 
      SET status = 'inactive', updated_at = NOW()
      WHERE tenant_id = $1 AND module_id = $2
      RETURNING *
    `, [tenantId, moduleId]);

    // Remove all individual user assignments to this module in this tenant
    await database.query(`
      DELETE FROM user_roles 
      WHERE tenant_id = $1 AND module_id = $2
    `, [tenantId, moduleId]);

    // Remove this module from all roles in this tenant
    await this.removeModuleFromTenantRoles(tenantId, moduleId);

    // Audit log
    await this.auditService.log({
      action: 'module.disabled_for_tenant',
      user_id: disabledBy,
      tenant_id: tenantId,
      resource_type: 'tenant_module_access',
      resource_id: result.rows[0].id,
      metadata: {
        tenant_id: tenantId,
        tenant_name: tenantData.name,
        module_id: moduleId,
        module_code: module.module_id,
        module_name: module.name
      }
    });

    try {
      getModuleService().sendIdentityUpdate('delete', 'tenant_module_access', { id: result.rows[0].id }, disabledBy);
      getModuleService().sendIdentityUpdate('update', 'tenant_modules', tmResult.rows[0].id, disabledBy);
    } catch (e) {
      console.error('Failed to send identity update for tenant_module_access/tenant_modules delete', e);
    }

    return {
      success: true,
      data: result.rows[0],
      message: `Module "${module.name}" disabled for tenant "${tenantData.name}" and removed from all roles`
    };
  }

  /**
   * Remove a module from all roles in a tenant
   * This is called when a module is disabled for a tenant
   * @param {string} tenantId - Tenant ID
   * @param {string} moduleId - Module ID to remove
   */
  async removeModuleFromTenantRoles(tenantId, moduleId) {
    try {
      // Lazy load to avoid circular dependency
      const roleService = require('./role_service');

      // Get all roles for this tenant
      const rolesResult = await roleService.findAll({
        where: { tenant_id: tenantId },
        take: 1000 // Get all roles for the tenant
      });

      const rolesToUpdate = [];
      for (const role of rolesResult.data) {
        // Check if role has modules field and if it includes this module
        const roleModules = role.modules || [];
        if (Array.isArray(roleModules) && roleModules.includes(moduleId)) {
          // Remove the module from the array
          const updatedModules = roleModules.filter(id => id !== moduleId);
          rolesToUpdate.push({ roleId: role.id, modules: updatedModules });
        }
      }

      // Update each role using role service
      // The roleService.update() method automatically handles syncing the role_modules table
      // through its assignModules() method, so we don't need manual DELETE queries
      for (const { roleId, modules } of rolesToUpdate) {
        await roleService.update(roleId, { modules });
      }

      return {
        success: true,
        rolesUpdated: rolesToUpdate.length
      };
    } catch (error) {
      // Log error but don't fail the disable operation
      console.error(`Failed to remove module from tenant roles: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all modules for a tenant (with enabled/disabled status)
   */
  async getModulesForTenant(tenantId) {
    // Verify tenant exists
    const tenant = await tenantService.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    const tenantData = tenant.toJSON ? tenant.toJSON() : tenant;

    // Get all modules with tenant access status
    const result = await database.query(`
      SELECT 
        m.id, m.module_id, m.name, m.description, m.version, m.status, m.frontend_base_url, m.backend_base_url,
        m.runtime_language, m.framework, m.health_status,
        tma.id as access_id, 
        COALESCE(tma.enabled, false) as enabled,
        tma.enabled_at,
        tma.enabled_by,
        tma.disabled_at,
        tma.settings as tenant_settings,
        eu.email as enabled_by_email
      FROM modules m
      LEFT JOIN tenant_module_access tma ON tma.module_id = m.id AND tma.tenant_id = $1
      LEFT JOIN users eu ON eu.id = tma.enabled_by
      ORDER BY m.name ASC
    `, [tenantId]);

    return {
      success: true,
      data: result.rows,
      meta: {
        tenant_id: tenantId,
        tenant_name: tenantData.name,
        total: result.rows.length,
        enabled_count: result.rows.filter(r => r.enabled).length
      }
    };
  }

  /**
   * Get all tenants for a module (with enabled/disabled status)
   */
  async getTenantsForModule(moduleId) {
    // Verify module exists
    const moduleService = getModuleService();
    const module = await moduleService.getById(moduleId);
    if (!module) {
      throw new Error('Module not found');
    }

    // Get all tenants with module access status
    const result = await database.query(`
      SELECT 
        t.id, t.name, t.slug, t.status,
        tma.id as access_id,
        COALESCE(tma.enabled, false) as enabled,
        tma.enabled_at,
        tma.enabled_by,
        tma.disabled_at,
        tma.settings as tenant_settings,
        eu.email as enabled_by_email
      FROM tenants t
      LEFT JOIN tenant_module_access tma ON tma.tenant_id = t.id AND tma.module_id = $1
      LEFT JOIN users eu ON eu.id = tma.enabled_by
      WHERE t.status = 'ACTIVE'
      ORDER BY t.name ASC
    `, [moduleId]);

    return {
      success: true,
      data: result.rows,
      meta: {
        module_id: moduleId,
        module_code: module.module_id,
        module_name: module.name,
        total: result.rows.length,
        enabled_count: result.rows.filter(r => r.enabled).length
      }
    };
  }

  /**
   * Update tenant-specific module settings
   */
  async updateTenantModuleSettings(tenantId, moduleId, settings, updatedBy) {
    // 1. Resolve module first (handles both UUID and code)
    const moduleService = getModuleService();
    let module;
    try {
      // Check if it's a UUID format
      if (moduleId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        module = await moduleService.getById(moduleId);
      } else {
        module = await moduleService.getByModuleId(moduleId);
      }
    } catch (e) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    const resolvedModuleId = module.id;

    // 2. Perform the update
    const result = await database.query(`
      UPDATE tenant_module_access 
      SET settings = $1, updated_at = NOW()
      WHERE tenant_id = $2 AND module_id = $3 AND enabled = true
      RETURNING *
    `, [settings ? JSON.stringify(settings) : null, tenantId, resolvedModuleId]);

    if (result.rows.length === 0) {
      // Check if it exists but is disabled
      const accessCheck = await database.query(
        'SELECT enabled FROM tenant_module_access WHERE tenant_id = $1 AND module_id = $2',
        [tenantId, resolvedModuleId]
      );

      if (accessCheck.rows.length === 0) {
        throw new Error(`Module "${module.name}" is not assigned to this tenant`);
      } else if (!accessCheck.rows[0].enabled) {
        throw new Error(`Module "${module.name}" is disabled for this tenant. Please enable it first.`);
      }

      throw new Error('Module access not found or not enabled');
    }

    // Audit log
    await this.auditService.log({
      action: 'module.tenant_settings_updated',
      user_id: updatedBy,
      tenant_id: tenantId,
      resource_type: 'tenant_module_access',
      resource_id: result.rows[0].id,
      metadata: {
        module_id: resolvedModuleId,
        module_name: module.name,
        settings
      }
    });

    try {
      getModuleService().sendIdentityUpdate('update', 'tenant_module_access', result.rows[0].id, updatedBy);
    } catch (e) {
      console.error('Failed to send identity update for tenant_module_access update', e);
    }

    return {
      success: true,
      data: result.rows[0],
      message: `Settings updated for module "${module.name}"`
    };
  }

  /**
   * Get list of enabled module IDs for a tenant
   * Uses the same logic as tenant_service.assignModules() - checks tenant_modules table with status='active'
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array<string>>} Array of enabled module IDs
   */
  async getEnabledModuleIdsForTenant(tenantId) {
    if (!tenantId) {
      return [];
    }

    // Check both tenant_modules (with status='active') and tenant_module_access (with enabled=true)
    // for backward compatibility
    const result = await database.query(`
      SELECT DISTINCT module_id 
      FROM (
        SELECT module_id FROM tenant_modules WHERE tenant_id = $1 AND status = 'active'
        UNION
        SELECT module_id FROM tenant_module_access WHERE tenant_id = $1 AND enabled = true
      ) AS enabled_modules
    `, [tenantId]);

    return result.rows.map(row => row.module_id);
  }

  /**
   * Get enabled modules for a tenant (for role assignment dropdown)
   * Returns only modules that are enabled for the tenant
   * Uses the same logic as tenant_service.assignModules() - checks tenant_modules table with status='active'
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Options { skip, take, orderBy, filters }
   * @returns {Promise<Object>} Object with success flag, data array of modules, total count, and meta
   */
  async getEnabledModulesForTenant(tenantId, options = {}) {
    if (!tenantId) {
      return {
        success: true,
        data: [],
        total: 0,
        meta: {
          tenant_id: tenantId
        }
      };
    }

    const { skip = 0, take = 100, orderBy = ['name', 'ASC'], filters = {} } = options;
    const { status, health_status, runtime_language, framework, search } = filters;

    // Build WHERE clause for filters
    let whereConditions = '(tm.id IS NOT NULL OR tma.id IS NOT NULL)';
    const queryParams = [tenantId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereConditions += ` AND m.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (health_status) {
      paramCount++;
      whereConditions += ` AND m.health_status = $${paramCount}`;
      queryParams.push(health_status);
    }

    if (runtime_language) {
      paramCount++;
      whereConditions += ` AND m.runtime_language = $${paramCount}`;
      queryParams.push(runtime_language);
    }

    if (framework) {
      paramCount++;
      whereConditions += ` AND m.framework = $${paramCount}`;
      queryParams.push(framework);
    }

    if (search) {
      paramCount++;
      whereConditions += ` AND (m.name ILIKE $${paramCount} OR m.module_id ILIKE $${paramCount} OR m.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Validate and build ORDER BY clause
    const validSortColumns = ['name', 'module_id', 'status', 'version', 'health_status', 'runtime_language', 'framework', 'created_at', 'enabled_at'];
    const [sortColumn, sortDirection] = Array.isArray(orderBy) ? orderBy : ['name', 'ASC'];
    const validColumn = validSortColumns.includes(sortColumn) ? sortColumn : 'name';
    const validDirection = ['ASC', 'DESC'].includes(sortDirection?.toUpperCase()) ? sortDirection.toUpperCase() : 'ASC';

    // Handle special case for enabled_at (needs COALESCE)
    const orderByClause = validColumn === 'enabled_at'
      ? `ORDER BY COALESCE(tm.assigned_at, tma.enabled_at) ${validDirection}`
      : `ORDER BY m.${validColumn} ${validDirection}`;

    // Get total count with filters (before adding pagination params)
    let countQuery = `
      SELECT COUNT(DISTINCT m.id) as total
      FROM modules m
      LEFT JOIN tenant_modules tm ON tm.module_id = m.id AND tm.tenant_id = $1 AND tm.status = 'active'
      LEFT JOIN tenant_module_access tma ON tma.module_id = m.id AND tma.tenant_id = $1 AND tma.enabled = true
      WHERE ${whereConditions}
    `;

    const countResult = await database.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total) || 0;

    // Get enabled modules with full details (with pagination and filters)
    // Add pagination params to queryParams
    paramCount++;
    queryParams.push(take);
    paramCount++;
    queryParams.push(skip);

    const result = await database.query(`
      SELECT DISTINCT
        m.id, 
        m.module_id, 
        m.name, 
        m.description, 
        m.version, 
        m.status, 
        m.frontend_base_url,
        m.backend_base_url,
        m.runtime_language, 
        m.framework, 
        m.health_status,
        COALESCE(tm.assigned_at, tma.enabled_at) as enabled_at,
        tma.settings as tenant_settings
      FROM modules m
      LEFT JOIN tenant_modules tm ON tm.module_id = m.id AND tm.tenant_id = $1 AND tm.status = 'active'
      LEFT JOIN tenant_module_access tma ON tma.module_id = m.id AND tma.tenant_id = $1 AND tma.enabled = true
      WHERE ${whereConditions}
      ${orderByClause}
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `, queryParams);

    return {
      success: true,
      data: result.rows,
      total: total,
      meta: {
        tenant_id: tenantId
      }
    };
  }
}

// Singleton
let instance = null;
const getTenantModuleService = () => {
  if (!instance) {
    instance = new TenantModuleService();
  }
  return instance;
};

module.exports = { TenantModuleService, getTenantModuleService };
