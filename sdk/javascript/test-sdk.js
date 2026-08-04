/**
 * QAssure JavaScript SDK - Validation Test
 */

const { QAssureClient, QAssureError, AuthenticationError, NotFoundError, ValidationError } = require('./src/index.js');

console.log('==========================================');
console.log('QAssure JavaScript SDK - Validation Test');
console.log('==========================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// Test 1: SDK imports correctly
test('SDK imports correctly', () => {
  if (typeof QAssureClient !== 'function') throw new Error('QAssureClient is not a function');
  if (typeof QAssureError !== 'function') throw new Error('QAssureError is not a function');
  if (typeof AuthenticationError !== 'function') throw new Error('AuthenticationError is not a function');
  if (typeof NotFoundError !== 'function') throw new Error('NotFoundError is not a function');
  if (typeof ValidationError !== 'function') throw new Error('ValidationError is not a function');
});

// Test 2: Client instantiation with defaults
test('Client instantiation with defaults', () => {
  const client = new QAssureClient();
  if (client.baseUrl !== 'https://api.qassure.ai') throw new Error('Wrong default baseUrl');
  if (client.apiVersion !== 'v1') throw new Error('Wrong default apiVersion');
  if (client.timeout !== 30000) throw new Error('Wrong default timeout');
});

// Test 3: Client instantiation with custom options
test('Client instantiation with custom options', () => {
  const client = new QAssureClient({
    baseUrl: 'http://localhost:3000',
    apiVersion: 'v2',
    tenantId: 'test-tenant',
    timeout: 60000
  });
  if (client.baseUrl !== 'http://localhost:3000') throw new Error('baseUrl not set');
  if (client.apiVersion !== 'v2') throw new Error('apiVersion not set');
  if (client.tenantId !== 'test-tenant') throw new Error('tenantId not set');
  if (client.timeout !== 60000) throw new Error('timeout not set');
});

// Test 4: All resource managers exist
test('All resource managers exist', () => {
  const client = new QAssureClient();
  const resources = [
    'auth', 'users', 'tenants', 'roles', 'permissions', 'modules',
    'apiKeys', 'documents', 'capas', 'training', 'suppliers',
    'workflows', 'notifications', 'reports', 'auditLogs',
    'ai', 'qms', 'files', 'webhooks', 'health'
  ];
  
  for (const resource of resources) {
    if (!client[resource]) throw new Error(`Missing resource: ${resource}`);
  }
});

// Test 5: Auth resource has all methods
test('Auth resource has all methods', () => {
  const client = new QAssureClient();
  const methods = ['login', 'logout', 'logoutAll', 'refresh', 'me', 'changePassword', 'forgotPassword', 'resetPassword'];
  for (const method of methods) {
    if (typeof client.auth[method] !== 'function') throw new Error(`Missing method: auth.${method}`);
  }
});

// Test 6: Modules resource has all methods
test('Modules resource has all methods', () => {
  const client = new QAssureClient();
  const methods = [
    'list', 'get', 'getByCode', 'register', 'update', 'delete',
    'start', 'stop', 'restart', 'setMaintenance', 'deprecate', 'deregister',
    'updateStatus', 'updateVersion', 'healthCheck', 'healthHistory', 'stats', 'states'
  ];
  for (const method of methods) {
    if (typeof client.modules[method] !== 'function') throw new Error(`Missing method: modules.${method}`);
  }
});

// Test 7: Users resource has all methods
test('Users resource has all methods', () => {
  const client = new QAssureClient();
  const methods = ['list', 'get', 'create', 'update', 'delete', 'activate', 'deactivate', 'assignRole', 'removeRole'];
  for (const method of methods) {
    if (typeof client.users[method] !== 'function') throw new Error(`Missing method: users.${method}`);
  }
});

// Test 8: Documents resource has all methods
test('Documents resource has all methods', () => {
  const client = new QAssureClient();
  const methods = ['list', 'get', 'create', 'update', 'delete', 'submitForReview', 'approve', 'reject', 'getVersions', 'createVersion'];
  for (const method of methods) {
    if (typeof client.documents[method] !== 'function') throw new Error(`Missing method: documents.${method}`);
  }
});

// Test 9: CAPAs resource has all methods
test('CAPAs resource has all methods', () => {
  const client = new QAssureClient();
  const methods = ['list', 'get', 'create', 'update', 'delete', 'addAction', 'updateAction', 'completeAction', 'addRootCause', 'close', 'verifyEffectiveness'];
  for (const method of methods) {
    if (typeof client.capas[method] !== 'function') throw new Error(`Missing method: capas.${method}`);
  }
});

// Test 10: Training resource has all methods
test('Training resource has all methods', () => {
  const client = new QAssureClient();
  const methods = ['listCourses', 'getCourse', 'createCourse', 'updateCourse', 'deleteCourse', 'assignTraining', 'getAssignments', 'completeTraining', 'getTranscript'];
  for (const method of methods) {
    if (typeof client.training[method] !== 'function') throw new Error(`Missing method: training.${method}`);
  }
});

// Test 11: Suppliers resource has all methods
test('Suppliers resource has all methods', () => {
  const client = new QAssureClient();
  const methods = ['list', 'get', 'create', 'update', 'delete', 'addAudit', 'getAudits', 'addScorecard', 'getScorecards', 'updateRiskLevel'];
  for (const method of methods) {
    if (typeof client.suppliers[method] !== 'function') throw new Error(`Missing method: suppliers.${method}`);
  }
});

// Test 12: Workflows resource has all methods
test('Workflows resource has all methods', () => {
  const client = new QAssureClient();
  const methods = ['listDefinitions', 'getDefinition', 'createDefinition', 'updateDefinition', 'listInstances', 'getInstance', 'startWorkflow', 'completeTask', 'getMyTasks'];
  for (const method of methods) {
    if (typeof client.workflows[method] !== 'function') throw new Error(`Missing method: workflows.${method}`);
  }
});

// Test 13: AI resource has all methods
test('AI resource has all methods', () => {
  const client = new QAssureClient();
  const methods = ['complete', 'analyzeDocument', 'getUsage', 'listPrompts', 'getPrompt', 'createPrompt', 'queryKnowledge'];
  for (const method of methods) {
    if (typeof client.ai[method] !== 'function') throw new Error(`Missing method: ai.${method}`);
  }
});

// Test 14: QMS resource has all methods
test('QMS resource has all methods', () => {
  const client = new QAssureClient();
  const methods = ['listConnections', 'getConnection', 'createConnection', 'updateConnection', 'deleteConnection', 'testConnection', 'sync', 'getSyncStatus', 'listSyncJobs', 'getConflicts', 'resolveConflict'];
  for (const method of methods) {
    if (typeof client.qms[method] !== 'function') throw new Error(`Missing method: qms.${method}`);
  }
});

// Test 15: Health resource has all methods
test('Health resource has all methods', () => {
  const client = new QAssureClient();
  const methods = ['check', 'detailed', 'ready', 'live'];
  for (const method of methods) {
    if (typeof client.health[method] !== 'function') throw new Error(`Missing method: health.${method}`);
  }
});

// Test 16: setTokens method works
test('setTokens method works', () => {
  const client = new QAssureClient();
  client.setTokens('access-token-123', 'refresh-token-456');
  if (client._accessToken !== 'access-token-123') throw new Error('Access token not set');
  if (client._refreshToken !== 'refresh-token-456') throw new Error('Refresh token not set');
});

// Test 17: HTTP methods exist
test('HTTP methods exist (get, post, put, patch, delete)', () => {
  const client = new QAssureClient();
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'request'];
  for (const method of methods) {
    if (typeof client[method] !== 'function') throw new Error(`Missing HTTP method: ${method}`);
  }
});

// Test 18: WebSocket method exists
test('WebSocket connectWebSocket method exists', () => {
  const client = new QAssureClient();
  if (typeof client.connectWebSocket !== 'function') throw new Error('connectWebSocket method missing');
});

// Test 19: Exception classes work correctly
test('Exception classes instantiate correctly', () => {
  const err1 = new QAssureError('Test error', 500, { detail: 'test' });
  if (err1.message !== 'Test error') throw new Error('QAssureError message wrong');
  if (err1.statusCode !== 500) throw new Error('QAssureError statusCode wrong');
  if (err1.name !== 'QAssureError') throw new Error('QAssureError name wrong');
  
  const err2 = new AuthenticationError('Auth failed', 401, {});
  if (err2.name !== 'AuthenticationError') throw new Error('AuthenticationError name wrong');
  
  const err3 = new NotFoundError('Not found', 404, {});
  if (err3.name !== 'NotFoundError') throw new Error('NotFoundError name wrong');
});

// Test 20: Convenience login/logout methods exist on client
test('Convenience methods (login, logout) exist on client', () => {
  const client = new QAssureClient();
  if (typeof client.login !== 'function') throw new Error('login method missing');
  if (typeof client.logout !== 'function') throw new Error('logout method missing');
});

// Summary
console.log('\n==========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('==========================================');

if (failed > 0) {
  process.exit(1);
}
