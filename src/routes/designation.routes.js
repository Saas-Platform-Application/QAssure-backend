/**
 * Designation Routes - QAssure Platform
 * /api/v1/designations/*
 */
const express = require("express");
const router = express.Router();
const designationController = require("../controllers/designation.controller");
const {
  authenticate,
  authorize,
} = require("../middleware/auth.middleware");
const {
  tenantContext,
  verifyTenantAccess,
} = require("../middleware/tenant.middleware");

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);

/**
 * GET /api/v1/designations
 * List designations for tenant
 * Auth: Any authenticated user
 */
router.get("/", authorize("designations", "read"), designationController.list);

/**
 * GET /api/v1/designations/:id
 * Get single designation
 * Auth: Any authenticated user
 */
router.get(
  "/:id",
  authorize("designations", "read"),
  designationController.getById,
);

/**
 * POST /api/v1/designations
 * Create a new designation
 * Auth: Tenant Admin or Super Admin
 */
router.post(
  "/",
  authorize("designations", "create"),
  designationController.create,
);

/**
 * PUT /api/v1/designations/:id
 * Update designation
 * Auth: Tenant Admin or Super Admin
 */
router.put(
  "/:id",
  authorize("designations", "update"),
  designationController.update,
);

/**
 * DELETE /api/v1/designations/:id
 * Soft delete (deactivate) designation
 * Auth: Tenant Admin or Super Admin
 */
router.delete(
  "/:id",
  authorize("designations", "delete"),
  designationController.delete,
);

module.exports = router;
