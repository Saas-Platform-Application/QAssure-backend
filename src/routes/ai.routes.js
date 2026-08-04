/**
 * AI Routes - QAssure Platform
 * Routes for AI Gateway endpoints
 * Phase 2: Zod validation, requireFeature, tenant guards
 */
const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const {
  authenticate,
  authorize,
  requireSuperAdmin,
} = require("../middleware/auth.middleware");
const { tenantContext } = require("../middleware/tenant.middleware");
const { validate } = require("../middleware/validationMiddleware");
const {
  IdParamsSchema,
  CreateCompletionSchema,
  ListCompletionsQuerySchema,
  CostQuerySchema,
  PlaygroundSchema,
  ProviderParamsSchema,
  ListFallbacksQuerySchema,
  UpdateFallbackOrderSchema,
  UpdateFallbackMappingSchema,
} = require("../validation/ai.schema");

// All AI routes require authentication + AI feature enabled
router.use(authenticate);
router.use(tenantContext);
// Platform service guard — blocks access if 'ai' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('ai'));

// ==========================================
// PROVIDERS
// ==========================================

router.get("/providers", authorize("ai:read"), aiController.getProviders);

router.get(
  "/providers/:provider/health",
  authorize("ai:read"),
  validate(ProviderParamsSchema, "params"),
  aiController.getProviderHealth,
);

// ==========================================
// MODELS
// ==========================================

router.get("/models", authorize("ai:read"), aiController.getModels);

// ==========================================
// HEALTH
// ==========================================

router.get("/health", authorize("ai:read"), aiController.getHealthStatus);

// ==========================================
// COMPLETIONS
// ==========================================

router.post(
  "/completions",
  authorize("ai:create"),
  validate(CreateCompletionSchema),
  aiController.createCompletion,
);

router.get(
  "/completions",
  authorize("ai:read"),
  validate(ListCompletionsQuerySchema, "query"),
  aiController.listCompletions,
);

router.get(
  "/completions/:id",
  authorize("ai:read"),
  validate(IdParamsSchema, "params"),
  aiController.getCompletion,
);

// ==========================================
// COSTS
// ==========================================

router.get(
  "/costs",
  authorize("ai:read"),
  validate(CostQuerySchema, "query"),
  aiController.getCostSummary,
);

// ==========================================
// PLAYGROUND
// ==========================================

router.post(
  "/playground",
  authorize("ai:create"),
  validate(PlaygroundSchema),
  aiController.playground,
);

// ==========================================
// FALLBACKS & MONITORING
// ==========================================

router.get(
  "/fallbacks",
  requireSuperAdmin,
  authorize("ai:read"),
  validate(ListFallbacksQuerySchema, "query"),
  aiController.listFallbacks,
);

router.get(
  "/fallback-order",
  requireSuperAdmin,
  authorize("ai:read"),
  aiController.getFallbackOrderSetting,
);

router.post(
  "/fallback-order",
  requireSuperAdmin,
  authorize("ai:create"),
  validate(UpdateFallbackOrderSchema),
  aiController.updateFallbackOrderSetting,
);

// Per-provider fallback mapping (Super Admin only)
router.get(
  "/fallback-mapping",
  requireSuperAdmin,
  authorize("ai:read"),
  aiController.getFallbackMappingSetting,
);

router.post(
  "/fallback-mapping",
  requireSuperAdmin,
  authorize("ai:create"),
  validate(UpdateFallbackMappingSchema),
  aiController.updateFallbackMappingSetting,
);

module.exports = router;
