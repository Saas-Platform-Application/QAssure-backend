/**
 * User Category Service - QAssure Platform
 * Manages tenant-scoped user category master data
 * Examples: Internal User, External User, Contractor, Auditor, Guest
 */
const crypto = require('crypto');
const database = require('../config/database');

class UserCategoryService {

  async create(data, tenantId, userId) {
    const { name, code, description, sort_order } = data;

    if (!name || !name.trim()) {
      throw Object.assign(new Error('User category name is required'), { code: 'VALIDATION_ERROR' });
    }

    const id = crypto.randomUUID();

    try {
      const result = await database.query(`
        INSERT INTO user_categories (id, tenant_id, name, code, description, sort_order, created_by, updated_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7, NOW(), NOW())
        RETURNING *
      `, [id, tenantId, name.trim(), code || null, description || null, sort_order || 0, userId]);

      return result.rows[0];
    } catch (error) {
      if (error.constraint === 'unique_user_category_name_per_tenant') {
        throw Object.assign(new Error(`User category "${name}" already exists for this tenant`), { code: 'DUPLICATE_ERROR' });
      }
      throw error;
    }
  }

  async list(tenantId, options = {}) {
    const { active_only = false, search } = options;
    let query = `
      SELECT 
        uc.*,
        (SELECT COUNT(*) FROM users u WHERE u.user_category_id = uc.id) as user_count
      FROM user_categories uc
      WHERE uc.tenant_id = $1
    `;
    const params = [tenantId];

    if (active_only) {
      query += ` AND uc.is_active = true`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (uc.name ILIKE $${params.length} OR uc.code ILIKE $${params.length})`;
    }

    query += ` ORDER BY uc.sort_order ASC, uc.name ASC`;

    const result = await database.query(query, params);
    return result.rows;
  }

  async getById(id, tenantId) {
    const result = await database.query(`
      SELECT 
        uc.*,
        (SELECT COUNT(*) FROM users u WHERE u.user_category_id = uc.id) as user_count
      FROM user_categories uc
      WHERE uc.id = $1 AND uc.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      throw Object.assign(new Error('User category not found'), { code: 'NOT_FOUND' });
    }
    return result.rows[0];
  }

  async update(id, data, tenantId, userId) {
    await this.getById(id, tenantId);

    const { name, code, description, sort_order, is_active } = data;
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name !== undefined) { paramCount++; updates.push(`name = $${paramCount}`); params.push(name.trim()); }
    if (code !== undefined) { paramCount++; updates.push(`code = $${paramCount}`); params.push(code); }
    if (description !== undefined) { paramCount++; updates.push(`description = $${paramCount}`); params.push(description); }
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
        UPDATE user_categories SET ${updates.join(', ')}
        WHERE id = $${paramCount - 1} AND tenant_id = $${paramCount}
        RETURNING *
      `, params);

      return result.rows[0];
    } catch (error) {
      if (error.constraint === 'unique_user_category_name_per_tenant') {
        throw Object.assign(new Error(`User category "${name}" already exists for this tenant`), { code: 'DUPLICATE_ERROR' });
      }
      throw error;
    }
  }

  async delete(id, tenantId, userId) {
    const category = await this.getById(id, tenantId);

    if (parseInt(category.user_count) > 0) {
      throw Object.assign(
        new Error(`Cannot deactivate user category with ${category.user_count} assigned user(s). Reassign users first.`),
        { code: 'VALIDATION_ERROR' }
      );
    }

    await database.query(`
      UPDATE user_categories SET is_active = false, updated_by = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
    `, [userId, id, tenantId]);

    return { success: true, message: 'User category deactivated successfully' };
  }
}

let instance = null;
const getUserCategoryService = () => {
  if (!instance) { instance = new UserCategoryService(); }
  return instance;
};

module.exports = { UserCategoryService, getUserCategoryService };
