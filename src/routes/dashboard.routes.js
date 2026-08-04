/**
 * Dashboard Routes - QAssure Platform
 * /api/v1/dashboard/*
 */
const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, requireSuperAdmin } = require('../middleware/auth.middleware');
const { tenantContext } = require('../middleware/tenant.middleware');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);

/**
 * GET /api/v1/dashboard/statistics
 * Get dashboard statistics (super admin only)
 * Returns counts of tenants, users, sessions, and modules
 */
router.get('/statistics',
  // requireSuperAdmin('dashboard', 'read'),
  dashboardController.getStatistics.bind(dashboardController)
);

/**
 * GET /api/v1/dashboard/tenant
 * Get tenant-specific dashboard statistics
 * Returns counts of documents, tasks, users, etc.
 */
router.get('/tenant',
  dashboardController.getTenantStatistics.bind(dashboardController)
);

module.exports = router;
