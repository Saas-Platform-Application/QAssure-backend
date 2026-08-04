/**
 * Tenant Storage Bucket Routes — QAssure Platform
 *
 * Endpoint summary:
 *   GET    /storage-buckets                        — list all (superadmin: all; tenant: own/assigned)
 *   POST   /storage-buckets                        — create [superAdmin or storage_buckets:write]
 *   GET    /storage-buckets/:id                    — get by ID
 *   PUT    /storage-buckets/:id                    — update [superAdmin or storage_buckets:write]
 *   DELETE /storage-buckets/:id                    — soft-delete [superAdmin only]
 *
 *   POST   /storage-buckets/:id/assign             — assign bucket to a tenant [superAdmin]
 *                                                    body: { tenant_id }
 *   POST   /storage-buckets/:id/assign-self        — give own bucket to another tenant [superAdmin]
 *                                                    body: { tenant_id }
 *   DELETE /storage-buckets/tenant/:tenantId/unassign  — unassign from tenant [superAdmin]
 *
 *   GET    /storage-buckets/tenant/:tenantId/active    — get active bucket for tenant
 *   GET    /storage-buckets/tenant/:tenantId/history   — assignment history [superAdmin]
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/tenant-storage-bucket.controller');
const { authenticate, authorize, requireSuperAdmin } = require('../middleware/auth.middleware');
const { tenantContext } = require('../middleware/tenant.middleware');
const { validateUUID } = require('../middleware/validate-uuid.middleware');

// All routes require authentication
router.use(authenticate);
router.use(tenantContext);
// Platform service guard — blocks access if 'storage' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('storage'));

// ============================================================================
// COLLECTION ROUTES
// ============================================================================

// List all buckets
router.get(
  '/',
  requireSuperAdmin('storage_buckets', 'read'),
  (req, res) => controller.list(req, res),
);

// Create bucket [superAdmin or platform user with storage_buckets:write]
router.post(
  '/',
  requireSuperAdmin('storage_buckets', 'write'),
  (req, res) => controller.create(req, res),
);

// ============================================================================
// TENANT-SPECIFIC ROUTES (must come before /:id to avoid conflicts)
// ============================================================================

// Get active bucket for a specific tenant
router.get(
  '/tenant/:tenantId/active',
  validateUUID('tenantId'),
  (req, res) => controller.getActiveForTenant(req, res),
);

// Get assignment history for a tenant [superAdmin only]
router.get(
  '/tenant/:tenantId/history',
  requireSuperAdmin,
  validateUUID('tenantId'),
  (req, res) => controller.getAssignmentHistory(req, res),
);

// Unassign a bucket from a tenant [superAdmin only]
router.delete(
  '/tenant/:tenantId/unassign',
  requireSuperAdmin,
  validateUUID('tenantId'),
  (req, res) => controller.unassignFromTenant(req, res),
);

// ============================================================================
// SINGLE BUCKET ROUTES
// ============================================================================

// Get by ID
router.get(
  '/:id',
  requireSuperAdmin('storage_buckets', 'read'),
  validateUUID('id'),
  (req, res) => controller.getById(req, res),
);

// Update bucket
router.put(
  '/:id',
  requireSuperAdmin('storage_buckets', 'write'),
  validateUUID('id'),
  (req, res) => controller.update(req, res),
);

// Soft-delete bucket [superAdmin only]
router.delete(
  '/:id',
  requireSuperAdmin,
  validateUUID('id'),
  (req, res) => controller.delete(req, res),
);

// Assign bucket to a tenant [superAdmin]
router.post(
  '/:id/assign',
  requireSuperAdmin,
  validateUUID('id'),
  (req, res) => controller.assignToTenant(req, res),
);

// Super admin shares own bucket with another tenant
router.post(
  '/:id/assign-self',
  requireSuperAdmin,
  validateUUID('id'),
  (req, res) => controller.assignSelfBucket(req, res),
);

module.exports = router;
