// ============================================================================
// QAssure File Attachment Service — UUID Validation Middleware
// File: src/middleware/validate-uuid.middleware.js
// ============================================================================
// 
// CREATE THIS AS A NEW FILE, then update routes to use it.
// ============================================================================

'use strict';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Express middleware factory: validates that a route param is a valid UUID v4.
 * Returns 400 with structured error if invalid, preventing PostgreSQL 500 errors.
 *
 * @param {string} paramName - The route parameter name to validate (e.g., 'id', 'shareId')
 * @returns {Function} Express middleware
 *
 * @example
 *   router.get('/:id', authenticate, authorize('files:read'), validateUUID('id'), controller.getById);
 *   router.delete('/shares/:shareId', authenticate, authorize('files:write'), validateUUID('shareId'), controller.revokeShare);
 */
const validateUUID = (paramName) => (req, res, next) => {
  const value = req.params[paramName];

  if (!value || !UUID_REGEX.test(value)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID_FORMAT',
        message: `Invalid ${paramName} format. Expected a valid UUID.`
      }
    });
  }

  next();
};

module.exports = { validateUUID };
