/**
 * Routes Index - QAssure Platform
 * Central route registration for all modules
 */
const express = require('express');
const router = express.Router();
const redisService = require('../infrastructure/cache/redis.service');
const database = require('../config/database');
const { getPrometheusService } = require('../infrastructure/metrics/prometheus.service');

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user_routes');
const tenantRoutes = require('./tenant_routes');
const roleRoutes = require('./role_routes');
const permissionRoutes = require('./permission_routes');
const userRoleRoutes = require('./user_role_routes');
const userTenantRoutes = require('./user_tenant_routes');
const sessionRoutes = require('./session_routes');
const apiKeyRoutes = require('./api_key_routes');
const apiKeyPermissionRoutes = require('./api_key_permission_routes');
const moduleRoutes = require('./module_routes');
const auditLogRoutes = require('./audit_log_routes');
const eventLogRoutes = require('./event_log_routes');
const healthCheckRoutes = require('./health_check_routes');
const healthHistoryRoutes = require('./health_history_routes');
const qmsConnectionRoutes = require('./qms_connection_routes');
const qmsSyncJobRoutes = require('./qms_sync_job_routes');
const qmsSyncConflictRoutes = require('./qms_sync_conflict_routes');
const qmsEntityMappingRoutes = require('./qms_entity_mapping_routes');
const aiRoutes = require('./ai.routes');
const knowledgeRoutes = require('./knowledge.routes');
const promptRoutes = require('./prompt.routes');
const qmsRoutes = require('./qms.routes');

// Phase 13: Security & FDA Part 11
const electronicSignatureRoutes = require('./electronic-signature.routes');
const securityRoutes = require('./security.routes');
const workflowRoutes = require('./workflow.routes');
const projectRoutes = require('./project.routes');
const documentRoutes = require('./document.routes');
const trainingRoutes = require('./training.routes');
const capaRoutes = require('./capa.routes');
const supplierRoutes = require('./supplier.routes');
const reportingRoutes = require('./reporting.routes');
const notificationRoutes = require('./notification.routes');
const fileAttachmentRoutes = require('./file-attachment.routes');
const systemConfigRoutes = require('./system-config.routes');
const smtpConfigRoutes = require('./smtp_config.routes');
const storageBucketRoutes = require('./tenant-storage-bucket.routes');

const departmentRoutes = require('./department.routes');
const designationRoutes = require('./designation.routes');
const userCategoryRoutes = require('./user_category.routes'); 
const auditLogResourceTypeRoutes = require('./audit_log_resource_type_routes');

// Platform Service Governance
const platformServiceRoutes = require('./platform-services.routes');


// Basic health check (no auth)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Detailed health check (no auth)
router.get('/health/detailed', async (req, res) => {
  const health = {
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    services: {}
  };

  // Check PostgreSQL
  try {
    const start = Date.now();
    await database.query('SELECT 1');
    health.services.postgres = {
      status: 'healthy',
      latency: `${Date.now() - start}ms`
    };
  } catch (err) {
    health.services.postgres = {
      status: 'unhealthy',
      error: err.message
    };
    health.status = 'degraded';
  }

  // Check Redis
  try {
    const redisHealth = await redisService.healthCheck();
    health.services.redis = redisHealth;
    if (redisHealth.status !== 'healthy') {
      health.status = 'degraded';
    }
  } catch (err) {
    health.services.redis = {
      status: 'unhealthy',
      error: err.message
    };
    health.status = 'degraded';
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  health.memory = {
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Prometheus metrics endpoint (no auth - typically secured at infrastructure level)
router.get('/metrics', async (req, res) => {
  try {
    const prometheusService = getPrometheusService();
    const metrics = await prometheusService.getMetrics();
    res.set('Content-Type', prometheusService.getContentType());
    res.send(metrics);
  } catch (err) {
    console.error('[Metrics] Error getting metrics:', err);
    res.status(500).send('Error collecting metrics');
  }
});

// ==================== Route Registration ====================
// Auth (public + protected)
router.use('/auth', authRoutes);

// IAM Routes
router.use('/users', userRoutes);
router.use('/tenants', tenantRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/user-roles', userRoleRoutes);
router.use('/user-tenants', userTenantRoutes);
router.use('/sessions', sessionRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/api-key-permissions', apiKeyPermissionRoutes);//till here code optimization with test done

// Platform Service Governance (must be registered before tenant-scoped service routes)
router.use('/platform-services', platformServiceRoutes);

// Phase 13: Security & FDA Part 11 Compliance
router.use('/electronic-signatures', electronicSignatureRoutes);//done with test
router.use('/security', securityRoutes);//only password policy done with test

// Phase 14: Workflow Engine
router.use('/workflows', workflowRoutes);//done with test

// Phase 23: Project Management
router.use('/projects', projectRoutes);

// Phase 15: Document Management
router.use('/documents', documentRoutes);

// Phase 16: Training Management
router.use('/training', trainingRoutes);

// Phase 17: CAPA Management
router.use('/capas', capaRoutes);

// Phase 18: Supplier Quality Management
router.use('/suppliers', supplierRoutes);

// Phase 19: Reporting & Analytics
router.use('/reporting', reportingRoutes);

// Phase 20: Notifications
router.use('/notifications', notificationRoutes);

// Phase 21: File Attachments
router.use('/files', fileAttachmentRoutes);

// Storage Bucket Configuration (tenant-wise cloud storage management)
router.use('/storage-buckets', storageBucketRoutes);

router.use('/departments', departmentRoutes);
router.use('/designations', designationRoutes);
router.use('/user-categories', userCategoryRoutes); 

// Phase 22: System Configuration
router.use('/config', systemConfigRoutes);
router.use('/smtp-config', smtpConfigRoutes);
const failedEmailsRoutes = require('./failed-emails.routes');
router.use('/failed-emails', failedEmailsRoutes);

// Phase 17: CAPA Management

// Module Management
router.use('/modules', moduleRoutes);//done with test
router.use('/audit-logs', auditLogRoutes);//done with test
router.use('/event-logs', eventLogRoutes);//done with test
router.use('/audit-log-resource-types', auditLogResourceTypeRoutes);

// Health & Monitoring
router.use('/health-checks', healthCheckRoutes);
router.use('/health-history', healthHistoryRoutes);

// QMS Integration
router.use('/qms/connections', qmsConnectionRoutes);
router.use('/qms/sync-jobs', qmsSyncJobRoutes);
router.use('/qms/sync-conflicts', qmsSyncConflictRoutes);
router.use('/qms/entity-mappings', qmsEntityMappingRoutes);

// AI Gateway
router.use('/ai', aiRoutes);
router.use('/ai/knowledge', knowledgeRoutes);
router.use('/ai/prompts', promptRoutes);
const aiConfigRoutes = require('./ai-config.routes');
router.use('/ai/config', aiConfigRoutes); 
router.use('/qms', qmsRoutes);



// API info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'QAssure Platform API',
    version: 'v1',
    modules: {
      auth: '/api/v1/auth',
      iam: {
        users: '/api/v1/users',
        tenants: '/api/v1/tenants',
        roles: '/api/v1/roles',
        permissions: '/api/v1/permissions'
      },
      qms: '/api/v1/qms/*',
      ai: '/api/v1/ai/*',
      health: '/api/v1/health',
      metrics: '/api/v1/metrics'
    }
  });
});


// Phase 24: License & Billing Routes
const licenseRoutes = require('./license.routes');
const billingRoutes = require('./billing.routes');
const webhookRoutes = require('./webhook.routes');
router.use('/licenses', licenseRoutes);//done with test
router.use('/billing', billingRoutes);//done with test
router.use('/webhooks', webhookRoutes);

// Dashboard Routes (Super Admin Only)
const dashboardRoutes = require('./dashboard.routes');
router.use('/dashboard', dashboardRoutes);

module.exports = router;
