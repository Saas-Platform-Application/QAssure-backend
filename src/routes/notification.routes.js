/**
 * Notification Routes
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/notification.controller');
const { authenticate, authorize, requireSuperAdmin } = require('../middleware/auth.middleware');

const categoryController = require('../controllers/notification_category.controller');
const { tenantContext } = require('../middleware/tenant.middleware');

router.use(authenticate);
router.use(tenantContext);

// ============================================================================
// MASTER: CATEGORIES & CODES (Super Admin)
// ============================================================================

router.get('/categories', categoryController.getAllCategories);
router.get('/categories/tenant', categoryController.getCategoriesForTenant);
router.get('/categories/:id', categoryController.getCategoryById);
router.post('/categories', requireSuperAdmin('notifications', 'create'), categoryController.createCategory);
router.put('/categories/:id', requireSuperAdmin('notifications', 'update'), categoryController.updateCategory);
router.delete('/categories/:id', requireSuperAdmin('notifications', 'delete'), categoryController.deleteCategory);

router.get('/categories/:categoryId/codes', categoryController.getCodesByCategory);
router.post('/categories/:categoryId/codes', requireSuperAdmin('notifications', 'create'), categoryController.createCode);
router.put('/codes/:codeId', requireSuperAdmin('notifications', 'update'), categoryController.updateCode);
router.delete('/codes/:codeId', requireSuperAdmin('notifications', 'delete'), categoryController.deleteCode);

// ============================================================================
// USER NOTIFICATIONS
// ============================================================================

router.get('/me', controller.getMyNotifications);
router.get('/me/unread-count', controller.getUnreadCount);
router.put('/me/read-all', controller.markAllAsRead);
router.put('/me/dismiss-all', controller.dismissAll);
router.put('/:id/read', controller.markAsRead);
router.put('/:id/dismiss', controller.dismiss);

// ============================================================================
// PREFERENCES
// ============================================================================

router.get('/preferences', controller.getPreferences);
router.put('/preferences', controller.updatePreferences);

// ============================================================================
// ADMIN: TEMPLATES
// ============================================================================

router.get('/templates', authorize('notifications:read'), controller.getTemplates);
router.get('/templates/super-admin', authorize('notifications:read'), controller.getSuperAdminTemplates);
router.post('/templates', authorize('notifications:write'), controller.createTemplate);
router.put('/templates/:id', authorize('notifications:write'), controller.updateTemplate);
router.put('/templates/:code/override', authorize('notifications:write'), controller.upsertTenantTemplate);
router.delete('/templates/:code/reset', authorize('notifications:write'), controller.resetTemplate);

// ============================================================================
// ADMIN: ALERT RULES
// ============================================================================

router.get('/alert-rules', authorize('notifications:read'), controller.getAlertRules);
router.post('/alert-rules', authorize('notifications:write'), controller.createAlertRule);

// ============================================================================
// ADMIN: ESCALATION RULES
// ============================================================================

router.get('/escalation-rules', authorize('notifications:read'), controller.getEscalationRules);
router.post('/escalation-rules', authorize('notifications:write'), controller.createEscalationRule);
router.post('/escalation-rules/process', authorize('notifications:write'), controller.processEscalations);

// =============0===============================================================
// ADMIN: SEND NOTIFICATION
// ============================================================================

router.post('/send',
  // authorize('notifications:write'),
  controller.sendNotification);

module.exports = router;

// ============================================================================
// WEBSOCKET STATUS
// ============================================================================

router.get('/socket/status', authorize('notifications:read'), (req, res) => {
  const { getSocketService } = require('../infrastructure/websocket');
  const socketService = getSocketService();
  const stats = socketService.getStats();
  res.json({ success: true, data: stats });
});
