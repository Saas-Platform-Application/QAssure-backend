/**
 * Correlation ID Middleware - QAssure Platform
 * Adds unique request ID for distributed tracing
 */
const crypto = require('crypto');

/**
 * Generate or extract correlation ID for each request
 */
const correlationId = (req, res, next) => {
  // Check for existing correlation ID in headers
  const existingId = req.headers['x-correlation-id'] || 
                     req.headers['x-request-id'] ||
                     req.headers['traceparent'];

  // Generate new ID if not provided
  const correlationId = existingId || generateCorrelationId();

  // Attach to request object
  req.correlationId = correlationId;
  req.requestStartTime = Date.now();

  // Add to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', correlationId);

  // Log request start
  if (process.env.LOG_REQUESTS === 'true') {
    console.log(JSON.stringify({
      type: 'request_start',
      correlationId,
      method: req.method,
      path: req.path,
      query: req.query,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
      timestamp: new Date().toISOString()
    }));
  }

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - req.requestStartTime;

    if (process.env.LOG_REQUESTS === 'true') {
      console.log(JSON.stringify({
        type: 'request_end',
        correlationId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }));
    }
  });

  next();
};

/**
 * Generate a unique correlation ID
 * Format: timestamp-random (e.g., 1703423456789-a1b2c3d4)
 */
function generateCorrelationId() {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${timestamp}-${random}`;
}

/**
 * Get correlation ID from request (for use in services)
 */
const getCorrelationId = (req) => {
  return req?.correlationId || 'unknown';
};

/**
 * Create a child logger with correlation ID
 */
const createCorrelatedLogger = (req, baseLogger) => {
  const correlationId = getCorrelationId(req);
  
  return {
    info: (message, meta = {}) => {
      baseLogger.info(message, { ...meta, correlationId });
    },
    warn: (message, meta = {}) => {
      baseLogger.warn(message, { ...meta, correlationId });
    },
    error: (message, meta = {}) => {
      baseLogger.error(message, { ...meta, correlationId });
    },
    debug: (message, meta = {}) => {
      baseLogger.debug(message, { ...meta, correlationId });
    }
  };
};

module.exports = {
  correlationId,
  getCorrelationId,
  generateCorrelationId,
  createCorrelatedLogger
};
