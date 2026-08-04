/**
 * QAssure Platform JavaScript SDK - Full Implementation
 * @version 1.0.0
 */

const axios = require('axios');
const WebSocket = require('ws');

// ==================== Exceptions ====================

class QAssureError extends Error {
  constructor(message, statusCode = null, response = null) {
    super(message);
    this.name = 'QAssureError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

class AuthenticationError extends QAssureError {
  constructor(message, statusCode, response) {
    super(message, statusCode, response);
    this.name = 'AuthenticationError';
  }
}

class NotFoundError extends QAssureError {
  constructor(message, statusCode, response) {
    super(message, statusCode, response);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends QAssureError {
  constructor(message, statusCode, response) {
    super(message, statusCode, response);
    this.name = 'ValidationError';
  }
}

class InvalidStateTransitionError extends ValidationError {
  constructor(message, statusCode, response) {
    super(message, statusCode, response);
    this.name = 'InvalidStateTransitionError';
  }
}

// ==================== Base Resource ====================

class BaseResource {
  constructor(client) {
    this.client = client;
  }
}

// ==================== Auth Resource ====================

class AuthResource extends BaseResource {
  async login(email, password) {
    const response = await this.client.post('/auth/login', { email, password });
    if (response.success) {
      this.client._accessToken = response.data.access_token;
      this.client._refreshToken = response.data.refresh_token;
    }
    return response;
  }

  async logout() {
    const response = await this.client.post('/auth/logout');
    this.client._accessToken = null;
    this.client._refreshToken = null;
    return response;
  }

  async logoutAll() {
    const response = await this.client.post('/auth/logout-all');
    this.client._accessToken = null;
    this.client._refreshToken = null;
    return response;
  }

  async refresh() {
    const response = await this.client.post('/auth/refresh', {
      refresh_token: this.client._refreshToken
    });
    if (response.success) {
      this.client._accessToken = response.data.access_token;
    }
    return response;
  }

  async me() {
    return this.client.get('/auth/me');
  }

  async changePassword(currentPassword, newPassword) {
    return this.client.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
  }

  async forgotPassword(email) {
    return this.client.post('/auth/forgot-password', { email });
  }

  async resetPassword(token, newPassword) {
    return this.client.post('/auth/reset-password', {
      token,
      new_password: newPassword
    });
  }
}

// ==================== User Resource ====================

class UserResource extends BaseResource {
  async list(params = {}) {
    return this.client.get('/users', params);
  }

  async get(userId) {
    return this.client.get(`/users/${userId}`);
  }

  async create(data) {
    return this.client.post('/users', data);
  }

  async update(userId, data) {
    return this.client.put(`/users/${userId}`, data);
  }

  async delete(userId) {
    return this.client.delete(`/users/${userId}`);
  }

  async activate(userId) {
    return this.client.post(`/users/${userId}/activate`);
  }

  async deactivate(userId) {
    return this.client.post(`/users/${userId}/deactivate`);
  }

  async assignRole(userId, roleId) {
    return this.client.post(`/users/${userId}/roles`, { role_id: roleId });
  }

  async removeRole(userId, roleId) {
    return this.client.delete(`/users/${userId}/roles/${roleId}`);
  }
}

// ==================== Tenant Resource ====================

class TenantResource extends BaseResource {
  async list(params = {}) {
    return this.client.get('/tenants', params);
  }

  async get(tenantId) {
    return this.client.get(`/tenants/${tenantId}`);
  }

  async create(data) {
    return this.client.post('/tenants', data);
  }

  async update(tenantId, data) {
    return this.client.put(`/tenants/${tenantId}`, data);
  }

  async delete(tenantId) {
    return this.client.delete(`/tenants/${tenantId}`);
  }
}

// ==================== Role Resource ====================

class RoleResource extends BaseResource {
  async list(params = {}) {
    return this.client.get('/roles', params);
  }

  async get(roleId) {
    return this.client.get(`/roles/${roleId}`);
  }

  async create(data) {
    return this.client.post('/roles', data);
  }

  async update(roleId, data) {
    return this.client.put(`/roles/${roleId}`, data);
  }

  async delete(roleId) {
    return this.client.delete(`/roles/${roleId}`);
  }

  async assignPermissions(roleId, permissionIds) {
    return this.client.post(`/roles/${roleId}/permissions`, { permission_ids: permissionIds });
  }
}

// ==================== Permission Resource ====================

class PermissionResource extends BaseResource {
  async list() {
    return this.client.get('/permissions');
  }

  async get(permissionId) {
    return this.client.get(`/permissions/${permissionId}`);
  }
}

// ==================== Module Resource ====================

class ModuleResource extends BaseResource {
  async list(params = {}) {
    return this.client.get('/modules', params);
  }

  async get(moduleId) {
    return this.client.get(`/modules/${moduleId}`);
  }

  async getByCode(moduleCode) {
    return this.client.get(`/modules/code/${moduleCode}`);
  }

  /**
   * Register a new module
   * @param {Object} data - Module configuration
   * @param {string} data.module_id - Unique module identifier (e.g., "aich")
   * @param {string} data.name - Display name
   * @param {string} data.version - Semantic version
   * @param {string} data.base_url - Module service URL
   * @param {string} data.health_endpoint - Health check path
   * @param {Array} data.endpoints - List of API endpoints
   * @param {Object} data.kafka_topics - Pub/sub topics
   */
  async register(data) {
    return this.client.post('/modules', data);
  }

  async update(moduleId, data) {
    return this.client.put(`/modules/${moduleId}`, data);
  }

  async delete(moduleId) {
    return this.client.delete(`/modules/${moduleId}`);
  }

  async start(moduleId) {
    return this.client.post(`/modules/${moduleId}/start`);
  }

  async stop(moduleId, reason = null) {
    return this.client.post(`/modules/${moduleId}/stop`, { reason });
  }

  async restart(moduleId, reason = null) {
    return this.client.post(`/modules/${moduleId}/restart`, { reason });
  }

  async setMaintenance(moduleId, reason = null) {
    return this.client.post(`/modules/${moduleId}/maintenance`, { reason });
  }

  async deprecate(moduleId, reason = null) {
    return this.client.post(`/modules/${moduleId}/deprecate`, { reason });
  }

  async deregister(moduleId) {
    return this.client.post(`/modules/${moduleId}/deregister`);
  }

  async updateStatus(moduleId, status, reason = null) {
    return this.client.patch(`/modules/${moduleId}/status`, { status, reason });
  }

  async updateVersion(moduleId, version, changelog = null) {
    return this.client.patch(`/modules/${moduleId}/version`, { version, changelog });
  }

  async healthCheck(moduleId) {
    return this.client.post(`/modules/${moduleId}/health-check`);
  }

  async healthHistory(moduleId, limit = 100) {
    return this.client.get(`/modules/${moduleId}/health-history`, { limit });
  }

  async stats() {
    return this.client.get('/modules/stats');
  }

  async states() {
    return this.client.get('/modules/states');
  }
}

// ==================== API Key Resource ====================

class ApiKeyResource extends BaseResource {
  async list(params = {}) {
    return this.client.get('/api-keys', params);
  }

  async get(keyId) {
    return this.client.get(`/api-keys/${keyId}`);
  }

  async create(data) {
    return this.client.post('/api-keys', data);
  }

  async update(keyId, data) {
    return this.client.put(`/api-keys/${keyId}`, data);
  }

  async revoke(keyId) {
    return this.client.post(`/api-keys/${keyId}/revoke`);
  }

  async delete(keyId) {
    return this.client.delete(`/api-keys/${keyId}`);
  }
}

// ==================== Document Resource ====================

class DocumentResource extends BaseResource {
  async list(params = {}) {
    return this.client.get('/documents', params);
  }

  async get(documentId) {
    return this.client.get(`/documents/${documentId}`);
  }

  async create(data) {
    return this.client.post('/documents', data);
  }

  async update(documentId, data) {
    return this.client.put(`/documents/${documentId}`, data);
  }

  async delete(documentId) {
    return this.client.delete(`/documents/${documentId}`);
  }

  async submitForReview(documentId) {
    return this.client.post(`/documents/${documentId}/submit`);
  }

  async approve(documentId, comments = null) {
    return this.client.post(`/documents/${documentId}/approve`, { comments });
  }

  async reject(documentId, reason) {
    return this.client.post(`/documents/${documentId}/reject`, { reason });
  }

  async getVersions(documentId) {
    return this.client.get(`/documents/${documentId}/versions`);
  }

  async createVersion(documentId, data) {
    return this.client.post(`/documents/${documentId}/versions`, data);
  }
}

// ==================== CAPA Resource ====================

class CapaResource extends BaseResource {
  async list(params = {}) {
    return this.client.get('/capas', params);
  }

  async get(capaId) {
    return this.client.get(`/capas/${capaId}`);
  }

  async create(data) {
    return this.client.post('/capas', data);
  }

  async update(capaId, data) {
    return this.client.put(`/capas/${capaId}`, data);
  }

  async delete(capaId) {
    return this.client.delete(`/capas/${capaId}`);
  }

  async addAction(capaId, data) {
    return this.client.post(`/capas/${capaId}/actions`, data);
  }

  async updateAction(capaId, actionId, data) {
    return this.client.put(`/capas/${capaId}/actions/${actionId}`, data);
  }

  async completeAction(capaId, actionId) {
    return this.client.post(`/capas/${capaId}/actions/${actionId}/complete`);
  }

  async addRootCause(capaId, data) {
    return this.client.post(`/capas/${capaId}/root-causes`, data);
  }

  async close(capaId, data) {
    return this.client.post(`/capas/${capaId}/close`, data);
  }

  async verifyEffectiveness(capaId, data) {
    return this.client.post(`/capas/${capaId}/verify`, data);
  }
}

// ==================== Training Resource ====================

class TrainingResource extends BaseResource {
  async listCourses(params = {}) {
    return this.client.get('/training/courses', params);
  }

  async getCourse(courseId) {
    return this.client.get(`/training/courses/${courseId}`);
  }

  async createCourse(data) {
    return this.client.post('/training/courses', data);
  }

  async updateCourse(courseId, data) {
    return this.client.put(`/training/courses/${courseId}`, data);
  }

  async deleteCourse(courseId) {
    return this.client.delete(`/training/courses/${courseId}`);
  }

  async assignTraining(data) {
    return this.client.post('/training/assignments', data);
  }

  async getAssignments(userId = null) {
    const params = userId ? { user_id: userId } : {};
    return this.client.get('/training/assignments', params);
  }

  async completeTraining(assignmentId, data) {
    return this.client.post(`/training/assignments/${assignmentId}/complete`, data);
  }

  async getTranscript(userId) {
    return this.client.get(`/training/transcripts/${userId}`);
  }
}

// ==================== Supplier Resource ====================

class SupplierResource extends BaseResource {
  async list(params = {}) {
    return this.client.get('/suppliers', params);
  }

  async get(supplierId) {
    return this.client.get(`/suppliers/${supplierId}`);
  }

  async create(data) {
    return this.client.post('/suppliers', data);
  }

  async update(supplierId, data) {
    return this.client.put(`/suppliers/${supplierId}`, data);
  }

  async delete(supplierId) {
    return this.client.delete(`/suppliers/${supplierId}`);
  }

  async addAudit(supplierId, data) {
    return this.client.post(`/suppliers/${supplierId}/audits`, data);
  }

  async getAudits(supplierId) {
    return this.client.get(`/suppliers/${supplierId}/audits`);
  }

  async addScorecard(supplierId, data) {
    return this.client.post(`/suppliers/${supplierId}/scorecards`, data);
  }

  async getScorecards(supplierId) {
    return this.client.get(`/suppliers/${supplierId}/scorecards`);
  }

  async updateRiskLevel(supplierId, riskLevel, reason) {
    return this.client.patch(`/suppliers/${supplierId}/risk`, {
      risk_level: riskLevel,
      reason
    });
  }
}

// ==================== Workflow Resource ====================

class WorkflowResource extends BaseResource {
  async listDefinitions(params = {}) {
    return this.client.get('/workflows/definitions', params);
  }

  async getDefinition(definitionId) {
    return this.client.get(`/workflows/definitions/${definitionId}`);
  }

  async createDefinition(data) {
    return this.client.post('/workflows/definitions', data);
  }

  async updateDefinition(definitionId, data) {
    return this.client.put(`/workflows/definitions/${definitionId}`, data);
  }

  async listInstances(params = {}) {
    return this.client.get('/workflows/instances', params);
  }

  async getInstance(instanceId) {
    return this.client.get(`/workflows/instances/${instanceId}`);
  }

  async startWorkflow(definitionId, data) {
    return this.client.post(`/workflows/definitions/${definitionId}/start`, data);
  }

  async completeTask(taskId, data) {
    return this.client.post(`/workflows/tasks/${taskId}/complete`, data);
  }

  async getMyTasks() {
    return this.client.get('/workflows/tasks/my');
  }
}

// ==================== Notification Resource ====================

class NotificationResource extends BaseResource {
  async list(params = {}) {
    return this.client.get('/notifications/me', params);
  }

  async get(notificationId) {
    return this.client.get(`/notifications/${notificationId}`);
  }

  async markRead(notificationId) {
    return this.client.put(`/notifications/${notificationId}/read`);
  }

  async markAllRead() {
    return this.client.put('/notifications/me/read-all');
  }

  async getPreferences() {
    return this.client.get('/notifications/preferences');
  }

  async updatePreferences(data) {
    return this.client.put('/notifications/preferences', data);
  }

  async unreadCount() {
    return this.client.get('/notifications/me/unread-count');
  }
}

// ==================== Report Resource ====================

class ReportResource extends BaseResource {
  async list(params = {}) {
    return this.client.get('/reporting/reports', params);
  }

  async get(reportId) {
    return this.client.get(`/reporting/${reportId}`);
  }

  async generate(data) {
    return this.client.post('/reporting/generate', data);
  }

  async schedule(data) {
    return this.client.post('/reporting/schedule', data);
  }

  async getScheduled() {
    return this.client.get('/reporting/scheduled');
  }

  async deleteScheduled(scheduleId) {
    return this.client.delete(`/reporting/scheduled/${scheduleId}`);
  }

  async export(reportId, format = 'pdf') {
    const response = await this.client._http.get(
      `/reporting/${reportId}/export`,
      {
        params: { format },
        responseType: 'arraybuffer'
      }
    );
    return response.data;
  }
}

// ==================== Audit Log Resource ====================

class AuditLogResource extends BaseResource {
  async list(params = {}) {
    return this.client.get('/audit-logs', params);
  }

  async get(logId) {
    return this.client.get(`/audit-logs/${logId}`);
  }

  async search(query, params = {}) {
    return this.client.get('/audit-logs/search', { query, ...params });
  }
}

// ==================== AI Resource ====================

class AIResource extends BaseResource {
  async complete(prompt, options = {}) {
    return this.client.post('/ai/completions', { prompt, ...options });
  }

  async analyzeDocument(documentId, analysisType = 'compliance') {
    return this.client.post('/ai/analyze', {
      document_id: documentId,
      analysis_type: analysisType
    });
  }

  async getUsage(startDate = null, endDate = null) {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return this.client.get('/ai/usage', params);
  }

  async listPrompts() {
    return this.client.get('/ai/prompts');
  }

  async getPrompt(promptId) {
    return this.client.get(`/ai/prompts/${promptId}`);
  }

  async createPrompt(data) {
    return this.client.post('/ai/prompts', data);
  }

  async queryKnowledge(query, options = {}) {
    return this.client.post('/ai/knowledge/query', { query, ...options });
  }
}

// ==================== QMS Resource ====================

class QMSResource extends BaseResource {
  async listConnections() {
    return this.client.get('/qms/connections');
  }

  async getConnection(connectionId) {
    return this.client.get(`/qms/connections/${connectionId}`);
  }

  async createConnection(data) {
    return this.client.post('/qms/connections', data);
  }

  async updateConnection(connectionId, data) {
    return this.client.put(`/qms/connections/${connectionId}`, data);
  }

  async deleteConnection(connectionId) {
    return this.client.delete(`/qms/connections/${connectionId}`);
  }

  async testConnection(connectionId) {
    return this.client.post(`/qms/connections/${connectionId}/test`);
  }

  async sync(connectionId, entityTypes = null) {
    const data = entityTypes ? { entity_types: entityTypes } : {};
    return this.client.post(`/qms/connections/${connectionId}/sync`, data);
  }

  async getSyncStatus(connectionId) {
    return this.client.get(`/qms/connections/${connectionId}/sync-status`);
  }

  async listSyncJobs(connectionId) {
    return this.client.get(`/qms/connections/${connectionId}/sync-jobs`);
  }

  async getConflicts(connectionId) {
    return this.client.get(`/qms/connections/${connectionId}/conflicts`);
  }

  async resolveConflict(conflictId, resolution) {
    return this.client.post(`/qms/conflicts/${conflictId}/resolve`, { resolution });
  }
}

// ==================== File Resource ====================

class FileResource extends BaseResource {
  async upload(filePath, entityType, entityId) {
    const FormData = require('form-data');
    const fs = require('fs');
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('entity_type', entityType);
    form.append('entity_id', entityId);
    
    const response = await this.client._http.post('/files/upload', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${this.client._accessToken}`
      }
    });
    return response.data;
  }

  async download(fileId) {
    const response = await this.client._http.get(`/files/${fileId}/download`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  async get(fileId) {
    return this.client.get(`/files/${fileId}`);
  }

  async delete(fileId) {
    return this.client.delete(`/files/${fileId}`);
  }

  async listForEntity(entityType, entityId) {
    return this.client.get(`/files/entity/${entityType}/${entityId}`);
  }
}

// ==================== Webhook Resource ====================

class WebhookResource extends BaseResource {
  async list() {
    return this.client.get('/webhooks');
  }

  async get(webhookId) {
    return this.client.get(`/webhooks/${webhookId}`);
  }

  async create(data) {
    return this.client.post('/webhooks', data);
  }

  async update(webhookId, data) {
    return this.client.put(`/webhooks/${webhookId}`, data);
  }

  async delete(webhookId) {
    return this.client.delete(`/webhooks/${webhookId}`);
  }

  async test(webhookId) {
    return this.client.post(`/webhooks/${webhookId}/test`);
  }

  async getDeliveries(webhookId) {
    return this.client.get(`/webhooks/${webhookId}/deliveries`);
  }

  async retryDelivery(deliveryId) {
    return this.client.post(`/webhooks/deliveries/${deliveryId}/retry`);
  }
}

// ==================== Health Resource ====================

class HealthResource extends BaseResource {
  async check() {
    return this.client.get('/health');
  }

  async detailed() {
    return this.client.get('/health/detailed');
  }

  async ready() {
    return this.client.get('/health/ready');
  }

  async live() {
    return this.client.get('/health/live');
  }
}

// ==================== Main Client ====================

class QAssureClient {
  /**
   * QAssure Platform API Client
   * 
   * @param {Object} options - Client configuration
   * @param {string} options.baseUrl - API base URL (default: https://api.qassure.ai)
   * @param {string} options.apiVersion - API version (default: v1)
   * @param {string} options.tenantId - Tenant ID for multi-tenant requests
   * @param {number} options.timeout - Request timeout in ms (default: 30000)
   * 
   * @example
   * const client = new QAssureClient({ baseUrl: 'https://api.qassure.ai' });
   * await client.login('user@example.com', 'password');
   * 
   * // List modules
   * const modules = await client.modules.list();
   * 
   * // Register a module
   * const newModule = await client.modules.register({
   *   module_id: 'aich',
   *   name: 'AiCH Module',
   *   version: '1.0.0',
   *   base_url: 'http://aich:3001',
   *   health_endpoint: '/health'
   * });
   * 
   * // Start the module
   * await client.modules.start(newModule.data.id);
   */
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || 'https://api.qassure.ai').replace(/\/$/, '');
    this.apiVersion = options.apiVersion || 'v1';
    this.apiUrl = `${this.baseUrl}/api/${this.apiVersion}`;
    this.tenantId = options.tenantId || null;
    this.timeout = options.timeout || 30000;
    
    this._accessToken = null;
    this._refreshToken = null;
    
    // Setup axios instance
    this._http = axios.create({
      baseURL: this.apiUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'QAssure-JavaScript-SDK/1.0.0'
      }
    });
    
    this._setupInterceptors();
    
    // Initialize resource managers
    this.auth = new AuthResource(this);
    this.users = new UserResource(this);
    this.tenants = new TenantResource(this);
    this.roles = new RoleResource(this);
    this.permissions = new PermissionResource(this);
    this.modules = new ModuleResource(this);
    this.apiKeys = new ApiKeyResource(this);
    this.documents = new DocumentResource(this);
    this.capas = new CapaResource(this);
    this.training = new TrainingResource(this);
    this.suppliers = new SupplierResource(this);
    this.workflows = new WorkflowResource(this);
    this.notifications = new NotificationResource(this);
    this.reports = new ReportResource(this);
    this.auditLogs = new AuditLogResource(this);
    this.ai = new AIResource(this);
    this.qms = new QMSResource(this);
    this.files = new FileResource(this);
    this.webhooks = new WebhookResource(this);
    this.health = new HealthResource(this);
  }

  _setupInterceptors() {
    // Request interceptor
    this._http.interceptors.request.use((config) => {
      if (this._accessToken) {
        config.headers.Authorization = `Bearer ${this._accessToken}`;
      }
      if (this.tenantId) {
        config.headers['X-Tenant-ID'] = this.tenantId;
      }
      return config;
    });

    // Response interceptor
    this._http.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this._refreshToken) {
          try {
            await this.auth.refresh();
            error.config.headers.Authorization = `Bearer ${this._accessToken}`;
            return this._http.request(error.config);
          } catch (refreshError) {
            throw refreshError;
          }
        }
        throw error;
      }
    );
  }

  _handleResponse(response) {
    return response.data;
  }

  _handleError(error) {
    const response = error.response;
    const data = response?.data || {};
    const message = data.error?.message || error.message;
    const statusCode = response?.status;

    if (statusCode === 400) {
      if (message.includes('Invalid state transition')) {
        throw new InvalidStateTransitionError(message, statusCode, data);
      }
      throw new ValidationError(message, statusCode, data);
    } else if (statusCode === 401) {
      throw new AuthenticationError(message, statusCode, data);
    } else if (statusCode === 404) {
      throw new NotFoundError(message, statusCode, data);
    } else {
      throw new QAssureError(message, statusCode, data);
    }
  }

  async request(method, endpoint, data = null, params = null) {
    try {
      const config = {
        method,
        url: endpoint,
        params
      };
      // Only include data for non-GET requests to avoid body-parser issues
      if (method !== 'GET' && method !== 'DELETE' && data !== null) {
        config.data = data;
      }
      const response = await this._http.request(config);
      return this._handleResponse(response);
    } catch (error) {
      this._handleError(error);
    }
  }

  async get(endpoint, params = null) {
    return this.request('GET', endpoint, null, params);
  }

  async post(endpoint, data = null) {
    return this.request('POST', endpoint, data);
  }

  async put(endpoint, data = null) {
    return this.request('PUT', endpoint, data);
  }

  async patch(endpoint, data = null) {
    return this.request('PATCH', endpoint, data);
  }

  async delete(endpoint) {
    return this.request('DELETE', endpoint);
  }

  // Convenience methods
  async login(email, password) {
    return this.auth.login(email, password);
  }

  async logout() {
    return this.auth.logout();
  }

  setTokens(accessToken, refreshToken = null) {
    this._accessToken = accessToken;
    if (refreshToken) this._refreshToken = refreshToken;
  }

  // WebSocket connection
  connectWebSocket(options = {}) {
    const wsUrl = this.baseUrl.replace('http', 'ws');
    const ws = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Bearer ${this._accessToken}`
      }
    });

    ws.on('open', () => {
      if (options.onOpen) options.onOpen();
    });

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (options.onMessage) options.onMessage(parsed);
      } catch (e) {
        if (options.onMessage) options.onMessage(data);
      }
    });

    ws.on('error', (error) => {
      if (options.onError) options.onError(error);
    });

    ws.on('close', () => {
      if (options.onClose) options.onClose();
    });

    return ws;
  }
}

// Export everything
module.exports = {
  QAssureClient,
  QAssureError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  InvalidStateTransitionError
};
