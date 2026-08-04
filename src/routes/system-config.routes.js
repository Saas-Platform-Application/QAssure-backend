/**
 * System Configuration Routes
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/system-config.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

// ============================================================================
// SYSTEM SETTINGS
// ============================================================================

router.get('/settings', authorize('settings:read'), controller.getSettings);
router.get('/settings/:category/:key', authorize('settings:read'), controller.getSetting);
router.put('/settings/:category/:key', authorize('settings:write'), controller.updateSetting);
router.put('/settings', authorize('settings:write'), controller.updateSettingsBulk);

// ============================================================================
// BRANDING
// ============================================================================

router.get('/branding', authorize('settings:read'), controller.getBranding);
router.put('/branding', authorize('settings:write'), controller.updateBranding);

// ============================================================================
// SECURITY POLICIES
// ============================================================================

router.get('/security', authorize('settings:read'), controller.getSecurityPolicy);
router.put('/security', authorize('settings:admin'), controller.updateSecurityPolicy);

// ============================================================================
// FEATURE FLAGS
// ============================================================================

router.get('/features', authorize('settings:read'), controller.getFeatureFlags);
router.get('/features/:flagKey', authorize('settings:read'), controller.getFeatureFlag);
router.get('/features/:flagKey/check', controller.checkFeatureFlag);  // No special permission needed
router.post('/features', authorize('settings:write'), controller.createFeatureFlag);
router.put('/features/:id', authorize('settings:write'), controller.updateFeatureFlag);
router.delete('/features/:id', authorize('settings:write'), controller.deleteFeatureFlag);

// ============================================================================
// WEBHOOKS
// ============================================================================

router.get('/webhooks', authorize('settings:read'), controller.getWebhooks);
router.get('/webhooks/:id', authorize('settings:read'), controller.getWebhook);
router.post('/webhooks', authorize('settings:write'), controller.createWebhook);
router.put('/webhooks/:id', authorize('settings:write'), controller.updateWebhook);
router.delete('/webhooks/:id', authorize('settings:write'), controller.deleteWebhook);
router.post('/webhooks/:id/test', authorize('settings:write'), controller.testWebhook);

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

router.get('/email-templates', authorize('settings:read'), controller.getEmailTemplates);
router.get('/email-templates/:templateCode', authorize('settings:read'), controller.getEmailTemplate);
router.post('/email-templates', authorize('settings:write'), controller.createEmailTemplate);
router.put('/email-templates/:id', authorize('settings:write'), controller.updateEmailTemplate);

// ============================================================================
// SMTP CONFIGURATION
// ============================================================================

router.get('/smtp', authorize('settings:admin'), controller.getSmtpConfig);
router.put('/smtp', authorize('settings:admin'), controller.updateSmtpConfig);
router.post('/smtp/test', authorize('settings:admin'), controller.testSmtpConfig);

module.exports = router;
