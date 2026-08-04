'use strict';

const { getSmtpConfigService } = require('../services/smtp_config.service');

class SmtpConfigController {
  /**
   * Get SMTP config for current tenant or global
   */
  async getConfig(req, res) {
    try {
      const service = getSmtpConfigService();
      const tenantId = req.user.role === 'super_admin' ? (req.query.tenantId || null) : req.tenantId;
      const scope = req.user.role === 'super_admin' && !tenantId ? 'super_admin' : 'tenant';

      const config = await service.getConfig(tenantId, scope);
      res.json({ success: true, data: config });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * List all configurations (Super Admin only)
   */
  async listAll(req, res) {
    try {
      const service = getSmtpConfigService();
      const configs = await service.listAllConfigs(req.query);
      res.json({ success: true, data: configs });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Create or Update SMTP config (Tenant Admin)
   */
  async upsertConfig(req, res) {
    try {
      const service = getSmtpConfigService();
      const config = await service.upsertTenantConfig(req.body, req.user.id, req.tenantId);
      res.json({ success: true, data: config, message: 'SMTP configuration saved successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Create or Update SMTP config (Super Admin)
   */
  async adminUpsertConfig(req, res) {
    try {
      const service = getSmtpConfigService();
      const config = await service.upsertAdminConfig(req.body, req.user.id);
      res.json({ success: true, data: config, message: 'SMTP configuration saved successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Delete SMTP config
   */
  async deleteConfig(req, res) {
    try {
      const service = getSmtpConfigService();
      const { id } = req.params;
      const tenantId = req.user.roles?.includes('super_admin') ? (req.query.tenantId || null) : req.tenantId;

      const success = await service.deleteConfig(id, tenantId);
      if (success) {
        res.json({ success: true, message: 'SMTP configuration deleted successfully' });
      } else {
        res.status(404).json({ success: false, message: 'Configuration not found' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Test SMTP connection (Tenant Admin)
   */
  async testConnection(req, res) {
    try {
      const service = getSmtpConfigService();
      const result = await service.testTenantConnection(req.body, req.tenantId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Test SMTP connection (Super Admin)
   */
  async adminTestConnection(req, res) {
    try {
      const service = getSmtpConfigService();
      const result = await service.testAdminConnection(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new SmtpConfigController();
