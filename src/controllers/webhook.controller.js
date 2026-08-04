/**
 * Webhook Controller - QAssure Platform
 * HTTP handlers for webhook management
 */
const { getWebhookService } = require('../services/webhook.service');

const webhookService = getWebhookService();

/**
 * Create webhook
 * POST /api/v1/webhooks
 */
const create = async (req, res) => {
  try {
    const webhook = await webhookService.create(
      req.user?.tenantId,
      req.body,
      req.user?.id
    );

    res.status(201).json({
      success: true,
      data: webhook,
      message: 'Webhook created. Please save the secret - it will not be shown again.'
    });
  } catch (error) {
    console.error('[WebhookController] create error:', error.message);
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: error.message }
    });
  }
};

/**
 * List webhooks
 * GET /api/v1/webhooks
 */
const list = async (req, res) => {
  try {
    const { status, eventType, page, limit } = req.query;

    const result = await webhookService.list(req.user?.tenantId, {
      status,
      eventType,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[WebhookController] list error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'LIST_FAILED', message: error.message }
    });
  }
};

/**
 * Get webhook by ID
 * GET /api/v1/webhooks/:id
 */
const getById = async (req, res) => {
  try {
    const webhook = await webhookService.getById(
      req.params.id,
      req.user?.tenantId
    );

    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook not found' }
      });
    }

    res.status(200).json({
      success: true,
      data: webhook
    });
  } catch (error) {
    console.error('[WebhookController] getById error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'GET_FAILED', message: error.message }
    });
  }
};

/**
 * Update webhook
 * PUT /api/v1/webhooks/:id
 */
const update = async (req, res) => {
  try {
    const webhook = await webhookService.update(
      req.params.id,
      req.user?.tenantId,
      req.body,
      req.user?.id
    );

    res.status(200).json({
      success: true,
      data: webhook,
      message: 'Webhook updated'
    });
  } catch (error) {
    console.error('[WebhookController] update error:', error.message);
    
    if (error.message === 'Webhook not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
    }

    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message }
    });
  }
};

/**
 * Delete webhook
 * DELETE /api/v1/webhooks/:id
 */
const remove = async (req, res) => {
  try {
    await webhookService.delete(req.params.id, req.user?.tenantId);

    res.status(200).json({
      success: true,
      message: 'Webhook deleted'
    });
  } catch (error) {
    console.error('[WebhookController] delete error:', error.message);
    
    if (error.message === 'Webhook not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: error.message }
    });
  }
};

/**
 * Test webhook
 * POST /api/v1/webhooks/:id/test
 * Optional body: { test_url: "https://..." } to override webhook URL for testing
 */
const test = async (req, res) => {
  try {
    const result = await webhookService.test(
      req.params.id,
      req.user?.tenantId,
      req.body?.test_url // Optional test URL override
    );

    const statusCode = result.success ? 200 : 400;

    res.status(statusCode).json({
      success: result.success,
      data: {
        statusCode: result.statusCode,
        responseTime: `${result.responseTime}ms`,
        error: result.error,
        testUrl: result.testUrl // Include which URL was tested
      },
      message: result.success ? 'Webhook test successful' : 'Webhook test failed'
    });
  } catch (error) {
    console.error('[WebhookController] test error:', error.message);
    
    if (error.message === 'Webhook not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'TEST_FAILED', message: error.message }
    });
  }
};

/**
 * Regenerate webhook secret
 * POST /api/v1/webhooks/:id/regenerate-secret
 */
const regenerateSecret = async (req, res) => {
  try {
    const result = await webhookService.regenerateSecret(
      req.params.id,
      req.user?.tenantId
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Secret regenerated. Please save the new secret - it will not be shown again.'
    });
  } catch (error) {
    console.error('[WebhookController] regenerateSecret error:', error.message);
    
    if (error.message === 'Webhook not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'REGENERATE_FAILED', message: error.message }
    });
  }
};

/**
 * Get webhook delivery history
 * GET /api/v1/webhooks/:id/deliveries
 */
const getDeliveryHistory = async (req, res) => {
  try {
    const { status, page, limit } = req.query;

    const result = await webhookService.getDeliveryHistory(
      req.params.id,
      req.user?.tenantId,
      {
        status,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      }
    );

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[WebhookController] getDeliveryHistory error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'GET_FAILED', message: error.message }
    });
  }
};

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  test,
  regenerateSecret,
  getDeliveryHistory
};
