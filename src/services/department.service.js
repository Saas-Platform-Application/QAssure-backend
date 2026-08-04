/**
 * Department Service - QAssure Platform
 * Manages tenant-scoped hierarchical department structure
 */
const crypto = require('crypto');
const database = require('../config/database');

class DepartmentService {

  /**
   * Create a new department
   * @param {Object} data - { name, code, description, parent_id, sort_order }
   * @param {string} tenantId - Tenant UUID
   * @param {string} userId - Creating user UUID
   * @returns {Object} - Created department
   */
  async create(data, tenantId, userId) {
    const { name, code, description, parent_id, sort_order } = data;

    if (!name || !name.trim()) {
      throw Object.assign(new Error('Department name is required'), { code: 'VALIDATION_ERROR' });
    }

    // If parent_id provided, verify it exists and belongs to same tenant
    let level = 0;
    if (parent_id) {
      const parentResult = await database.query(
        'SELECT id, level, tenant_id FROM departments WHERE id = $1',
        [parent_id]
      );
      if (parentResult.rows.length === 0) {
        throw Object.assign(new Error('Parent department not found'), { code: 'NOT_FOUND' });
      }
      if (parentResult.rows[0].tenant_id !== tenantId) {
        throw Object.assign(new Error('Parent department belongs to a different tenant'), { code: 'FORBIDDEN' });
      }
      level = parentResult.rows[0].level + 1;
    }

    const id = crypto.randomUUID();

    try {
      const result = await database.query(`
        INSERT INTO departments (id, tenant_id, name, code, description, parent_id, level, sort_order, created_by, updated_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, NOW(), NOW())
        RETURNING *
      `, [id, tenantId, name.trim(), code || null, description || null, parent_id || null, level, sort_order || 0, userId]);

      const createdDepartment = result.rows[0];
      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('create', 'department', createdDepartment.id, userId);
      } catch (e) {
        console.error('Failed to send identity update for department create', e);
      }
      return createdDepartment;
    } catch (error) {
      if (error.constraint === 'unique_department_name_per_tenant_parent') {
        throw Object.assign(
          new Error(`Department "${name}" already exists at this level`),
          { code: 'DUPLICATE_ERROR' }
        );
      }
      throw error;
    }
  }

  /**
   * Get all departments for a tenant (flat list with parent info)
   * @param {string} tenantId - Tenant UUID
   * @param {Object} options - { active_only, search }
   * @returns {Array} - List of departments
   */
  async list(tenantId, options = {}) {
    const { active_only = false, search } = options;
    let query = `
      SELECT 
        d.*,
        p.name as parent_name,
        (SELECT COUNT(*) FROM departments c WHERE c.parent_id = d.id) as child_count,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) as user_count
      FROM departments d
      LEFT JOIN departments p ON p.id = d.parent_id
      WHERE d.tenant_id = $1
    `;
    const params = [tenantId];

    if (active_only) {
      query += ` AND d.is_active = true`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (d.name ILIKE $${params.length} OR d.code ILIKE $${params.length})`;
    }

    query += ` ORDER BY d.level ASC, d.sort_order ASC, d.name ASC`;

    const result = await database.query(query, params);
    return result.rows;
  }

  /**
   * Get department hierarchy as a tree structure
   * @param {string} tenantId - Tenant UUID
   * @param {boolean} activeOnly - Only return active departments
   * @returns {Array} - Tree of departments
   */
  async getTree(tenantId, activeOnly = false) {
    const departments = await this.list(tenantId, { active_only: activeOnly });

    // Build tree from flat list
    const map = {};
    const roots = [];

    departments.forEach(dept => {
      map[dept.id] = { ...dept, children: [] };
    });

    departments.forEach(dept => {
      if (dept.parent_id && map[dept.parent_id]) {
        map[dept.parent_id].children.push(map[dept.id]);
      } else {
        roots.push(map[dept.id]);
      }
    });

    return roots;
  }

  /**
   * Get single department by ID
   * @param {string} id - Department UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Object} - Department
   */
  async getById(id, tenantId) {
    const result = await database.query(`
      SELECT 
        d.*,
        p.name as parent_name,
        (SELECT COUNT(*) FROM departments c WHERE c.parent_id = d.id) as child_count,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) as user_count
      FROM departments d
      LEFT JOIN departments p ON p.id = d.parent_id
      WHERE d.id = $1 AND d.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      throw Object.assign(new Error('Department not found'), { code: 'NOT_FOUND' });
    }

    return result.rows[0];
  }

  /**
   * Update department
   * @param {string} id - Department UUID
   * @param {Object} data - Fields to update
   * @param {string} tenantId - Tenant UUID
   * @param {string} userId - Updating user UUID
   * @returns {Object} - Updated department
   */
  async update(id, data, tenantId, userId) {
    // Verify exists
    await this.getById(id, tenantId);

    const { name, code, description, parent_id, sort_order, is_active } = data;

    // If changing parent, validate no circular reference
    if (parent_id !== undefined) {
      if (parent_id === id) {
        throw Object.assign(new Error('Department cannot be its own parent'), { code: 'VALIDATION_ERROR' });
      }
      if (parent_id) {
        // Check parent exists and belongs to same tenant
        const parentResult = await database.query(
          'SELECT id, level, tenant_id FROM departments WHERE id = $1',
          [parent_id]
        );
        if (parentResult.rows.length === 0) {
          throw Object.assign(new Error('Parent department not found'), { code: 'NOT_FOUND' });
        }
        if (parentResult.rows[0].tenant_id !== tenantId) {
          throw Object.assign(new Error('Parent department belongs to a different tenant'), { code: 'FORBIDDEN' });
        }
        // Check not creating circular reference (parent is not a descendant of this dept)
        const isDescendant = await this._isDescendant(parent_id, id, tenantId);
        if (isDescendant) {
          throw Object.assign(new Error('Cannot set parent: would create circular reference'), { code: 'VALIDATION_ERROR' });
        }
      }
    }

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name !== undefined) { paramCount++; updates.push(`name = $${paramCount}`); params.push(name.trim()); }
    if (code !== undefined) { paramCount++; updates.push(`code = $${paramCount}`); params.push(code); }
    if (description !== undefined) { paramCount++; updates.push(`description = $${paramCount}`); params.push(description); }
    if (parent_id !== undefined) {
      paramCount++; updates.push(`parent_id = $${paramCount}`); params.push(parent_id || null);
      // Recalculate level
      if (parent_id) {
        const parentResult = await database.query('SELECT level FROM departments WHERE id = $1', [parent_id]);
        paramCount++; updates.push(`level = $${paramCount}`); params.push(parentResult.rows[0].level + 1);
      } else {
        paramCount++; updates.push(`level = $${paramCount}`); params.push(0);
      }
    }
    if (sort_order !== undefined) { paramCount++; updates.push(`sort_order = $${paramCount}`); params.push(sort_order); }
    if (is_active !== undefined) { paramCount++; updates.push(`is_active = $${paramCount}`); params.push(is_active); }

    if (updates.length === 0) {
      throw Object.assign(new Error('No fields to update'), { code: 'VALIDATION_ERROR' });
    }

    paramCount++; updates.push(`updated_by = $${paramCount}`); params.push(userId);
    updates.push(`updated_at = NOW()`);

    paramCount++; params.push(id);
    paramCount++; params.push(tenantId);

    try {
      const result = await database.query(`
        UPDATE departments SET ${updates.join(', ')}
        WHERE id = $${paramCount - 1} AND tenant_id = $${paramCount}
        RETURNING *
      `, params);

      const updatedDepartment = result.rows[0];
      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('update', 'department', id, userId);
      } catch (e) {
        console.error('Failed to send identity update for department update', e);
      }
      return updatedDepartment;
    } catch (error) {
      if (error.constraint === 'unique_department_name_per_tenant_parent') {
        throw Object.assign(
          new Error(`Department "${name}" already exists at this level`),
          { code: 'DUPLICATE_ERROR' }
        );
      }
      throw error;
    }
  }

  /**
   * Soft delete department (set is_active = false)
   * @param {string} id - Department UUID
   * @param {string} tenantId - Tenant UUID
   * @param {string} userId - Deleting user UUID
   * @returns {Object} - Result
   */
  async delete(id, tenantId, userId) {
    const dept = await this.getById(id, tenantId);

    // Check if department has active children
    if (parseInt(dept.child_count) > 0) {
      throw Object.assign(
        new Error('Cannot deactivate department with active child departments. Deactivate children first.'),
        { code: 'VALIDATION_ERROR' }
      );
    }

    // Check if users are assigned
    if (parseInt(dept.user_count) > 0) {
      throw Object.assign(
        new Error(`Cannot deactivate department with ${dept.user_count} assigned user(s). Reassign users first.`),
        { code: 'VALIDATION_ERROR' }
      );
    }

    await database.query(`
      UPDATE departments SET is_active = false, updated_by = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
    `, [userId, id, tenantId]);

    try {
      const { getModuleService } = require('./module.service');
      getModuleService().sendIdentityUpdate('update', 'department', id, userId);
    } catch (e) {
      console.error('Failed to send identity update for department delete', e);
    }

    return { success: true, message: 'Department deactivated successfully' };
  }

  /**
   * Check if targetId is a descendant of ancestorId (for circular ref prevention)
   */
  async _isDescendant(targetId, ancestorId, tenantId) {
    const result = await database.query(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM departments WHERE id = $1 AND tenant_id = $3
        UNION ALL
        SELECT d.id FROM departments d
        INNER JOIN descendants desc_cte ON d.parent_id = desc_cte.id
        WHERE d.tenant_id = $3
      )
      SELECT 1 FROM descendants WHERE id = $2 LIMIT 1
    `, [ancestorId, targetId, tenantId]);

    return result.rows.length > 0;
  }
}

// Singleton
let instance = null;
const getDepartmentService = () => {
  if (!instance) {
    instance = new DepartmentService();
  }
  return instance;
};

module.exports = { DepartmentService, getDepartmentService };
