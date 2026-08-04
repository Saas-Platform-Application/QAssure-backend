/**
 * Department Routes - QAssure Platform
 * /api/v1/departments/*
 */
const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/department.controller");
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
 * GET /api/v1/departments
 * List departments for tenant (flat list)
 * Auth: Any authenticated user with tenant context
 */
router.get("/", authorize("departments", "read"), departmentController.list);

/**
 * GET /api/v1/departments/tree
 * Get department hierarchy as tree structure
 * Auth: Any authenticated user with tenant context
 */
router.get(
  "/tree",
  authorize("departments", "read"),
  departmentController.getTree,
);

/**
 * GET /api/v1/departments/:id
 * Get single department
 * Auth: Any authenticated user with tenant context
 */
router.get(
  "/:id",
  authorize("departments", "read"),
  departmentController.getById,
);

/**
 * POST /api/v1/departments
 * Create a new department
 * Auth: Tenant Admin or Super Admin
 */
router.post(
  "/",
  authorize("departments", "create"),
  departmentController.create,
);

/**
 * PUT /api/v1/departments/:id
 * Update department
 * Auth: Tenant Admin or Super Admin
 */
router.put(
  "/:id",
  authorize("departments", "update"),
  departmentController.update,
);

/**
 * DELETE /api/v1/departments/:id
 * Soft delete (deactivate) department
 * Auth: Tenant Admin or Super Admin
 */
router.delete(
  "/:id",
  authorize("departments", "delete"),
  departmentController.delete,
);

module.exports = router;
