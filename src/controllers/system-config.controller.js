/**
 * System Configuration Controller
 * Handles settings, branding, security policies, feature flags, webhooks
 */

const { getSystemConfigService } = require('../services/system-config.service');

class SystemConfigController {

  // ============================================================================
  // SYSTEM SETTINGS
  // ============================================================================

  async getSettings(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const { category } = req.query;

      const settings = await service.getSettings(tenantId, category);
      res.json({ success: true, data: settings });
    } catch (error) {
      console.error('[SystemConfig] Get settings error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async getSetting(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const { category, key } = req.params;

      const setting = await service.getSetting(tenantId, category, key);
      if (setting === null) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Setting not found' } });
      }

      res.json({ success: true, data: { value: setting } });
    } catch (error) {
      console.error('[SystemConfig] Get setting error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async updateSetting(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { category, key } = req.params;
      const { value } = req.body;

      const setting = await service.updateSetting(tenantId, category, key, value, userId);
      res.json({ success: true, data: setting });
    } catch (error) {
      console.error('[SystemConfig] Update setting error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  async updateSettingsBulk(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { settings } = req.body;

      if (!Array.isArray(settings)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'settings must be an array' } });
      }

      const results = await service.updateSettingsBulk(tenantId, settings, userId);
      res.json({ success: true, data: results });
    } catch (error) {
      console.error('[SystemConfig] Bulk update error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // BRANDING
  // ============================================================================

  async getBranding(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;

      const branding = await service.getBranding(tenantId);
      res.json({ success: true, data: branding });
    } catch (error) {
      console.error('[SystemConfig] Get branding error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async updateBranding(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;

      const branding = await service.updateBranding(tenantId, req.body);
      res.json({ success: true, data: branding });
    } catch (error) {
      console.error('[SystemConfig] Update branding error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // SECURITY POLICIES
  // ============================================================================

  async getSecurityPolicy(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;

      const policy = await service.getSecurityPolicy(tenantId);
      res.json({ success: true, data: policy });
    } catch (error) {
      console.error('[SystemConfig] Get security policy error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async updateSecurityPolicy(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;

      const policy = await service.updateSecurityPolicy(tenantId, req.body);
      res.json({ success: true, data: policy });
    } catch (error) {
      console.error('[SystemConfig] Update security policy error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // FEATURE FLAGS
  // ============================================================================

  async getFeatureFlags(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;

      const flags = await service.getFeatureFlags(tenantId);
      res.json({ success: true, data: flags });
    } catch (error) {
      console.error('[SystemConfig] Get feature flags error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async getFeatureFlag(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const { flagKey } = req.params;

      const flag = await service.getFeatureFlag(tenantId, flagKey);
      if (!flag) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Feature flag not found' } });
      }

      res.json({ success: true, data: flag });
    } catch (error) {
      console.error('[SystemConfig] Get feature flag error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async checkFeatureFlag(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { flagKey } = req.params;

      const isEnabled = await service.isFeatureEnabled(tenantId, flagKey, userId, req.user.roles || []);
      res.json({ success: true, data: { flag_key: flagKey, is_enabled: isEnabled } });
    } catch (error) {
      console.error('[SystemConfig] Check feature flag error:', error.message);
      res.status(500).json({ success: false, error: { code: 'CHECK_ERROR', message: error.message } });
    }
  }

  async createFeatureFlag(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;

      const flag = await service.createFeatureFlag(tenantId, req.body, userId);
      res.status(201).json({ success: true, data: flag });
    } catch (error) {
      console.error('[SystemConfig] Create feature flag error:', error.message);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
    }
  }

  async updateFeatureFlag(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { id } = req.params;

      // Exclude tenant_id from update data - it should never be changed via update
      const { tenant_id, ...updateData } = req.body;

      const flag = await service.updateFeatureFlag(id, tenantId, updateData, userId);
      if (!flag) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Feature flag not found' } });
      }

      res.json({ success: true, data: flag });
    } catch (error) {
      console.error('[SystemConfig] Update feature flag error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  async deleteFeatureFlag(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const deleted = await service.deleteFeatureFlag(id, tenantId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Feature flag not found' } });
      }

      res.json({ success: true, data: { message: 'Feature flag deleted' } });
    } catch (error) {
      console.error('[SystemConfig] Delete feature flag error:', error.message);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // WEBHOOKS
  // ============================================================================

  async getWebhooks(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;

      const webhooks = await service.getWebhooks(tenantId);
      res.json({ success: true, data: webhooks });
    } catch (error) {
      console.error('[SystemConfig] Get webhooks error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async getWebhook(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const webhook = await service.getWebhook(id, tenantId);
      if (!webhook) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Webhook not found' } });
      }

      res.json({ success: true, data: webhook });
    } catch (error) {
      console.error('[SystemConfig] Get webhook error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async createWebhook(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;

      const webhook = await service.createWebhook(tenantId, req.body, userId);
      res.status(201).json({ success: true, data: webhook });
    } catch (error) {
      console.error('[SystemConfig] Create webhook error:', error.message);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
    }
  }

  async updateWebhook(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const webhook = await service.updateWebhook(id, tenantId, req.body);
      if (!webhook) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Webhook not found' } });
      }

      res.json({ success: true, data: webhook });
    } catch (error) {
      console.error('[SystemConfig] Update webhook error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  async deleteWebhook(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const deleted = await service.deleteWebhook(id, tenantId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Webhook not found' } });
      }

      res.json({ success: true, data: { message: 'Webhook deleted' } });
    } catch (error) {
      console.error('[SystemConfig] Delete webhook error:', error.message);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: error.message } });
    }
  }

  async testWebhook(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const result = await service.testWebhook(id, tenantId);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[SystemConfig] Test webhook error:', error.message);
      res.status(500).json({ success: false, error: { code: 'TEST_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // EMAIL TEMPLATES
  // ============================================================================

  async getEmailTemplates(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;

      const templates = await service.getEmailTemplates(tenantId);
      res.json({ success: true, data: templates });
    } catch (error) {
      console.error('[SystemConfig] Get email templates error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async getEmailTemplate(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const { templateCode } = req.params;

      const template = await service.getEmailTemplate(tenantId, templateCode);
      if (!template) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Email template not found' } });
      }

      res.json({ success: true, data: template });
    } catch (error) {
      console.error('[SystemConfig] Get email template error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async createEmailTemplate(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;

      const template = await service.createEmailTemplate(tenantId, req.body, userId);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      console.error('[SystemConfig] Create email template error:', error.message);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
    }
  }

  async updateEmailTemplate(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { id } = req.params;

      const template = await service.updateEmailTemplate(id, tenantId, req.body, userId);
      if (!template) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Email template not found' } });
      }

      res.json({ success: true, data: template });
    } catch (error) {
      console.error('[SystemConfig] Update email template error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // SMTP
  // ============================================================================

  async getSmtpConfig(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;

      const config = await service.getSmtpConfig(tenantId);
      res.json({ success: true, data: config || { configured: false } });
    } catch (error) {
      console.error('[SystemConfig] Get SMTP config error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async updateSmtpConfig(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;

      const config = await service.updateSmtpConfig(tenantId, req.body);
      res.json({ success: true, data: config });
    } catch (error) {
      console.error('[SystemConfig] Update SMTP config error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  async testSmtpConfig(req, res) {
    try {
      const service = getSystemConfigService();
      const tenantId = req.user.tenantId;
      const { test_email } = req.body;

      if (!test_email) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'test_email is required' } });
      }

      const result = await service.testSmtpConfig(tenantId, test_email);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[SystemConfig] Test SMTP config error:', error.message);
      res.status(500).json({ success: false, error: { code: 'TEST_ERROR', message: error.message } });
    }
  }
}

module.exports = new SystemConfigController();
