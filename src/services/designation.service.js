/**
 * Designation Service - QAssure Platform
 * Manages tenant-scoped designation master data
 */
const crypto = require('crypto');
const database = require('../config/database');

class DesignationService {

  async create(data, tenantId, userId) {
    const { name, code, description, level, sort_order } = data;

    if (!name || !name.trim()) {
      throw Object.assign(new Error('Designation name is required'), { code: 'VALIDATION_ERROR' });
    }

    const id = crypto.randomUUID();

    try {
      const result = await database.query(`
        INSERT INTO designations (id, tenant_id, name, code, description, level, sort_order, created_by, updated_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, NOW(), NOW())
        RETURNING *
      `, [id, tenantId, name.trim(), code || null, description || null, level || 0, sort_order || 0, userId]);

      return result.rows[0];
    } catch (error) {
      if (error.constraint === 'unique_designation_name_per_tenant') {
        throw Object.assign(new Error(`Designation "${name}" already exists for this tenant`), { code: 'DUPLICATE_ERROR' });
      }
      throw error;
    }
  }

  async list(tenantId, options = {}) {
    const { active_only = false, search } = options;
    let query = `
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM users u WHERE u.designation_id = d.id) as user_count
      FROM designations d
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

    query += ` ORDER BY d.level DESC, d.sort_order ASC, d.name ASC`;

    const result = await database.query(query, params);
    return result.rows;
  }

  async getById(id, tenantId) {
    const result = await database.query(`
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM users u WHERE u.designation_id = d.id) as user_count
      FROM designations d
      WHERE d.id = $1 AND d.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      throw Object.assign(new Error('Designation not found'), { code: 'NOT_FOUND' });
    }
    return result.rows[0];
  }

  async update(id, data, tenantId, userId) {
    await this.getById(id, tenantId);

    const { name, code, description, level, sort_order, is_active } = data;
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name !== undefined) { paramCount++; updates.push(`name = $${paramCount}`); params.push(name.trim()); }
    if (code !== undefined) { paramCount++; updates.push(`code = $${paramCount}`); params.push(code); }
    if (description !== undefined) { paramCount++; updates.push(`description = $${paramCount}`); params.push(description); }
    if (level !== undefined) { paramCount++; updates.push(`level = $${paramCount}`); params.push(level); }
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
        UPDATE designations SET ${updates.join(', ')}
        WHERE id = $${paramCount - 1} AND tenant_id = $${paramCount}
        RETURNING *
      `, params);

      return result.rows[0];
    } catch (error) {
      if (error.constraint === 'unique_designation_name_per_tenant') {
        throw Object.assign(new Error(`Designation "${name}" already exists for this tenant`), { code: 'DUPLICATE_ERROR' });
      }
      throw error;
    }
  }

  async delete(id, tenantId, userId) {
    const designation = await this.getById(id, tenantId);

    if (parseInt(designation.user_count) > 0) {
      throw Object.assign(
        new Error(`Cannot deactivate designation with ${designation.user_count} assigned user(s). Reassign users first.`),
        { code: 'VALIDATION_ERROR' }
      );
    }

    await database.query(`
      UPDATE designations SET is_active = false, updated_by = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
    `, [userId, id, tenantId]);

    return { success: true, message: 'Designation deactivated successfully' };
  }
}

let instance = null;
const getDesignationService = () => {
  if (!instance) { instance = new DesignationService(); }
  return instance;
};

module.exports = { DesignationService, getDesignationService };
