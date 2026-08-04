'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/smtp_config.controller');
const { authenticate, authorize, requireSuperAdmin } = require('../middleware/auth.middleware');
const { tenantContext } = require('../middleware/tenant.middleware');

router.use(authenticate);
router.use(tenantContext);

// Get current config (My Tenant or Super Admin view)
router.get('/', controller.getConfig);

// List all (Super Admin only)
router.get('/all', requireSuperAdmin('settings', 'read'), controller.listAll);

// Upsert (Tenant Admin for their own)
router.post('/', 
    authorize('settings', 'write'), 
    controller.upsertConfig);

// Setup (Super Admin only - Manage ANY tenant or global SMTP)
router.post('/setup',
    requireSuperAdmin('settings', 'write'),
    controller.adminUpsertConfig);

// Test Connection (Tenant)
router.post('/test'
    , authorize('settings', 'write')
    , controller.testConnection);

// Test Connection (Admin)
router.post('/admin/test'
    , requireSuperAdmin('settings', 'write')
    , controller.adminTestConnection);

// Delete
router.delete('/:id', authorize('settings', 'write'), controller.deleteConfig);

module.exports = router;
