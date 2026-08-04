/**
 * Kafka Event Types & Schemas - QAssure Platform
 * Defines all event types and their structures
 */

// ==========================================
// TOPIC NAMES
// ==========================================
const TOPICS = {
  // Authentication events
  AUTH: 'qassure.auth.events',
  
  // User events
  USER: 'qassure.user.events',
  
  // Tenant events
  TENANT: 'qassure.tenant.events',
  
  // Module events
  MODULE: 'qassure.module.events',
  
  // API Key events
  API_KEY: 'qassure.apikey.events',
  
  // Audit events
  AUDIT: 'qassure.audit.events',
  
  // System events
  SYSTEM: 'qassure.system.events',
  
  // AI Gateway events (future)
  AI_GATEWAY: 'qassure.ai.events',
  
  // QMS Integration events (future)
  QMS_SYNC: 'qassure.qms.events'
};

// ==========================================
// EVENT TYPES
// ==========================================
const EVENT_TYPES = {
  // Auth events
  AUTH: {
    LOGIN_SUCCESS: 'auth.login.success',
    LOGIN_FAILED: 'auth.login.failed',
    LOGOUT: 'auth.logout',
    LOGOUT_ALL: 'auth.logout.all',
    TOKEN_REFRESH: 'auth.token.refresh',
    PASSWORD_CHANGED: 'auth.password.changed',
    PASSWORD_RESET_REQUESTED: 'auth.password.reset.requested',
    PASSWORD_RESET_COMPLETED: 'auth.password.reset.completed',
    SESSION_REVOKED: 'auth.session.revoked',
    MFA_ENABLED: 'auth.mfa.enabled',
    MFA_DISABLED: 'auth.mfa.disabled'
  },
  
  // User events
  USER: {
    CREATED: 'user.created',
    UPDATED: 'user.updated',
    DELETED: 'user.deleted',
    ACTIVATED: 'user.activated',
    DEACTIVATED: 'user.deactivated',
    EMAIL_VERIFIED: 'user.email.verified',
    ROLE_ASSIGNED: 'user.role.assigned',
    ROLE_REMOVED: 'user.role.removed',
    TENANT_JOINED: 'user.tenant.joined',
    TENANT_LEFT: 'user.tenant.left'
  },
  
  // Tenant events
  TENANT: {
    CREATED: 'tenant.created',
    UPDATED: 'tenant.updated',
    DELETED: 'tenant.deleted',
    ACTIVATED: 'tenant.activated',
    SUSPENDED: 'tenant.suspended',
    SETTINGS_UPDATED: 'tenant.settings.updated'
  },
  
  // Module events
  MODULE: {
    REGISTERED: 'module.registered',
    UPDATED: 'module.updated',
    DELETED: 'module.deleted',
    STATUS_CHANGED: 'module.status.changed',
    STARTED: 'module.started',
    STOPPED: 'module.stopped',
    FAILED: 'module.failed',
    HEALTH_CHECK_PASSED: 'module.health.passed',
    HEALTH_CHECK_FAILED: 'module.health.failed',
    VERSION_UPDATED: 'module.version.updated',
    DEPRECATED: 'module.deprecated'
  },
  
  // API Key events
  API_KEY: {
    CREATED: 'apikey.created',
    UPDATED: 'apikey.updated',
    REVOKED: 'apikey.revoked',
    DELETED: 'apikey.deleted',
    USED: 'apikey.used',
    REGENERATED: 'apikey.regenerated'
  },
  
  // System events
  SYSTEM: {
    STARTUP: 'system.startup',
    SHUTDOWN: 'system.shutdown',
    ERROR: 'system.error',
    WARNING: 'system.warning',
    MAINTENANCE_STARTED: 'system.maintenance.started',
    MAINTENANCE_ENDED: 'system.maintenance.ended'
  }
};

// ==========================================
// EVENT BUILDERS
// ==========================================

/**
 * Base event structure
 */
const createBaseEvent = (type, data, context = {}) => ({
  id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type,
  timestamp: new Date().toISOString(),
  version: '1.0',
  source: 'qassure-api',
  correlationId: context.correlationId || null,
  tenantId: context.tenantId || null,
  userId: context.userId || null,
  data
});

/**
 * Auth event builders
 */
const AuthEvents = {
  loginSuccess: (user, session, context) => createBaseEvent(
    EVENT_TYPES.AUTH.LOGIN_SUCCESS,
    {
      userId: user.id,
      email: user.email,
      sessionId: session.id,
      loginMethod: user.auth_provider || 'local',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    },
    context
  ),

  loginFailed: (email, reason, context) => createBaseEvent(
    EVENT_TYPES.AUTH.LOGIN_FAILED,
    {
      email,
      reason,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    },
    context
  ),

  logout: (userId, sessionId, context) => createBaseEvent(
    EVENT_TYPES.AUTH.LOGOUT,
    { userId, sessionId },
    context
  ),

  logoutAll: (userId, sessionCount, context) => createBaseEvent(
    EVENT_TYPES.AUTH.LOGOUT_ALL,
    { userId, sessionCount },
    context
  ),

  tokenRefresh: (userId, sessionId, context) => createBaseEvent(
    EVENT_TYPES.AUTH.TOKEN_REFRESH,
    { userId, sessionId },
    context
  ),

  passwordChanged: (userId, context) => createBaseEvent(
    EVENT_TYPES.AUTH.PASSWORD_CHANGED,
    { userId },
    context
  ),

  passwordResetRequested: (email, context) => createBaseEvent(
    EVENT_TYPES.AUTH.PASSWORD_RESET_REQUESTED,
    { email },
    context
  ),

  passwordResetCompleted: (userId, context) => createBaseEvent(
    EVENT_TYPES.AUTH.PASSWORD_RESET_COMPLETED,
    { userId },
    context
  ),

  sessionRevoked: (userId, sessionId, reason, context) => createBaseEvent(
    EVENT_TYPES.AUTH.SESSION_REVOKED,
    { userId, sessionId, reason },
    context
  )
};

/**
 * User event builders
 */
const UserEvents = {
  created: (user, context) => createBaseEvent(
    EVENT_TYPES.USER.CREATED,
    {
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      status: user.status
    },
    context
  ),

  updated: (user, changes, context) => createBaseEvent(
    EVENT_TYPES.USER.UPDATED,
    {
      userId: user.id,
      changes: Object.keys(changes)
    },
    context
  ),

  deleted: (userId, context) => createBaseEvent(
    EVENT_TYPES.USER.DELETED,
    { userId },
    context
  ),

  activated: (userId, context) => createBaseEvent(
    EVENT_TYPES.USER.ACTIVATED,
    { userId },
    context
  ),

  deactivated: (userId, reason, context) => createBaseEvent(
    EVENT_TYPES.USER.DEACTIVATED,
    { userId, reason },
    context
  ),

  emailVerified: (userId, email, context) => createBaseEvent(
    EVENT_TYPES.USER.EMAIL_VERIFIED,
    { userId, email },
    context
  ),

  roleAssigned: (userId, roleId, roleCode, context) => createBaseEvent(
    EVENT_TYPES.USER.ROLE_ASSIGNED,
    { userId, roleId, roleCode },
    context
  ),

  roleRemoved: (userId, roleId, roleCode, context) => createBaseEvent(
    EVENT_TYPES.USER.ROLE_REMOVED,
    { userId, roleId, roleCode },
    context
  )
};

/**
 * Tenant event builders
 */
const TenantEvents = {
  created: (tenant, context) => createBaseEvent(
    EVENT_TYPES.TENANT.CREATED,
    {
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug
    },
    context
  ),

  updated: (tenant, changes, context) => createBaseEvent(
    EVENT_TYPES.TENANT.UPDATED,
    {
      tenantId: tenant.id,
      changes: Object.keys(changes)
    },
    context
  ),

  suspended: (tenantId, reason, context) => createBaseEvent(
    EVENT_TYPES.TENANT.SUSPENDED,
    { tenantId, reason },
    context
  )
};

/**
 * Module event builders
 */
const ModuleEvents = {
  registered: (module, context) => createBaseEvent(
    EVENT_TYPES.MODULE.REGISTERED,
    {
      moduleId: module.id,
      moduleCode: module.module_id,
      name: module.name,
      version: module.version
    },
    context
  ),

  statusChanged: (module, previousStatus, newStatus, reason, context) => createBaseEvent(
    EVENT_TYPES.MODULE.STATUS_CHANGED,
    {
      moduleId: module.id,
      moduleCode: module.module_id,
      previousStatus,
      newStatus,
      reason
    },
    context
  ),

  started: (module, context) => createBaseEvent(
    EVENT_TYPES.MODULE.STARTED,
    {
      moduleId: module.id,
      moduleCode: module.module_id,
      version: module.version
    },
    context
  ),

  stopped: (module, reason, context) => createBaseEvent(
    EVENT_TYPES.MODULE.STOPPED,
    {
      moduleId: module.id,
      moduleCode: module.module_id,
      reason
    },
    context
  ),

  failed: (module, error, context) => createBaseEvent(
    EVENT_TYPES.MODULE.FAILED,
    {
      moduleId: module.id,
      moduleCode: module.module_id,
      error: error.message || error
    },
    context
  ),

  healthCheckPassed: (module, responseTime, context) => createBaseEvent(
    EVENT_TYPES.MODULE.HEALTH_CHECK_PASSED,
    {
      moduleId: module.id,
      moduleCode: module.module_id,
      responseTime
    },
    context
  ),

  healthCheckFailed: (module, error, context) => createBaseEvent(
    EVENT_TYPES.MODULE.HEALTH_CHECK_FAILED,
    {
      moduleId: module.id,
      moduleCode: module.module_id,
      error
    },
    context
  ),

  versionUpdated: (module, previousVersion, newVersion, context) => createBaseEvent(
    EVENT_TYPES.MODULE.VERSION_UPDATED,
    {
      moduleId: module.id,
      moduleCode: module.module_id,
      previousVersion,
      newVersion
    },
    context
  )
};

/**
 * API Key event builders
 */
const ApiKeyEvents = {
  created: (apiKey, context) => createBaseEvent(
    EVENT_TYPES.API_KEY.CREATED,
    {
      apiKeyId: apiKey.id,
      name: apiKey.name,
      expiresAt: apiKey.expires_at
    },
    context
  ),

  revoked: (apiKeyId, reason, context) => createBaseEvent(
    EVENT_TYPES.API_KEY.REVOKED,
    { apiKeyId, reason },
    context
  ),

  used: (apiKey, endpoint, context) => createBaseEvent(
    EVENT_TYPES.API_KEY.USED,
    {
      apiKeyId: apiKey.id,
      endpoint,
      timestamp: new Date().toISOString()
    },
    context
  )
};

/**
 * System event builders
 */
const SystemEvents = {
  startup: (info) => createBaseEvent(
    EVENT_TYPES.SYSTEM.STARTUP,
    {
      version: info.version,
      environment: info.environment,
      startTime: new Date().toISOString()
    },
    {}
  ),

  shutdown: (reason) => createBaseEvent(
    EVENT_TYPES.SYSTEM.SHUTDOWN,
    {
      reason,
      shutdownTime: new Date().toISOString()
    },
    {}
  ),

  error: (error, context) => createBaseEvent(
    EVENT_TYPES.SYSTEM.ERROR,
    {
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    context
  )
};

module.exports = {
  TOPICS,
  EVENT_TYPES,
  createBaseEvent,
  AuthEvents,
  UserEvents,
  TenantEvents,
  ModuleEvents,
  ApiKeyEvents,
  SystemEvents
};
