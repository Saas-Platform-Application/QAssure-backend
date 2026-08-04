/**
 * User Category Routes - QAssure Platform
 * /api/v1/user-categories/*
 */
const express = require('express');
const router = express.Router();
const userCategoryController = require('../controllers/user_category.controller');
const { authenticate, authorize, requireTenantAdmin } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/user-categories
 * List user categories for tenant
 * Auth: Any authenticated user
 */
router.get('/',
  authorize('user_categories', 'read'),
  userCategoryController.list
);

/**
 * GET /api/v1/user-categories/:id
 * Get single user category
 * Auth: Any authenticated user
 */
router.get('/:id',
  authorize('user_categories', 'read'),
  userCategoryController.getById
);

/**
 * POST /api/v1/user-categories
 * Create a new user category
 * Auth: Tenant Admin or Super Admin
 */
router.post('/',
  requireTenantAdmin('user_categories', 'create'),
  userCategoryController.create
);

/**
 * PUT /api/v1/user-categories/:id
 * Update user category
 * Auth: Tenant Admin or Super Admin
 */
router.put('/:id',
  requireTenantAdmin('user_categories', 'update'),
  userCategoryController.update
);

/**
 * DELETE /api/v1/user-categories/:id
 * Soft delete (deactivate) user category
 * Auth: Tenant Admin or Super Admin
 */
router.delete('/:id',
  requireTenantAdmin('user_categories', 'delete'),
  userCategoryController.delete
);

module.exports = router;
