/**
 * System Configuration Service
 * Manages platform settings, branding, security policies, feature flags
 */

const { pool } = require('../config/database');

class SystemConfigService {
  constructor() {
    this.pool = pool;
    this.settingsCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  // ============================================================================
  // SYSTEM SETTINGS
  // ============================================================================

  async getSettings(tenantId = null, category = null) {
    let query = `
      SELECT * FROM system_settings 
      WHERE (tenant_id IS NULL OR tenant_id = $1)
    `;
    const params = [tenantId];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += ' ORDER BY category, setting_key';

    const result = await this.pool.query(query, params);
    return this._groupByCategory(result.rows);
  }

  async getSetting(tenantId, category, key) {
    // Check tenant-specific first, then global
    const result = await this.pool.query(
      `SELECT * FROM system_settings 
       WHERE category = $1 AND setting_key = $2 
       AND (tenant_id = $3 OR tenant_id IS NULL)
       ORDER BY tenant_id NULLS LAST LIMIT 1`,
      [category, key, tenantId]
    );

    if (result.rows[0]) {
      return this._parseSettingValue(result.rows[0]);
    }
    return null;
  }

  async updateSetting(tenantId, category, key, value, updatedBy) {
    const result = await this.pool.query(
      `INSERT INTO system_settings (tenant_id, category, setting_key, setting_value, updated_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), category, setting_key)
       DO UPDATE SET setting_value = $4, updated_by = $5, updated_at = NOW()
       RETURNING *`,
      [tenantId, category, key, value, updatedBy]
    );

    this._clearCache(tenantId);
    return result.rows[0];
  }

  async updateSettingsBulk(tenantId, settings, updatedBy) {
    const results = [];
    for (const { category, key, value } of settings) {
      const result = await this.updateSetting(tenantId, category, key, value, updatedBy);
      results.push(result);
    }
    return results;
  }

  // ============================================================================
  // BRANDING
  // ============================================================================

  async getBranding(tenantId) {
    const result = await this.pool.query(
      'SELECT * FROM branding_config WHERE tenant_id = $1',
      [tenantId]
    );

    if (result.rows[0]) return result.rows[0];

    // Return defaults if not configured
    return {
      tenant_id: tenantId,
      primary_color: '#1976d2',
      secondary_color: '#dc004e',
      accent_color: '#ff9800',
      background_color: '#ffffff',
      text_color: '#333333',
      font_family: 'Inter, sans-serif'
    };
  }

  async updateBranding(tenantId, data) {
    const fields = [
      'logo_url', 'logo_dark_url', 'favicon_url', 'login_background_url',
      'primary_color', 'secondary_color', 'accent_color', 'background_color', 'text_color',
      'font_family', 'heading_font_family', 'custom_css',
      'footer_text', 'copyright_text', 'privacy_policy_url', 'terms_of_service_url',
      'email_header_html', 'email_footer_html'
    ];

    const setClauses = ['updated_at = NOW()'];
    const values = [tenantId];
    let idx = 2;

    for (const field of fields) {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = $${idx}`);
        values.push(data[field]);
        idx++;
      }
    }

    const result = await this.pool.query(
      `INSERT INTO branding_config (tenant_id, ${fields.filter(f => data[f] !== undefined).join(', ')})
       VALUES ($1, ${fields.filter(f => data[f] !== undefined).map((_, i) => `$${i + 2}`).join(', ')})
       ON CONFLICT (tenant_id) DO UPDATE SET ${setClauses.join(', ')}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // ============================================================================
  // SECURITY POLICIES
  // ============================================================================

  async getSecurityPolicy(tenantId) {
    // Get tenant-specific or global
    const result = await this.pool.query(
      `SELECT * FROM security_policies 
       WHERE tenant_id = $1 OR tenant_id IS NULL
       ORDER BY tenant_id NULLS LAST LIMIT 1`,
      [tenantId]
    );

    return result.rows[0] || this._defaultSecurityPolicy();
  }

  async updateSecurityPolicy(tenantId, data) {
    const fields = [
      'password_min_length', 'password_require_uppercase', 'password_require_lowercase',
      'password_require_numbers', 'password_require_special', 'password_expiry_days',
      'password_history_count', 'mfa_required', 'mfa_methods', 'mfa_grace_period_days',
      'session_timeout_minutes', 'max_concurrent_sessions', 'session_extend_on_activity',
      'max_login_attempts', 'lockout_duration_minutes', 'require_captcha_after_attempts',
      'ip_allowlist_enabled', 'ip_allowlist', 'ip_blocklist',
      'api_rate_limit_per_minute', 'api_rate_limit_per_hour', 'require_api_key_for_public',
      'audit_log_retention_days', 'session_log_retention_days'
    ];

    const setClauses = ['updated_at = NOW()'];
    const values = [tenantId];
    let idx = 2;

    for (const field of fields) {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = $${idx}`);
        values.push(data[field]);
        idx++;
      }
    }

    const result = await this.pool.query(
      `INSERT INTO security_policies (tenant_id)
       VALUES ($1)
       ON CONFLICT (tenant_id) DO UPDATE SET ${setClauses.join(', ')}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // ============================================================================
  // FEATURE FLAGS
  // ============================================================================

  async getFeatureFlags(tenantId = null) {
    const result = await this.pool.query(
      `SELECT * FROM feature_flags 
       WHERE tenant_id IS NULL OR tenant_id = $1
       ORDER BY category, flag_name`,
      [tenantId]
    );
    return result.rows;
  }

  async getFeatureFlag(tenantId, flagKey) {
    const result = await this.pool.query(
      `SELECT * FROM feature_flags 
       WHERE flag_key = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
       ORDER BY tenant_id NULLS LAST LIMIT 1`,
      [flagKey, tenantId]
    );
    return result.rows[0] || null;
  }

  async isFeatureEnabled(tenantId, flagKey, userId = null, userRoles = []) {
    const flag = await this.getFeatureFlag(tenantId, flagKey);
    if (!flag) return false;
    if (!flag.is_enabled) return false;

    // Check scheduling
    const now = new Date();
    if (flag.enabled_from && new Date(flag.enabled_from) > now) return false;
    if (flag.enabled_until && new Date(flag.enabled_until) < now) return false;

    // Check rollout strategy
    if (flag.rollout_strategy === 'all') return true;
    if (flag.rollout_percentage < 100) {
      const hash = this._hashUserId(userId || tenantId);
      if (hash > flag.rollout_percentage) return false;
    }

    if (flag.rollout_config) {
      const config = flag.rollout_config;
      if (config.user_ids && userId && !config.user_ids.includes(userId)) return false;
      if (config.roles && config.roles.length > 0) {
        if (!userRoles.some(r => config.roles.includes(r))) return false;
      }
    }

    return true;
  }

  async createFeatureFlag(tenantId, data, createdBy) {
    const result = await this.pool.query(
      `INSERT INTO feature_flags (
        tenant_id, flag_key, flag_name, description, is_enabled,
        rollout_percentage, rollout_strategy, rollout_config,
        enabled_from, enabled_until, category, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        tenantId, data.flag_key, data.flag_name, data.description, data.is_enabled || false,
        data.rollout_percentage || 100, data.rollout_strategy || 'all',
        JSON.stringify(data.rollout_config || {}),
        data.enabled_from, data.enabled_until, data.category, data.tags || [], createdBy
      ]
    );
    return result.rows[0];
  }

  async updateFeatureFlag(id, tenantId, data, updatedBy) {
    // Explicitly exclude tenant_id from update - it should never be changed via update
    const { tenant_id, ...updateData } = data;
    
    const setClauses = ['updated_by = $3', 'updated_at = NOW()'];
    const values = [id, tenantId, updatedBy];
    let idx = 4;

    const fields = ['flag_name', 'description', 'is_enabled', 'rollout_percentage',
                   'rollout_strategy', 'enabled_from', 'enabled_until', 'category', 'tags'];

    for (const field of fields) {
      if (updateData[field] !== undefined) {
        const value = field === 'tags' ? updateData[field] : 
                     field === 'rollout_config' ? JSON.stringify(updateData[field]) : updateData[field];
        setClauses.push(`${field} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    const result = await this.pool.query(
      `UPDATE feature_flags SET ${setClauses.join(', ')} 
       WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async deleteFeatureFlag(id, tenantId) {
    const result = await this.pool.query(
      'DELETE FROM feature_flags WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );
    return result.rowCount > 0;
  }

  // ============================================================================
  // WEBHOOKS
  // ============================================================================

  async getWebhooks(tenantId) {
    const result = await this.pool.query(
      'SELECT * FROM webhook_configs WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );
    return result.rows.map(r => this._sanitizeWebhook(r));
  }

  async getWebhook(id, tenantId) {
    const result = await this.pool.query(
      'SELECT * FROM webhook_configs WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return result.rows[0] ? this._sanitizeWebhook(result.rows[0]) : null;
  }

  async createWebhook(tenantId, data, createdBy) {
    const result = await this.pool.query(
      `INSERT INTO webhook_configs (
        tenant_id, name, description, url, http_method,
        auth_type, auth_config, events, custom_headers,
        retry_count, retry_delay_seconds, timeout_seconds, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        tenantId, data.name, data.description, data.url, data.http_method || 'POST',
        data.auth_type || 'none', JSON.stringify(data.auth_config || {}),
        data.events, JSON.stringify(data.custom_headers || {}),
        data.retry_count || 3, data.retry_delay_seconds || 60, data.timeout_seconds || 30, createdBy
      ]
    );
    return this._sanitizeWebhook(result.rows[0]);
  }

  async updateWebhook(id, tenantId, data) {
    const setClauses = ['updated_at = NOW()'];
    const values = [id, tenantId];
    let idx = 3;

    const fields = ['name', 'description', 'url', 'http_method', 'auth_type',
                   'events', 'retry_count', 'retry_delay_seconds', 'timeout_seconds', 'is_active'];

    for (const field of fields) {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = $${idx}`);
        values.push(data[field]);
        idx++;
      }
    }

    if (data.auth_config) {
      setClauses.push(`auth_config = $${idx}`);
      values.push(JSON.stringify(data.auth_config));
      idx++;
    }

    if (data.custom_headers) {
      setClauses.push(`custom_headers = $${idx}`);
      values.push(JSON.stringify(data.custom_headers));
    }

    const result = await this.pool.query(
      `UPDATE webhook_configs SET ${setClauses.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      values
    );

    return result.rows[0] ? this._sanitizeWebhook(result.rows[0]) : null;
  }

  async deleteWebhook(id, tenantId) {
    const result = await this.pool.query(
      'DELETE FROM webhook_configs WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );
    return result.rowCount > 0;
  }

  async testWebhook(id, tenantId) {
    const webhook = await this.getWebhook(id, tenantId);
    if (!webhook) throw new Error('Webhook not found');

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook from QAssure' }
    };

    try {
      const axios = require('axios');
      const start = Date.now();
      
      const response = await axios({
        method: webhook.http_method,
        url: webhook.url,
        data: testPayload,
        timeout: webhook.timeout_seconds * 1000,
        headers: webhook.custom_headers || {}
      });

      const duration = Date.now() - start;

      await this.pool.query(
        'UPDATE webhook_configs SET last_triggered_at = NOW(), last_status = $1 WHERE id = $2',
        ['success', id]
      );

      return { success: true, status: response.status, duration_ms: duration };
    } catch (error) {
      await this.pool.query(
        'UPDATE webhook_configs SET last_triggered_at = NOW(), last_status = $1, failure_count = failure_count + 1 WHERE id = $2',
        ['failed', id]
      );
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // EMAIL TEMPLATES
  // ============================================================================

  async getEmailTemplates(tenantId = null) {
    const result = await this.pool.query(
      `SELECT * FROM email_templates 
       WHERE tenant_id IS NULL OR tenant_id = $1
       ORDER BY category, name`,
      [tenantId]
    );
    return result.rows;
  }

  async getEmailTemplate(tenantId, templateCode) {
    const result = await this.pool.query(
      `SELECT * FROM email_templates 
       WHERE template_code = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
       ORDER BY tenant_id NULLS LAST LIMIT 1`,
      [templateCode, tenantId]
    );
    return result.rows[0] || null;
  }

  async createEmailTemplate(tenantId, data, createdBy) {
    const result = await this.pool.query(
      `INSERT INTO email_templates (
        tenant_id, template_code, name, description, subject_template,
        body_html, body_text, variables, category, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        tenantId, data.template_code, data.name, data.description, data.subject_template,
        data.body_html, data.body_text, JSON.stringify(data.variables || []),
        data.category, createdBy
      ]
    );
    return result.rows[0];
  }

  async updateEmailTemplate(id, tenantId, data, updatedBy) {
    const setClauses = ['updated_by = $3', 'updated_at = NOW()'];
    const values = [id, tenantId, updatedBy];
    let idx = 4;

    const fields = ['name', 'description', 'subject_template', 'body_html', 'body_text', 'category', 'is_active'];

    for (const field of fields) {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = $${idx}`);
        values.push(data[field]);
        idx++;
      }
    }

    if (data.variables) {
      setClauses.push(`variables = $${idx}`);
      values.push(JSON.stringify(data.variables));
    }

    const result = await this.pool.query(
      `UPDATE email_templates SET ${setClauses.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // ============================================================================
  // SMTP CONFIGURATION
  // ============================================================================

  async getSmtpConfig(tenantId) {
    const result = await this.pool.query(
      'SELECT * FROM smtp_configs WHERE tenant_id = $1',
      [tenantId]
    );
    return result.rows[0] ? this._sanitizeSmtp(result.rows[0]) : null;
  }

  async updateSmtpConfig(tenantId, data) {
    const result = await this.pool.query(
      `INSERT INTO smtp_configs (
        tenant_id, host, port, secure, username, password_encrypted,
        from_email, from_name, reply_to_email, max_connections, rate_limit_per_minute
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (tenant_id) DO UPDATE SET
        host = $2, port = $3, secure = $4, username = $5,
        password_encrypted = COALESCE($6, smtp_configs.password_encrypted),
        from_email = $7, from_name = $8, reply_to_email = $9,
        max_connections = $10, rate_limit_per_minute = $11, updated_at = NOW()
      RETURNING *`,
      [
        tenantId, data.host, data.port || 587, data.secure || false,
        data.username, data.password, // Should be encrypted before storing
        data.from_email, data.from_name, data.reply_to_email,
        data.max_connections || 5, data.rate_limit_per_minute || 100
      ]
    );
    return this._sanitizeSmtp(result.rows[0]);
  }

  async testSmtpConfig(tenantId, testEmail) {
    const config = await this.getSmtpConfig(tenantId);
    if (!config) throw new Error('SMTP not configured');

    // In real implementation, use nodemailer to send test email
    return { success: true, message: `Test email would be sent to ${testEmail}` };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  _groupByCategory(settings) {
    return settings.reduce((acc, s) => {
      if (!acc[s.category]) acc[s.category] = {};
      acc[s.category][s.setting_key] = this._parseSettingValue(s);
      return acc;
    }, {});
  }

  _parseSettingValue(setting) {
    const value = setting.setting_value;
    switch (setting.value_type) {
      case 'number': return parseFloat(value);
      case 'boolean': return value === 'true';
      case 'json': return JSON.parse(value);
      default: return value;
    }
  }

  _defaultSecurityPolicy() {
    return {
      password_min_length: 8,
      password_require_uppercase: true,
      password_require_lowercase: true,
      password_require_numbers: true,
      password_require_special: true,
      mfa_required: false,
      session_timeout_minutes: 480,
      max_login_attempts: 5
    };
  }

  _sanitizeWebhook(webhook) {
    if (webhook.auth_config) {
      webhook.auth_config = { type: webhook.auth_type, configured: true };
    }
    return webhook;
  }

  _sanitizeSmtp(smtp) {
    if (smtp) {
      delete smtp.password_encrypted;
      smtp.password_configured = true;
    }
    return smtp;
  }

  _hashUserId(userId) {
    if (!userId) return Math.random() * 100;
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }

  _clearCache(tenantId) {
    this.settingsCache.delete(tenantId || 'global');
  }
}

let instance = null;
const getSystemConfigService = () => {
  if (!instance) instance = new SystemConfigService();
  return instance;
};

module.exports = { SystemConfigService, getSystemConfigService };
