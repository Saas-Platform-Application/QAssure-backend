/**
 * Audit Middleware - QAssure Platform
 * Layer 1: Automatic HTTP-level audit for every authenticated request
 * Fire-and-forget via setImmediate — zero latency impact on responses
 */
const { getAuditService } = require('../services/audit.service');

const SKIP_PATHS = ['/health', '/api/v1/health', '/api/v1/metrics', '/metrics'];

function resolveResourceType(path) {
  const cleaned = path.replace(/^\/api\/v\d+\//, '');
  const segment = cleaned.split('/')[0] || 'unknown';
  const map = {
    'auth': 'session', 'users': 'user', 'tenants': 'tenant',
    'roles': 'role', 'permissions': 'permission', 'user-roles': 'user_role',
    'user-tenants': 'user_tenant', 'sessions': 'session', 'api-keys': 'api_key',
    'api-key-permissions': 'api_key', 'modules': 'module', 'audit-logs': 'audit_log',
    'event-logs': 'event_log', 'documents': 'document', 'capas': 'capa',
    'training': 'training', 'suppliers': 'supplier', 'workflows': 'workflow',
    'projects': 'project', 'notifications': 'notification', 'files': 'file_attachment',
    'electronic-signatures': 'electronic_signature', 'security': 'security_policy',
    'reporting': 'report', 'billing': 'billing', 'licenses': 'license',
    'webhooks': 'webhook', 'departments': 'department', 'designations': 'designation',
    'user-categories': 'user_category', 'config': 'system_config', 'dashboard': 'dashboard',
    'health-checks': 'health_check', 'health-history': 'health_check',
    'qms': 'qms_connection', 'ai': 'ai_completion', 'knowledge': 'knowledge',
  };
  // Handle nested AI routes
  if (cleaned.startsWith('ai/knowledge')) return 'knowledge';
  if (cleaned.startsWith('ai/')) return 'ai_completion';
  return map[segment] || segment;
}

function resolveAction(method, path) {
  const lower = path.toLowerCase();
  if (lower.includes('/auth/login'))    return 'LOGIN';
  if (lower.includes('/auth/logout'))   return 'LOGOUT';
  if (lower.includes('/auth/register')) return 'CREATE';
  if (lower.includes('/auth/refresh'))  return 'UPDATE';
  if (lower.includes('/auth/change-password')) return 'UPDATE'; 
  if (lower.includes('/auth/password')) return 'UPDATE';
  if (lower.includes('/auth/forgot'))   return 'UPDATE';
  if (lower.includes('/auth/reset'))    return 'UPDATE';
  if (lower.includes('/submit'))        return 'SUBMIT';
  if (lower.includes('/approve'))       return 'APPROVE';
  if (lower.includes('/reject'))        return 'REJECT';
  if (lower.includes('/effective'))     return 'PUBLISH';
  if (lower.includes('/obsolete'))      return 'ARCHIVE';
  if (lower.includes('/checkout'))      return 'CHECKOUT';
  if (lower.includes('/checkin'))       return 'CHECKIN';
  if (lower.includes('/transition'))    return 'UPDATE';
  if (lower.includes('/cancel'))        return 'UPDATE';
  if (lower.includes('/complete'))      return 'UPDATE';
  if (lower.includes('/activate'))      return 'UPDATE';
  if (lower.includes('/revoke'))        return 'DELETE';
  if (lower.includes('/status'))        return 'UPDATE';
  if (lower.includes('/void'))          return 'DELETE';
  if (lower.includes('/send'))          return 'UPDATE';
  switch (method) {
    case 'GET':    return 'READ';
    case 'POST':   return 'CREATE';
    case 'PUT':    return 'UPDATE';
    case 'PATCH':  return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default:       return 'API_CALL';
  }
}

function resolveResourceId(req) {
  return req.params?.id || req.params?.logId || req.params?.eventId ||
    req.params?.documentId || req.params?.capaId || req.params?.workflowId ||
    req.params?.projectId || req.params?.supplierId || req.params?.courseId ||
    req.params?.assignmentId || req.params?.fileId || req.params?.licenseId ||
    req.params?.invoiceId || req.params?.collectionId || null;
}

const auditMiddleware = (req, res, next) => {
  if (SKIP_PATHS.some(p => req.originalUrl.startsWith(p))) return next();
  
  // Skip automatic auditing for direct log insertion endpoints to prevent recursion
  if (req.method === 'POST' && (req.originalUrl.includes('/audit-logs') || req.originalUrl.includes('/event-logs'))) {
    return next();
  }

  const originalJson = res.json.bind(res);
  let capturedBody = null;
  res.json = function (body) { capturedBody = body; return originalJson(body); };

  res.on('finish', () => {
    if (!req.user) return;
    setImmediate(async () => {
      try {
        await getAuditService().log({
          action:          resolveAction(req.method, req.originalUrl),
          user_id:         req.user?.id || null,
          tenant_id:       req.tenantId || req.user?.tenantId || null,
          resource_type:   resolveResourceType(req.originalUrl),
          resource_id:     resolveResourceId(req),
          module_id:       req.module?.id || null, // Top-level module_id
          request_method:  req.method,
          request_path:    req.originalUrl,
          request_body:    req.method !== 'GET' ? req.body : null,
          response_status: res.statusCode,
          response_body:   res.statusCode >= 400 ? capturedBody : null,
          ip_address:      req.ip || req.connection?.remoteAddress || null,
          user_agent:      req.headers?.['user-agent'] || null,
          correlation_id:  req.correlationId || null,
          metadata: {
            is_super_admin:  req.user?.isSuperAdmin || false,
            is_api_key_auth: req.user?.isApiKey || false,
            module_context:  req.module?.code || null,
            module_id:       req.module?.id || null,
            roles:           req.user?.roles || null
          }
        });
      } catch (err) {
        console.error('[AuditMiddleware] Failed:', err.message);
      }
    });
  });

  next();
};

module.exports = { auditMiddleware };
