/**
 * Error Formatter Utility
 * Provides consistent error response formatting across all controllers
 */

/**
 * Format error responses consistently with code and message
 * @param {Error} error - The error object
 * @param {string} defaultCode - Default error code if none can be determined
 * @returns {Object} Formatted error object with { code, message }
 */
const formatError = (error, defaultCode = 'INTERNAL_ERROR') => {
  // Handle AuthError instances (from auth.service.js)
  // AuthError already has code and message structure
  if (error.constructor && error.constructor.name === 'AuthError' && error.code && error.message) {
    return {
      code: error.code,
      message: error.message,
      ...(error.details && error.details)
    };
  }

  // If error already has code and message structure, use it
  if (error.code && error.message) {
    return { code: error.code, message: error.message };
  }

  // Map common error messages to error codes
  if (error.message && error.message.includes('not found')) {
    return { code: 'NOT_FOUND', message: error.message };
  }

  if (error.message && (error.message.includes('already exists') || error.name === 'SequelizeUniqueConstraintError')) {
    return { code: 'CONFLICT', message: error.message || 'Resource already exists' };
  }

  if (error.message && (error.message.includes('Validation error') ||
    error.message.includes('must be') ||
    error.name === 'SequelizeValidationError' ||
    error.name === 'ZodError')) {
    return { code: 'VALIDATION_ERROR', message: error.message || 'Validation failed' };
  }

  if (error.message && (error.message.includes('does not exist') || error.message.includes('constraint'))) {
    return { code: 'INVALID_INPUT', message: error.message };
  }

  if (error.message && (error.message.includes('belong to your tenant') || error.message.includes('assignee role') || error.message.includes('matching role'))) {
    return { code: 'FORBIDDEN', message: error.message };
  }

  return { code: defaultCode, message: error.message || 'An unexpected error occurred' };
};

/**
 * Get appropriate HTTP status code for error
 * @param {Object} errorResponse - Formatted error object with { code, message }
 * @returns {number} HTTP status code
 */
const getErrorStatusCode = (errorResponse) => {
  // Auth-specific status codes
  const authStatusMap = {
    'INVALID_CREDENTIALS': 401,
    'ACCOUNT_LOCKED': 423,
    'TOKEN_EXPIRED': 401,
    'INVALID_TOKEN': 401,
    'SESSION_EXPIRED': 401,
    'TOKEN_REUSED': 401,
    'USER_INACTIVE': 403,
    'EMAIL_NOT_VERIFIED': 401,
    'EMAIL_EXISTS': 400,
    'INVALID_TENANT': 400,
    'ALREADY_VERIFIED': 400,
    'USER_NOT_FOUND': 404,
    'TENANT_NOT_FOUND': 404,
    'TENANT_INACTIVE': 403,
    'INVALID_PASSWORD': 401,
    'WEAK_PASSWORD': 400,
    'PASSWORD_POLICY_VIOLATION': 400
  };

  // General status codes
  const statusMap = {
    'NOT_FOUND': 404,
    'VALIDATION_ERROR': 400,
    'INVALID_INPUT': 400,
    'INVALID_TRANSITION': 400,
    'CONFLICT': 409,
    'UNAUTHORIZED': 401,
    'FORBIDDEN': 403,
    'INTERNAL_ERROR': 500
  };

  // Check auth status map first, then general map
  return authStatusMap[errorResponse.code] || statusMap[errorResponse.code] || 500;
};

/**
 * Send formatted error response
 * @param {Object} res - Express response object
 * @param {Error} error - The error object
 * @param {Object} options - Additional options (details, statusCode override)
 */
const sendErrorResponse = (res, error, options = {}) => {
  const errorResponse = formatError(error, options.defaultCode);
  const statusCode = options.statusCode || getErrorStatusCode(errorResponse);

  const response = {
    success: false,
    error: errorResponse
  };

  // Add details if provided
  if (error.errors) {
    response.details = error.errors;
  }
  if (error.issues) {
    response.details = error.issues;
  }
  if (options.details) {
    response.details = options.details;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  formatError,
  getErrorStatusCode,
  sendErrorResponse
};
