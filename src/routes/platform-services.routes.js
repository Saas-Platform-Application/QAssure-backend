/**
 * Platform Services Routes - QAssure Platform
 * /api/v1/platform-services/*
 *
 * Read-only endpoints for platform service registry.
 * Toggle operations happen via the existing POST/PUT /api/v1/tenants endpoints.
 */

const express = require('express');
const router = express.Router();
const platformServiceController = require('../controllers/platform-service.controller');
const { authenticate, requireSuperAdmin } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/platform-services
 * List all platform services (registry only, no tenant state).
 * Used by Create Tenant Wizard checkbox list.
 * Auth: Super Admin
 */
router.get(
  '/',
  requireSuperAdmin('tenants', 'read'),
  platformServiceController.listAll
);

/**
 * GET /api/v1/platform-services/my
 * Get enabled service keys for current user's tenant.
 * Used by tenant-side sidebar and route guards.
 * Auth: Any authenticated user
 */
router.get(
  '/my',
  platformServiceController.listMine
);

/**
 * GET /api/v1/platform-services/tenant/:tenantId
 * Get all services with enabled/disabled state for a specific tenant.
 * Used by Edit Tenant Platform Services tab.
 * Auth: Super Admin
 */
router.get(
  '/tenant/:tenantId',
  requireSuperAdmin('tenants', 'read'),
  platformServiceController.listForTenant
);

module.exports = router;
