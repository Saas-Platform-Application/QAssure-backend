/**
 * Prometheus Metrics Service - QAssure Platform
 * Exposes application metrics for monitoring
 */
const promClient = require('prom-client');

class PrometheusService {
  constructor() {
    // Create a Registry
    this.register = new promClient.Registry();
    
    // Add default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({
      register: this.register,
      prefix: 'qassure_'
    });

    // Initialize custom metrics
    this._initializeMetrics();
  }

  _initializeMetrics() {
    // HTTP Request metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: 'qassure_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register]
    });

    this.httpRequestTotal = new promClient.Counter({
      name: 'qassure_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register]
    });

    // Authentication metrics
    this.authAttempts = new promClient.Counter({
      name: 'qassure_auth_attempts_total',
      help: 'Total authentication attempts',
      labelNames: ['type', 'status'], // type: login, refresh, api_key; status: success, failure
      registers: [this.register]
    });

    this.activeSessions = new promClient.Gauge({
      name: 'qassure_active_sessions',
      help: 'Number of active sessions',
      labelNames: ['tenant_id'],
      registers: [this.register]
    });

    // API Key metrics
    this.apiKeyUsage = new promClient.Counter({
      name: 'qassure_api_key_usage_total',
      help: 'Total API key usage',
      labelNames: ['key_id', 'tenant_id'],
      registers: [this.register]
    });

    // Database metrics
    this.dbQueryDuration = new promClient.Histogram({
      name: 'qassure_db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.register]
    });

    this.dbConnectionPool = new promClient.Gauge({
      name: 'qassure_db_pool_size',
      help: 'Database connection pool size',
      labelNames: ['state'], // state: total, idle, waiting
      registers: [this.register]
    });

    // Redis metrics
    this.redisOperations = new promClient.Counter({
      name: 'qassure_redis_operations_total',
      help: 'Total Redis operations',
      labelNames: ['operation', 'status'],
      registers: [this.register]
    });

    this.cacheHitRate = new promClient.Counter({
      name: 'qassure_cache_hits_total',
      help: 'Cache hit/miss counter',
      labelNames: ['cache_type', 'result'], // result: hit, miss
      registers: [this.register]
    });

    // Business metrics
    this.tenantsActive = new promClient.Gauge({
      name: 'qassure_tenants_active',
      help: 'Number of active tenants',
      registers: [this.register]
    });

    this.usersTotal = new promClient.Gauge({
      name: 'qassure_users_total',
      help: 'Total number of users',
      labelNames: ['status'],
      registers: [this.register]
    });

    // AI Gateway metrics
    this.aiCompletions = new promClient.Counter({
      name: 'qassure_ai_completions_total',
      help: 'Total AI completion requests',
      labelNames: ['provider', 'model', 'status'],
      registers: [this.register]
    });

    this.aiTokensUsed = new promClient.Counter({
      name: 'qassure_ai_tokens_total',
      help: 'Total AI tokens used',
      labelNames: ['provider', 'model', 'type'], // type: input, output
      registers: [this.register]
    });

    this.aiLatency = new promClient.Histogram({
      name: 'qassure_ai_latency_seconds',
      help: 'AI completion latency in seconds',
      labelNames: ['provider', 'model'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.register]
    });

    // QMS Integration metrics
    this.qmsSyncJobs = new promClient.Counter({
      name: 'qassure_qms_sync_jobs_total',
      help: 'Total QMS sync jobs',
      labelNames: ['connection_type', 'status'],
      registers: [this.register]
    });

    this.qmsSyncDuration = new promClient.Histogram({
      name: 'qassure_qms_sync_duration_seconds',
      help: 'QMS sync job duration in seconds',
      labelNames: ['connection_type'],
      buckets: [1, 5, 10, 30, 60, 300, 600],
      registers: [this.register]
    });

    // Error metrics
    this.errors = new promClient.Counter({
      name: 'qassure_errors_total',
      help: 'Total application errors',
      labelNames: ['type', 'code'],
      registers: [this.register]
    });
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics() {
    return await this.register.metrics();
  }

  /**
   * Get content type for metrics
   */
  getContentType() {
    return this.register.contentType;
  }

  // ==================== Recording Methods ====================

  /**
   * Record HTTP request
   */
  recordHttpRequest(method, route, statusCode, durationSeconds) {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      durationSeconds
    );
    this.httpRequestTotal.inc({ method, route, status_code: statusCode });
  }

  /**
   * Record authentication attempt
   */
  recordAuthAttempt(type, success) {
    this.authAttempts.inc({
      type,
      status: success ? 'success' : 'failure'
    });
  }

  /**
   * Record API key usage
   */
  recordApiKeyUsage(keyId, tenantId) {
    this.apiKeyUsage.inc({ key_id: keyId, tenant_id: tenantId });
  }

  /**
   * Record database query
   */
  recordDbQuery(operation, table, durationSeconds) {
    this.dbQueryDuration.observe({ operation, table }, durationSeconds);
  }

  /**
   * Record cache access
   */
  recordCacheAccess(cacheType, hit) {
    this.cacheHitRate.inc({
      cache_type: cacheType,
      result: hit ? 'hit' : 'miss'
    });
  }

  /**
   * Record AI completion
   */
  recordAiCompletion(provider, model, success, durationSeconds, inputTokens, outputTokens) {
    this.aiCompletions.inc({
      provider,
      model,
      status: success ? 'success' : 'failure'
    });

    if (success) {
      this.aiLatency.observe({ provider, model }, durationSeconds);
      this.aiTokensUsed.inc({ provider, model, type: 'input' }, inputTokens);
      this.aiTokensUsed.inc({ provider, model, type: 'output' }, outputTokens);
    }
  }

  /**
   * Record error
   */
  recordError(type, code) {
    this.errors.inc({ type, code });
  }

  /**
   * Update active sessions gauge
   */
  setActiveSessions(tenantId, count) {
    this.activeSessions.set({ tenant_id: tenantId }, count);
  }

  /**
   * Update pool stats
   */
  setDbPoolStats(total, idle, waiting) {
    this.dbConnectionPool.set({ state: 'total' }, total);
    this.dbConnectionPool.set({ state: 'idle' }, idle);
    this.dbConnectionPool.set({ state: 'waiting' }, waiting);
  }
}

// Singleton
let instance = null;
const getPrometheusService = () => {
  if (!instance) {
    instance = new PrometheusService();
  }
  return instance;
};

module.exports = { PrometheusService, getPrometheusService };
