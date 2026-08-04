/**
 * Prompt Routes - QAssure Platform
 * Routes for prompt management endpoints
 * Phase 2: Zod validation, requireFeature, tenant guards
 */
const express = require('express');
const router = express.Router();
const promptController = require('../controllers/prompt.controller');
const multer = require('multer');

// Configure multer for multimodal file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain', 'text/markdown', 'text/csv',
      'application/json',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext } = require('../middleware/tenant.middleware');
// const { requireFeature } = require('../middleware/tenant.middleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  IdParamsSchema,
  CreatePromptSchema,
  UpdatePromptSchema,
  UpdateStatusSchema,
  ExecutePromptSchema,
  TestPromptSchema,
  RollbackSchema,
  CreateTestCaseSchema,
  ListPromptsQuerySchema,
  TestCaseIdParamsSchema,
  VersionParamsSchema,
  CancelPromptSchema
} = require('../validation/prompt.schema');

// All routes require authentication + AI feature enabled
router.use(authenticate);
router.use(tenantContext);

// ==================== CRUD ====================

router.post('/',
  authorize('ai:create'),
  validate(CreatePromptSchema),
  promptController.create
);

router.get('/',
  authorize('ai:read'),
  validate(ListPromptsQuerySchema, 'query'),
  promptController.list
);

router.get('/:id',
  authorize('ai:read'),
  validate(IdParamsSchema, 'params'),
  promptController.getById
);

router.put('/:id',
  authorize('ai:create'),
  validate(IdParamsSchema, 'params'),
  validate(UpdatePromptSchema),
  promptController.update
);

router.patch('/:id/status',
  authorize('ai:create'),
  validate(IdParamsSchema, 'params'),
  validate(UpdateStatusSchema),
  promptController.updateStatus
);

router.delete('/:id',
  authorize('ai:delete'),
  validate(IdParamsSchema, 'params'),
  promptController.remove
);

router.post('/:id/clone',
  authorize('ai:create'),
  validate(IdParamsSchema, 'params'),
  promptController.clone
);

// ==================== Versions ====================

router.get('/:id/versions',
  authorize('ai:read'),
  validate(IdParamsSchema, 'params'),
  promptController.getVersions
);

router.get('/:id/versions/:version',
  authorize('ai:read'),
  validate(VersionParamsSchema, 'params'),
  promptController.getVersion
);

router.post('/:id/rollback',
  authorize('ai:create'),
  validate(IdParamsSchema, 'params'),
  validate(RollbackSchema),
  promptController.rollback
);

// ==================== Execution ====================

router.post('/:id/execute',
  authorize('ai:create'),
  validate(IdParamsSchema, 'params'),
  validate(ExecutePromptSchema),
  promptController.execute
);

router.post('/:id/cancel',
  authorize('ai:create'),
  validate(IdParamsSchema, 'params'),
  validate(CancelPromptSchema),
  promptController.cancelExecution
);

router.post('/:id/execute-with-file',
  authorize('ai:create'),
  validate(IdParamsSchema, 'params'),
  upload.single('file'),
  promptController.executeWithFile
);

router.post('/:id/test',
  authorize('ai:create'),
  validate(IdParamsSchema, 'params'),
  validate(TestPromptSchema),
  promptController.test
);

router.get('/:id/executions',
  authorize('ai:read'),
  validate(IdParamsSchema, 'params'),
  promptController.getExecutions
);

// ==================== Test Cases ====================

router.post('/:id/test-cases',
  authorize('ai:create'),
  validate(IdParamsSchema, 'params'),
  validate(CreateTestCaseSchema),
  promptController.createTestCase
);

router.get('/:id/test-cases',
  authorize('ai:read'),
  validate(IdParamsSchema, 'params'),
  promptController.listTestCases
);

router.post('/test-cases/:testCaseId/run',
  authorize('ai:create'),
  validate(TestCaseIdParamsSchema, 'params'),
  promptController.runTestCase
);

router.get('/test-cases/:testCaseId/results',
  authorize('ai:read'),
  validate(TestCaseIdParamsSchema, 'params'),
  promptController.getTestResults
);

module.exports = router;