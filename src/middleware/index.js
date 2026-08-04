/**
 * Middleware Index - QAssure Platform
 * Central export for all middleware
 */

// Authentication & Authorization
const {
  authenticate,
  optionalAuth,
  authorize,
  authorizeAny,
  authorizeAll,
  requireRole,
  requireSuperAdmin,
  requireTenantAdmin
} = require('./auth.middleware');

// API Key Authentication (NEW)
const {
  authenticateApiKey,
  authenticateAny,
  authorizeApiKey
} = require('./apikey.middleware');

// Multi-tenancy
const {
  tenantContext,
  verifyTenantAccess,
  optionalTenantContext,
  requireFeature,
  requireSubscriptionTier,
  clearTenantCache
} = require('./tenant.middleware');

// Legacy middleware (from authentication_middleware.js)
const {
  ratelimit,
  validation,
  auditlog,
  correlationid,
  errorhandler,
  requestsanitizer,
  ipwhitelist
} = require('./authentication_middleware');

// UUID Validation
const {
  validateUUID,
  validateUUIDs,
  validateBodyUUID,
  autoValidateUUIDs,
  isValidUUID
} = require('./uuid.middleware');

module.exports = {
  // Auth (JWT)
  authenticate,
  optionalAuth,
  authorize,
  authorizeAny,
  authorizeAll,
  requireRole,
  requireSuperAdmin,
  requireTenantAdmin,
  
  // API Key Auth (NEW)
  authenticateApiKey,
  authenticateAny,
  authorizeApiKey,
  
  // Tenant
  tenantContext,
  verifyTenantAccess,
  optionalTenantContext,
  requireFeature,
  requireSubscriptionTier,
  clearTenantCache,
  
  // Legacy/Utility
  ratelimit,
  validation,
  auditlog,
  correlationid,
  errorhandler,
  requestsanitizer,
  ipwhitelist,
  
  // UUID Validation
  validateUUID,
  validateUUIDs,
  validateBodyUUID,
  autoValidateUUIDs,
  isValidUUID
};