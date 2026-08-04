'use strict';

const { pool } = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');
const { getEmailService } = require('../infrastructure/email/email.service');

class SmtpConfigService {
  constructor() {
    this.pool = pool;
  }

  /**
   * Get SMTP configuration for a tenant or global
   */
  async getConfig(tenantId = null, scope = 'tenant') {
    const query = (scope === 'super_admin' || !tenantId)
      ? `SELECT * FROM notification_smtp_configs WHERE scope = 'super_admin' LIMIT 1`
      : `SELECT * FROM notification_smtp_configs WHERE tenant_id = $1 AND scope = $2 LIMIT 1`;
    
    const params = (scope === 'super_admin' || !tenantId) ? [] : [tenantId, scope];
    const result = await this.pool.query(query, params);

    if (result.rows.length === 0) return null;

    const config = result.rows[0];
    return this._formatResponse(config);
  }

  /**
   * List all configurations (Super Admin only)
   */
  async listAllConfigs(options = {}) {
    const { limit = 50, offset = 0 } = options;
    const result = await this.pool.query(
      `SELECT s.*, t.name as tenant_name 
       FROM notification_smtp_configs s
       LEFT JOIN tenants t ON s.tenant_id = t.id
       ORDER BY s.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows.map(row => this._formatResponse(row));
  }

  /**
   * Create or update SMTP configuration for a regular tenant
   */
  async upsertTenantConfig(data, updatedBy, tenantId) {
    if (!tenantId) throw new Error('Tenant ID is required');
    return this._upsert(data, updatedBy, {
      targetTenantId: tenantId,
      targetScope: 'tenant',
      requireMatchingTenant: true
    });
  }

  /**
   * Create or update SMTP configuration (Super Admin managed)
   */
  async upsertAdminConfig(data, updatedBy) {
    const { scope, tenant_id } = data;
    const targetScope = scope || 'tenant';
    const targetTenantId = (targetScope === 'super_admin' || !tenant_id || tenant_id === '') ? null : tenant_id;

    return this._upsert(data, updatedBy, {
      targetTenantId,
      targetScope,
      requireMatchingTenant: false
    });
  }

  /**
   * Internal helper for SMTP configuration upsert
   */
  async _upsert(data, updatedBy, options) {
    const { id, provider, host, port, secure, username, password, from_name, from_email, is_active } = data;
    const { targetTenantId, targetScope, requireMatchingTenant } = options;

    let recordId = id;

    // 1. Identify existing record if ID is not provided
    if (!recordId) {
      const checkQuery = targetScope === 'super_admin'
        ? `SELECT id FROM notification_smtp_configs WHERE scope = 'super_admin' LIMIT 1`
        : `SELECT id FROM notification_smtp_configs WHERE tenant_id = $1 AND scope = 'tenant' LIMIT 1`;
      const checkParams = targetScope === 'super_admin' ? [] : [targetTenantId];
      
      const existing = await this.pool.query(checkQuery, checkParams);
      if (existing.rows.length > 0) {
        recordId = existing.rows[0].id;
      }
    } else if (requireMatchingTenant) {
      // Security check for tenant admins
      const verify = await this.pool.query(
        'SELECT id FROM notification_smtp_configs WHERE id = $1 AND tenant_id = $2',
        [recordId, targetTenantId]
      );
      if (verify.rows.length === 0) {
        // Fallback to lookup instead of unauthorized update
        const existing = await this.pool.query(
          `SELECT id FROM notification_smtp_configs WHERE tenant_id = $1 AND scope = 'tenant' LIMIT 1`,
          [targetTenantId]
        );
        recordId = existing.rows.length > 0 ? existing.rows[0].id : null;
      }
    }

    // 2. Encrypt password if changed
    let passwordValue = null;
    if (password && password.trim() !== '' && password !== '********') {
      try {
        passwordValue = encrypt(password);
      } catch (err) {
        console.error('Encryption failed:', err);
        throw new Error('Failed to encrypt password');
      }
    }

    let result;
    if (recordId) {
      // UPDATE
      const updateFields = [
        'provider = $2', 'host = $3', 'port = $4', 'secure = $5',
        'username = $6', 'from_name = $7', 'from_email = $8',
        'is_active = $9', 'updated_at = NOW()', 'updated_by = $10',
        'scope = $11', 'tenant_id = $12'
      ];
      const params = [
        recordId,
        provider || 'smtp', host, port || 587, secure ?? false,
        username, from_name, from_email,
        is_active ?? true, updatedBy,
        targetScope, targetTenantId
      ];

      if (passwordValue) {
        updateFields.push(`password = $${params.length + 1}`);
        params.push(passwordValue);
      }

      result = await this.pool.query(
        `UPDATE notification_smtp_configs SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`,
        params
      );
    } else {
      // INSERT
      result = await this.pool.query(
        `INSERT INTO notification_smtp_configs (
          tenant_id, scope, provider, host, port, secure,
          username, password, from_name, from_email, is_active, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          targetTenantId, targetScope, provider || 'smtp', host, port || 587, secure ?? false,
          username, passwordValue || '', from_name, from_email,
          is_active ?? true, updatedBy
        ]
      );
    }

    // Invalidate the cache in the email service
    const emailService = getEmailService();
    emailService.invalidateCache(targetTenantId);

    return this._formatResponse(result.rows[0]);
  }

  /**
   * Delete SMTP configuration
   */
  async deleteConfig(id, tenantId = null) {
    const query = tenantId
      ? `DELETE FROM notification_smtp_configs WHERE id = $1 AND tenant_id = $2 RETURNING tenant_id`
      : `DELETE FROM notification_smtp_configs WHERE id = $1 RETURNING tenant_id`;
    const params = tenantId ? [id, tenantId] : [id];
    
    const result = await this.pool.query(query, params);
    
    if (result.rowCount > 0) {
      const emailService = getEmailService();
      emailService.invalidateCache(result.rows[0].tenant_id);
      return true;
    }
    return false;
  }

  /**
   * Test SMTP configuration for a tenant
   */
  async testTenantConnection(data, tenantId) {
    if (!tenantId) throw new Error('Tenant ID is required');
    return this._testConnection(data, tenantId);
  }

  /**
   * Test SMTP configuration (Super Admin)
   */
  async testAdminConnection(data) {
    return this._testConnection(data, null);
  }

  /**
   * Internal helper for testing SMTP connection
   */
  async _testConnection(data, restrictedTenantId = null) {
    const nodemailer = require('nodemailer');
    const { host, port, secure, username, password } = data;
    
    let isSuccess = false;
    let errorMessage = null;

    try {
      // If password is masked and we have an ID, we should try to fetch the real password from DB
      let realPassword = password;
      if ((password === '********' || !password) && data.id) {
          const checkQuery = restrictedTenantId 
            ? 'SELECT password FROM notification_smtp_configs WHERE id = $1 AND tenant_id = $2'
            : 'SELECT password FROM notification_smtp_configs WHERE id = $1';
          const checkParams = restrictedTenantId ? [data.id, restrictedTenantId] : [data.id];
          
          const config = await this.pool.query(checkQuery, checkParams);
          if (config.rows[0]) {
              realPassword = decrypt(config.rows[0].password);
          }
      }

      const transporter = nodemailer.createTransport({
        host: host,
        port: parseInt(port),
        secure: secure,
        auth: {
          user: username,
          pass: realPassword
        }
      });

      await transporter.verify();
      isSuccess = true;
    } catch (error) {
      isSuccess = false;
      errorMessage = error.message;
    }

    // Save test status if data.id is provided
    if (data.id) {
      const updateQuery = restrictedTenantId
        ? 'UPDATE notification_smtp_configs SET last_tested_at = NOW(), last_test_status = $1 WHERE id = $2 AND tenant_id = $3'
        : 'UPDATE notification_smtp_configs SET last_tested_at = NOW(), last_test_status = $1 WHERE id = $2';
      const updateParams = restrictedTenantId
        ? [isSuccess ? 'success' : 'failed', data.id, restrictedTenantId]
        : [isSuccess ? 'success' : 'failed', data.id];
      
      try {
        await this.pool.query(updateQuery, updateParams);
      } catch (err) {
        console.error('Failed to update SMTP test status:', err);
      }
    }

    if (isSuccess) {
      return { success: true, message: 'SMTP connection verified successfully' };
    } else {
      return { success: false, message: `SMTP connection failed: ${errorMessage}` };
    }
  }

  _formatResponse(row) {
    if (!row) return null;
    const { password, ...rest } = row;
    return {
      ...rest,
      password_masked: '********'
    };
  }
}

let instance = null;
const getSmtpConfigService = () => {
  if (!instance) instance = new SmtpConfigService();
  return instance;
};

module.exports = { SmtpConfigService, getSmtpConfigService };
