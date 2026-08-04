/**
 * Event Service - QAssure Platform
 * Unified interface for publishing and consuming events
 */
const { getKafkaProducer } = require('./producer.service');
const { getKafkaConsumer } = require('./consumer.service');
const { 
  TOPICS, 
  EVENT_TYPES,
  AuthEvents, 
  UserEvents, 
  TenantEvents, 
  ModuleEvents, 
  ApiKeyEvents,
  SystemEvents 
} = require('./events');

class EventService {
  constructor() {
    this.producer = getKafkaProducer();
    this.consumer = getKafkaConsumer();
    this.initialized = false;
  }

  /**
   * Initialize the event service
   */
  async initialize() {
    if (this.initialized) return true;

    try {
      const connected = await this.producer.connect();
      if (connected) {
        this.initialized = true;
        console.log('[EventService] ✅ Initialized successfully');
      }
      return connected;
    } catch (error) {
      console.error('[EventService] ❌ Failed to initialize:', error.message);
      return false;
    }
  }

  /**
   * Shutdown the event service
   */
  async shutdown() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    this.initialized = false;
    console.log('[EventService] Shutdown complete');
  }

  // ==========================================
  // AUTH EVENTS
  // ==========================================

  async publishLoginSuccess(user, session, context = {}) {
    const event = AuthEvents.loginSuccess(user, session, context);
    return this.producer.publish(TOPICS.AUTH, event);
  }

  async publishLoginFailed(email, reason, context = {}) {
    const event = AuthEvents.loginFailed(email, reason, context);
    return this.producer.publish(TOPICS.AUTH, event);
  }

  async publishLogout(userId, sessionId, context = {}) {
    const event = AuthEvents.logout(userId, sessionId, context);
    return this.producer.publish(TOPICS.AUTH, event);
  }

  async publishLogoutAll(userId, sessionCount, context = {}) {
    const event = AuthEvents.logoutAll(userId, sessionCount, context);
    return this.producer.publish(TOPICS.AUTH, event);
  }

  async publishTokenRefresh(userId, sessionId, context = {}) {
    const event = AuthEvents.tokenRefresh(userId, sessionId, context);
    return this.producer.publish(TOPICS.AUTH, event);
  }

  async publishPasswordChanged(userId, context = {}) {
    const event = AuthEvents.passwordChanged(userId, context);
    return this.producer.publish(TOPICS.AUTH, event);
  }

  async publishPasswordResetRequested(email, context = {}) {
    const event = AuthEvents.passwordResetRequested(email, context);
    return this.producer.publish(TOPICS.AUTH, event);
  }

  async publishPasswordResetCompleted(userId, context = {}) {
    const event = AuthEvents.passwordResetCompleted(userId, context);
    return this.producer.publish(TOPICS.AUTH, event);
  }

  async publishSessionRevoked(userId, sessionId, reason, context = {}) {
    const event = AuthEvents.sessionRevoked(userId, sessionId, reason, context);
    return this.producer.publish(TOPICS.AUTH, event);
  }

  // ==========================================
  // USER EVENTS
  // ==========================================

  async publishUserCreated(user, context = {}) {
    const event = UserEvents.created(user, context);
    return this.producer.publish(TOPICS.USER, event);
  }

  async publishUserUpdated(user, changes, context = {}) {
    const event = UserEvents.updated(user, changes, context);
    return this.producer.publish(TOPICS.USER, event);
  }

  async publishUserDeleted(userId, context = {}) {
    const event = UserEvents.deleted(userId, context);
    return this.producer.publish(TOPICS.USER, event);
  }

  async publishUserActivated(userId, context = {}) {
    const event = UserEvents.activated(userId, context);
    return this.producer.publish(TOPICS.USER, event);
  }

  async publishUserDeactivated(userId, reason, context = {}) {
    const event = UserEvents.deactivated(userId, reason, context);
    return this.producer.publish(TOPICS.USER, event);
  }

  async publishEmailVerified(userId, email, context = {}) {
    const event = UserEvents.emailVerified(userId, email, context);
    return this.producer.publish(TOPICS.USER, event);
  }

  async publishRoleAssigned(userId, roleId, roleCode, context = {}) {
    const event = UserEvents.roleAssigned(userId, roleId, roleCode, context);
    return this.producer.publish(TOPICS.USER, event);
  }

  async publishRoleRemoved(userId, roleId, roleCode, context = {}) {
    const event = UserEvents.roleRemoved(userId, roleId, roleCode, context);
    return this.producer.publish(TOPICS.USER, event);
  }

  // ==========================================
  // TENANT EVENTS
  // ==========================================

  async publishTenantCreated(tenant, context = {}) {
    const event = TenantEvents.created(tenant, context);
    return this.producer.publish(TOPICS.TENANT, event);
  }

  async publishTenantUpdated(tenant, changes, context = {}) {
    const event = TenantEvents.updated(tenant, changes, context);
    return this.producer.publish(TOPICS.TENANT, event);
  }

  async publishTenantSuspended(tenantId, reason, context = {}) {
    const event = TenantEvents.suspended(tenantId, reason, context);
    return this.producer.publish(TOPICS.TENANT, event);
  }

  // ==========================================
  // MODULE EVENTS
  // ==========================================

  async publishModuleRegistered(module, context = {}) {
    const event = ModuleEvents.registered(module, context);
    return this.producer.publish(TOPICS.MODULE, event);
  }

  async publishModuleStatusChanged(module, previousStatus, newStatus, reason, context = {}) {
    const event = ModuleEvents.statusChanged(module, previousStatus, newStatus, reason, context);
    return this.producer.publish(TOPICS.MODULE, event);
  }

  async publishModuleStarted(module, context = {}) {
    const event = ModuleEvents.started(module, context);
    return this.producer.publish(TOPICS.MODULE, event);
  }

  async publishModuleStopped(module, reason, context = {}) {
    const event = ModuleEvents.stopped(module, reason, context);
    return this.producer.publish(TOPICS.MODULE, event);
  }

  async publishModuleFailed(module, error, context = {}) {
    const event = ModuleEvents.failed(module, error, context);
    return this.producer.publish(TOPICS.MODULE, event);
  }

  async publishModuleHealthCheckPassed(module, responseTime, context = {}) {
    const event = ModuleEvents.healthCheckPassed(module, responseTime, context);
    return this.producer.publish(TOPICS.MODULE, event);
  }

  async publishModuleHealthCheckFailed(module, error, context = {}) {
    const event = ModuleEvents.healthCheckFailed(module, error, context);
    return this.producer.publish(TOPICS.MODULE, event);
  }

  async publishModuleVersionUpdated(module, previousVersion, newVersion, context = {}) {
    const event = ModuleEvents.versionUpdated(module, previousVersion, newVersion, context);
    return this.producer.publish(TOPICS.MODULE, event);
  }

  // ==========================================
  // API KEY EVENTS
  // ==========================================

  async publishApiKeyCreated(apiKey, context = {}) {
    const event = ApiKeyEvents.created(apiKey, context);
    return this.producer.publish(TOPICS.API_KEY, event);
  }

  async publishApiKeyRevoked(apiKeyId, reason, context = {}) {
    const event = ApiKeyEvents.revoked(apiKeyId, reason, context);
    return this.producer.publish(TOPICS.API_KEY, event);
  }

  async publishApiKeyUsed(apiKey, endpoint, context = {}) {
    const event = ApiKeyEvents.used(apiKey, endpoint, context);
    return this.producer.publish(TOPICS.API_KEY, event);
  }

  // ==========================================
  // SYSTEM EVENTS
  // ==========================================

  async publishSystemStartup(info) {
    const event = SystemEvents.startup(info);
    return this.producer.publish(TOPICS.SYSTEM, event);
  }

  async publishSystemShutdown(reason) {
    const event = SystemEvents.shutdown(reason);
    return this.producer.publish(TOPICS.SYSTEM, event);
  }

  async publishSystemError(error, context = {}) {
    const event = SystemEvents.error(error, context);
    return this.producer.publish(TOPICS.SYSTEM, event);
  }

  // ==========================================
  // CONSUMER METHODS
  // ==========================================

  async subscribeToAuthEvents(handler) {
    await this.consumer.connect();
    await this.consumer.subscribe(TOPICS.AUTH, handler);
  }

  async subscribeToUserEvents(handler) {
    await this.consumer.connect();
    await this.consumer.subscribe(TOPICS.USER, handler);
  }

  async subscribeToModuleEvents(handler) {
    await this.consumer.connect();
    await this.consumer.subscribe(TOPICS.MODULE, handler);
  }

  async subscribeToAllEvents(handlers = {}) {
    await this.consumer.connect();
    
    if (handlers.auth) await this.consumer.subscribe(TOPICS.AUTH, handlers.auth);
    if (handlers.user) await this.consumer.subscribe(TOPICS.USER, handlers.user);
    if (handlers.tenant) await this.consumer.subscribe(TOPICS.TENANT, handlers.tenant);
    if (handlers.module) await this.consumer.subscribe(TOPICS.MODULE, handlers.module);
    if (handlers.apiKey) await this.consumer.subscribe(TOPICS.API_KEY, handlers.apiKey);
    if (handlers.system) await this.consumer.subscribe(TOPICS.SYSTEM, handlers.system);
    
    await this.consumer.startConsuming();
  }

  // ==========================================
  // HEALTH CHECK
  // ==========================================

  async healthCheck() {
    const producerHealth = await this.producer.healthCheck();
    const consumerHealth = await this.consumer.healthCheck();
    
    return {
      producer: producerHealth,
      consumer: consumerHealth,
      status: producerHealth.connected ? 'healthy' : 'degraded'
    };
  }
}

// Singleton
let instance = null;
const getEventService = () => {
  if (!instance) {
    instance = new EventService();
  }
  return instance;
};

module.exports = { 
  EventService, 
  getEventService,
  TOPICS,
  EVENT_TYPES
};
