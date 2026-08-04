/**
 * File Category Service - QAssure Platform
 * Manages tenant-scoped file categories with validation rules
 */
const crypto = require('crypto');
const database = require('../config/database');

class FileCategoryService {
  /**
   * Create a new file category
   * @param {Object} data - { name, code, description, validation_rules }
   * @param {string} tenantId - Tenant UUID
   * @param {string} userId - Creating user UUID
   */
  async create(data, tenantId, userId) {
    const { name, code, description, validation_rules } = data;

    if (!name || !name.trim()) {
      throw Object.assign(new Error('Category name is required'), { code: 'VALIDATION_ERROR' });
    }
    if (!code || !code.trim()) {
      throw Object.assign(new Error('Category code is required'), { code: 'VALIDATION_ERROR' });
    }

    const id = crypto.randomUUID();

    try {
      const result = await database.query(`
        INSERT INTO file_categories (id, tenant_id, name, code, description, validation_rules, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [id, tenantId, name.trim(), code.toUpperCase().trim(), description || null, JSON.stringify(validation_rules || {}), userId]);

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique constraint
        throw Object.assign(new Error(`Category with code "${code}" already exists for this tenant`), { code: 'DUPLICATE_ERROR' });
      }
      throw error;
    }
  }

  /**
   * List categories for a tenant
   * @param {string} tenantId - Tenant UUID
   */
  async list(tenantId) {
    const result = await database.query(`
      SELECT * FROM file_categories 
      WHERE tenant_id = $1 
      ORDER BY name ASC
    `, [tenantId]);
    return result.rows;
  }

  /**
   * Get category by ID
   * @param {string} id - Category UUID
   * @param {string} tenantId - Tenant UUID
   */
  async getById(id, tenantId) {
    const result = await database.query(`
      SELECT * FROM file_categories 
      WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      throw Object.assign(new Error('Category not found'), { code: 'NOT_FOUND' });
    }
    return result.rows[0];
  }

  /**
   * Update category
   * @param {string} id - Category UUID
   * @param {Object} data - Fields to update
   * @param {string} tenantId - Tenant UUID
   * @param {string} userId - Updating user UUID
   */
  async update(id, data, tenantId, userId) {
    const { name, code, description, validation_rules } = data;
    
    // Verify exists
    await this.getById(id, tenantId);

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name !== undefined) { paramCount++; updates.push(`name = $${paramCount}`); params.push(name.trim()); }
    if (code !== undefined) { paramCount++; updates.push(`code = $${paramCount}`); params.push(code.toUpperCase().trim()); }
    if (description !== undefined) { paramCount++; updates.push(`description = $${paramCount}`); params.push(description); }
    if (validation_rules !== undefined) { paramCount++; updates.push(`validation_rules = $${paramCount}`); params.push(JSON.stringify(validation_rules)); }

    if (updates.length === 0) return this.getById(id, tenantId);

    updates.push(`updated_at = NOW()`);
    
    paramCount++; params.push(id);
    paramCount++; params.push(tenantId);

    const result = await database.query(`
      UPDATE file_categories SET ${updates.join(', ')}
      WHERE id = $${paramCount - 1} AND tenant_id = $${paramCount}
      RETURNING *
    `, params);

    return result.rows[0];
  }

  /**
   * Delete category
   * @param {string} id - Category UUID
   * @param {string} tenantId - Tenant UUID
   */
  async delete(id, tenantId) {
    // Check if files are using this category
    const filesUsing = await database.query(`
      SELECT COUNT(*) FROM file_attachments WHERE category_id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (parseInt(filesUsing.rows[0].count) > 0) {
      throw Object.assign(new Error(`Cannot delete category: ${filesUsing.rows[0].count} files are using it.`), { code: 'VALIDATION_ERROR' });
    }

    await database.query(`
      DELETE FROM file_categories WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    return { success: true };
  }
}

// Singleton
let instance = null;
const getFileCategoryService = () => {
  if (!instance) {
    instance = new FileCategoryService();
  }
  return instance;
};

module.exports = { FileCategoryService, getFileCategoryService };
