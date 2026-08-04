/**
 * Webhook Routes - QAssure Platform
 * Routes for managing webhooks
 */
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/webhooks
 * Create a new webhook
 */
router.post('/',
  authorize('webhooks:create'),
  webhookController.create
);

/**
 * GET /api/v1/webhooks
 * List webhooks
 */
router.get('/',
  authorize('webhooks:read'),
  webhookController.list
);

/**
 * GET /api/v1/webhooks/:id
 * Get webhook by ID
 */
router.get('/:id',
  authorize('webhooks:read'),
  webhookController.getById
);

/**
 * PUT /api/v1/webhooks/:id
 * Update webhook
 */
router.put('/:id',
  authorize('webhooks:update'),
  webhookController.update
);

/**
 * DELETE /api/v1/webhooks/:id
 * Delete webhook
 */
router.delete('/:id',
  authorize('webhooks:delete'),
  webhookController.remove
);

/**
 * POST /api/v1/webhooks/:id/test
 * Test webhook delivery
 */
router.post('/:id/test',
  authorize('webhooks:update'),
  webhookController.test
);

/**
 * POST /api/v1/webhooks/:id/regenerate-secret
 * Regenerate webhook secret
 */
router.post('/:id/regenerate-secret',
  authorize('webhooks:update'),
  webhookController.regenerateSecret
);

/**
 * GET /api/v1/webhooks/:id/deliveries
 * Get webhook delivery history
 */
router.get('/:id/deliveries',
  authorize('webhooks:read'),
  webhookController.getDeliveryHistory
);

module.exports = router;
