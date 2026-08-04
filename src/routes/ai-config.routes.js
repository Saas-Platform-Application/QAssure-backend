/**
 * AI Config Routes - QAssure Platform
 * Per-tenant AI provider configuration management
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/tenant-ai-config.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext } = require('../middleware/tenant.middleware');
const { validate } = require('../middleware/validationMiddleware');
const { ProviderParamsSchema, UpsertConfigSchema, TestConnectionBodySchema } = require('../validation/tenant-ai-config.schema');

router.use(authenticate);
router.use(tenantContext);

router.post('/',
  authorize('ai:create'),
  validate(UpsertConfigSchema),
  controller.upsert
);

router.get('/',
  authorize('ai:read'),
  controller.list
);

router.get('/:provider',
  authorize('ai:read'),
  validate(ProviderParamsSchema, 'params'),
  controller.getByProvider
);

router.delete('/:provider',
  authorize('ai:delete'),
  validate(ProviderParamsSchema, 'params'),
  controller.remove
);

router.post('/:provider/test',
  authorize('ai:create'),
  validate(ProviderParamsSchema, 'params'),
  validate(TestConnectionBodySchema),
  controller.testConnection
);

module.exports = router;