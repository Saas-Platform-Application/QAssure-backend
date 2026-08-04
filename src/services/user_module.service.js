/**
 * User Module Service - QAssure Platform
 * Handles assigning/removing users to modules (Tenant Admin operations)
 */
const crypto = require('crypto');
const database = require('../config/database');
const { getAuditService } = require('./audit.service');

class UserModuleService {
  constructor() {
    this.auditService = getAuditService();
  }

  /**
   * Assign a user to a module
   * @param {string} userId - User UUID to assign
   * @param {string} moduleId - Module UUID
   * @param {string} tenantId - Tenant UUID
   * @param {string} assignedBy - User UUID (Tenant Admin)
   * @param {string} roleId - Optional role UUID (if assigning with specific role)
   */
  async assignUserToModule(userId, moduleId, tenantId, assignedBy, roleId = null) {
    // Verify user exists and belongs to tenant
    const userResult = await database.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, ut.tenant_id
      FROM users u
      INNER JOIN user_tenants ut ON ut.user_id = u.id
      WHERE u.id = $1 AND ut.tenant_id = $2 AND ut.status = 'ACTIVE'
    `, [userId, tenantId]);

    if (userResult.rows.length === 0) {
      throw new Error('User not found or not a member of this tenant');
    }
    const user = userResult.rows[0];

    // Verify module exists
    const moduleResult = await database.query(
      'SELECT id, module_id, name FROM modules WHERE id = $1',
      [moduleId]
    );
    if (moduleResult.rows.length === 0) {
      throw new Error('Module not found');
    }
    const module = moduleResult.rows[0];

    // Verify module is enabled for tenant
    const tenantAccessResult = await database.query(
      'SELECT id FROM tenant_module_access WHERE tenant_id = $1 AND module_id = $2 AND enabled = true',
      [tenantId, moduleId]
    );
    if (tenantAccessResult.rows.length === 0) {
      throw new Error('Module is not enabled for this tenant');
    }

    // If no roleId provided, get or create a default "module_user" role
    if (!roleId) {
      const defaultRoleResult = await database.query(
        "SELECT id FROM roles WHERE code = 'module_user' LIMIT 1"
      );
      if (defaultRoleResult.rows.length > 0) {
        roleId = defaultRoleResult.rows[0].id;
      } else {
        // Create default module_user role if not exists
        roleId = crypto.randomUUID();
        await database.query(`
          INSERT INTO roles (id, name, code, description, scope, is_system, created_at, updated_at)
          VALUES ($1, 'Module User', 'module_user', 'Default role for module access', 'TENANT', true, NOW(), NOW())
          ON CONFLICT (code) DO UPDATE SET updated_at = NOW()
          RETURNING id
        `, [roleId]);
        const insertedRole = await database.query("SELECT id FROM roles WHERE code = 'module_user'");
        roleId = insertedRole.rows[0].id;
      }
    }

    // Check if already assigned
    const existingResult = await database.query(`
      SELECT id FROM user_roles 
      WHERE user_id = $1 AND tenant_id = $2 AND module_id = $3
    `, [userId, tenantId, moduleId]);

    let result;
    if (existingResult.rows.length > 0) {
      // Update existing assignment
      result = await database.query(`
        UPDATE user_roles 
        SET role_id = $1,
            assigned_by = $2,
            assigned_at = NOW(),
            expires_at = NULL,
            updated_at = NOW()
        WHERE user_id = $3 AND tenant_id = $4 AND module_id = $5
        RETURNING *
      `, [roleId, assignedBy, userId, tenantId, moduleId]);
    } else {
      // Create new assignment
      const id = crypto.randomUUID();
      result = await database.query(`
        INSERT INTO user_roles (
          id, user_id, role_id, tenant_id, module_id, assigned_by, assigned_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
        RETURNING *
      `, [id, userId, roleId, tenantId, moduleId, assignedBy]);
    }

    // Audit log
    await this.auditService.log({
      action: 'module.user_assigned',
      user_id: assignedBy,
      tenant_id: tenantId,
      resource_type: 'user_roles',
      resource_id: result.rows[0].id,
      metadata: {
        assigned_user_id: userId,
        assigned_user_email: user.email,
        module_id: moduleId,
        module_code: module.module_id,
        module_name: module.name,
        role_id: roleId
      }
    });

    return {
      success: true,
      data: result.rows[0],
      message: `User "${user.email}" assigned to module "${module.name}"`
    };
  }

  /**
   * Remove a user from a module
   */
  async removeUserFromModule(userId, moduleId, tenantId, removedBy) {
    // Verify user exists
    const userResult = await database.query(
      'SELECT id, email FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    const user = userResult.rows[0];

    // Verify module exists
    const moduleResult = await database.query(
      'SELECT id, module_id, name FROM modules WHERE id = $1',
      [moduleId]
    );
    if (moduleResult.rows.length === 0) {
      throw new Error('Module not found');
    }
    const module = moduleResult.rows[0];

    // Delete assignment
    const result = await database.query(`
      DELETE FROM user_roles 
      WHERE user_id = $1 AND tenant_id = $2 AND module_id = $3
      RETURNING *
    `, [userId, tenantId, moduleId]);

    if (result.rows.length === 0) {
      throw new Error('User is not assigned to this module');
    }

    // Audit log
    await this.auditService.log({
      action: 'module.user_removed',
      user_id: removedBy,
      tenant_id: tenantId,
      resource_type: 'user_roles',
      resource_id: result.rows[0].id,
      metadata: {
        removed_user_id: userId,
        removed_user_email: user.email,
        module_id: moduleId,
        module_code: module.module_id,
        module_name: module.name
      }
    });

    return {
      success: true,
      message: `User "${user.email}" removed from module "${module.name}"`
    };
  }

  /**
   * Get all users assigned to a module (within a tenant)
   */
  async getUsersForModule(moduleId, tenantId, options = {}) {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    // Verify module exists
    const moduleResult = await database.query(
      'SELECT id, module_id, name FROM modules WHERE id = $1',
      [moduleId]
    );
    if (moduleResult.rows.length === 0) {
      throw new Error('Module not found');
    }
    const module = moduleResult.rows[0];

    // Get users
    const result = await database.query(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.status as user_status,
        ur.id as assignment_id, ur.assigned_at, ur.expires_at,
        r.id as role_id, r.name as role_name, r.code as role_code,
        ab.email as assigned_by_email
      FROM user_roles ur
      INNER JOIN users u ON u.id = ur.user_id
      INNER JOIN roles r ON r.id = ur.role_id
      LEFT JOIN users ab ON ab.id = ur.assigned_by
      WHERE ur.module_id = $1 
        AND ur.tenant_id = $2
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      ORDER BY u.email ASC
      LIMIT $3 OFFSET $4
    `, [moduleId, tenantId, limit, offset]);

    // Get total count
    const countResult = await database.query(`
      SELECT COUNT(*) FROM user_roles 
      WHERE module_id = $1 AND tenant_id = $2
        AND (expires_at IS NULL OR expires_at > NOW())
    `, [moduleId, tenantId]);
    const total = parseInt(countResult.rows[0].count);

    return {
      success: true,
      data: result.rows,
      meta: {
        module_id: moduleId,
        module_code: module.module_id,
        module_name: module.name,
        tenant_id: tenantId,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get all modules assigned to a user (within a tenant)
   */
  async getModulesForUser(userId, tenantId) {
    // Verify user exists
    const userResult = await database.query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    const user = userResult.rows[0];

    // Get modules
    const result = await database.query(`
      SELECT 
        m.id, m.module_id, m.name, m.description, m.version, m.status, m.frontend_base_url, m.backend_base_url,
        m.health_status,
        ur.id as assignment_id, ur.assigned_at, ur.expires_at,
        r.id as role_id, r.name as role_name, r.code as role_code,
        ab.email as assigned_by_email
      FROM user_roles ur
      INNER JOIN modules m ON m.id = ur.module_id
      INNER JOIN roles r ON r.id = ur.role_id
      INNER JOIN tenant_module_access tma ON tma.module_id = m.id AND tma.tenant_id = ur.tenant_id
      LEFT JOIN users ab ON ab.id = ur.assigned_by
      WHERE ur.user_id = $1 
        AND ur.tenant_id = $2
        AND tma.enabled = true
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      ORDER BY m.name ASC
    `, [userId, tenantId]);

    return {
      success: true,
      data: result.rows,
      meta: {
        user_id: userId,
        user_email: user.email,
        tenant_id: tenantId,
        total: result.rows.length
      }
    };
  }

  /**
   * Bulk assign users to a module
   */
  async bulkAssignUsersToModule(userIds, moduleId, tenantId, assignedBy, roleId = null) {
    const results = {
      success: [],
      failed: []
    };

    for (const userId of userIds) {
      try {
        await this.assignUserToModule(userId, moduleId, tenantId, assignedBy, roleId);
        results.success.push(userId);
      } catch (error) {
        results.failed.push({ userId, error: error.message });
      }
    }

    return {
      success: true,
      data: results,
      message: `Assigned ${results.success.length} users, ${results.failed.length} failed`
    };
  }

  /**
   * Bulk remove users from a module
   */
  async bulkRemoveUsersFromModule(userIds, moduleId, tenantId, removedBy) {
    const results = {
      success: [],
      failed: []
    };

    for (const userId of userIds) {
      try {
        await this.removeUserFromModule(userId, moduleId, tenantId, removedBy);
        results.success.push(userId);
      } catch (error) {
        results.failed.push({ userId, error: error.message });
      }
    }

    return {
      success: true,
      data: results,
      message: `Removed ${results.success.length} users, ${results.failed.length} failed`
    };
  }
}

// Singleton
let instance = null;
const getUserModuleService = () => {
  if (!instance) {
    instance = new UserModuleService();
  }
  return instance;
};

module.exports = { UserModuleService, getUserModuleService };
