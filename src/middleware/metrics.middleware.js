/**
 * Metrics Middleware - QAssure Platform
 * Records HTTP request metrics for Prometheus
 */
const { getPrometheusService } = require('../infrastructure/metrics/prometheus.service');

/**
 * Middleware to record HTTP request metrics
 */
const metricsMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  // Capture response finish
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationNs = Number(endTime - startTime);
    const durationSeconds = durationNs / 1e9;

    // Normalize route for metrics (replace IDs with :id)
    const route = normalizeRoute(req.route?.path || req.path);

    try {
      const prometheusService = getPrometheusService();
      prometheusService.recordHttpRequest(
        req.method,
        route,
        res.statusCode,
        durationSeconds
      );

      // Record errors
      if (res.statusCode >= 400) {
        prometheusService.recordError(
          res.statusCode >= 500 ? 'server_error' : 'client_error',
          res.statusCode.toString()
        );
      }
    } catch (err) {
      // Don't let metrics recording break the app
      console.error('[MetricsMiddleware] Error recording metrics:', err.message);
    }
  });

  next();
};

/**
 * Normalize route path by replacing UUIDs and numeric IDs
 */
function normalizeRoute(path) {
  if (!path) return 'unknown';
  
  return path
    // Replace UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Replace numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Clean up any double colons
    .replace(/:+/g, ':');
}

module.exports = { metricsMiddleware, normalizeRoute };
