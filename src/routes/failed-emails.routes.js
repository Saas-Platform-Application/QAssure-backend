const express = require('express');
const router = express.Router();
const controller = require('../controllers/failed-emails.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext } = require('../middleware/tenant.middleware');

// Routes for both Tenant Admins and Super Admins
// Since both have 'settings.view' or 'admin.super' permissions.
// The controller determines context based on role.
router.use(authenticate);
router.use(tenantContext);

router.get('/', authorize('settings', 'read'), controller.getFailedEmails);
router.post('/resend-all', authorize('settings', 'edit'), controller.resendAllEmails);
router.post('/:id/resend', authorize('settings', 'edit'), controller.resendEmail);
router.delete('/:id', authorize('settings', 'edit'), controller.deleteEmail);

module.exports = router;
