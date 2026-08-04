/**
 * Tenant AI Config Controller - QAssure Platform
 * HTTP handlers for per-tenant AI provider configuration
 */
const { getTenantAIConfigService } = require('../services/tenant-ai-config.service');

const configService = getTenantAIConfigService();

const upsert = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_TENANT', message: 'Tenant context required' } });
    }

    const result = await configService.upsert(tenantId, req.body, { userId: req.user?.id });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[TenantAIConfigController] upsert error:', error.message);
    res.status(error.message.includes('required') ? 400 : 500).json({
      success: false,
      error: { code: 'CONFIG_ERROR', message: error.message }
    });
  }
};

const list = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_TENANT', message: 'Tenant context required' } });
    }

    const configs = await configService.listByTenant(tenantId);
    res.status(200).json({ success: true, data: configs });
  } catch (error) {
    console.error('[TenantAIConfigController] list error:', error.message);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

const getByProvider = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_TENANT', message: 'Tenant context required' } });
    }

    const config = await configService.getByProvider(tenantId, req.params.provider);
    if (!config) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `No ${req.params.provider} config found` } });
    }

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error('[TenantAIConfigController] getByProvider error:', error.message);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

const remove = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_TENANT', message: 'Tenant context required' } });
    }

    const deleted = await configService.remove(tenantId, req.params.provider);
    if (!deleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `No ${req.params.provider} config found` } });
    }

    res.status(200).json({ success: true, message: `${req.params.provider} config removed` });
  } catch (error) {
    console.error('[TenantAIConfigController] remove error:', error.message);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

const testConnection = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_TENANT', message: 'Tenant context required' } });
    }

    const health = await configService.testConnection(tenantId, req.params.provider, req.body);
    res.status(200).json({ success: true, data: health });
  } catch (error) {
    console.error('[TenantAIConfigController] testConnection error:', error.message);
    res.status(500).json({ success: false, error: { code: 'TEST_FAILED', message: error.message } });
  }
};

module.exports = { upsert, list, getByProvider, remove, testConnection };