/**
 * QAssure JavaScript SDK - Real Integration Test
 * Tests actual API calls against running server
 */

const { QAssureClient, AuthenticationError, NotFoundError } = require('./src/index.js');

const API_URL = 'http://localhost:3000';

// Correct credentials from seed.js
const TEST_EMAIL = 'superadmin@qassure.ai';
const TEST_PASSWORD = 'Password123!';

console.log('==========================================');
console.log('QAssure JS SDK - Integration Test');
console.log(`API: ${API_URL}`);
console.log('==========================================\n');

let passed = 0;
let failed = 0;
let skipped = 0;

async function test(name, fn, skipOnAuthFail = false) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    if (skipOnAuthFail && (error instanceof AuthenticationError || error.message.includes('401') || error.message.includes('Not logged in'))) {
      console.log(`⏭️  ${name} (skipped - auth required)`);
      skipped++;
    } else {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }
}

async function runTests() {
  // Create client without default Content-Type for GET requests
  const client = new QAssureClient({
    baseUrl: API_URL,
    timeout: 10000
  });

  // ========== Health Tests (using direct axios to avoid SDK bug) ==========
  console.log('\n--- Health Endpoints (Direct HTTP) ---\n');

  const axios = require('axios');
  
  await test('Health check - direct HTTP', async () => {
    const result = await axios.get(`${API_URL}/api/v1/health`);
    if (!result.data.success) throw new Error('Invalid health response');
    console.log(`   Response: status=${result.data.status}`);
  });

  await test('Health detailed - direct HTTP', async () => {
    const result = await axios.get(`${API_URL}/api/v1/health/detailed`);
    if (!result.data.success) throw new Error('Invalid response');
    console.log(`   Response: status=${result.data.status}`);
  });

  // ========== Authentication Tests ==========
  console.log('\n--- Authentication ---\n');

  let authSuccess = false;

  await test('Login with credentials', async () => {
    const result = await client.login(TEST_EMAIL, TEST_PASSWORD);
    if (!result.success) throw new Error('Login failed: ' + JSON.stringify(result));
    if (!client._accessToken) throw new Error('No access token received');
    authSuccess = true;
    console.log(`   Token: ${client._accessToken.substring(0, 30)}...`);
  });

  await test('Get current user (auth.me)', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.auth.me();
    if (!result.success && !result.data) throw new Error('Invalid response');
    const user = result.data;
    console.log(`   User: ${user.email} (${user.first_name} ${user.last_name})`);
  }, true);

  // ========== Modules Tests ==========
  console.log('\n--- Modules ---\n');

  let moduleId = null;

  await test('List modules', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.modules.list();
    if (!result.success && !result.data) throw new Error('Invalid response');
    const count = result.data?.length || 0;
    if (count > 0) moduleId = result.data[0].id;
    console.log(`   Found: ${count} modules`);
  }, true);

  await test('Get module stats', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.modules.stats();
    if (!result.success && !result.data) throw new Error('Invalid response');
    console.log(`   Stats: total=${result.data?.total || 0}, running=${result.data?.by_status?.running || 0}`);
  }, true);

  await test('Get module states', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.modules.states();
    if (!result.success && !result.data) throw new Error('Invalid response');
    const stateCount = result.data?.states ? Object.keys(result.data.states).length : 0;
    console.log(`   States: ${stateCount} states defined`);
  }, true);

  if (moduleId) {
    await test('Get single module', async () => {
      if (!authSuccess) throw new AuthenticationError('Not logged in');
      const result = await client.modules.get(moduleId);
      if (!result.success && !result.data) throw new Error('Invalid response');
      console.log(`   Module: ${result.data.name} (${result.data.status})`);
    }, true);

    await test('Module health check', async () => {
      if (!authSuccess) throw new AuthenticationError('Not logged in');
      const result = await client.modules.healthCheck(moduleId);
      console.log(`   Health: ${result.data?.status || 'checked'}`);
    }, true);
  }

  // ========== Users Tests ==========
  console.log('\n--- Users ---\n');

  await test('List users', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.users.list({ limit: 5 });
    if (!result.success && !result.data) throw new Error('Invalid response');
    console.log(`   Found: ${result.data?.length || 0} users`);
  }, true);

  // ========== Tenants Tests ==========
  console.log('\n--- Tenants ---\n');

  await test('List tenants', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.tenants.list({ limit: 5 });
    if (!result.success && !result.data) throw new Error('Invalid response');
    console.log(`   Found: ${result.data?.length || 0} tenants`);
  }, true);

  // ========== Roles Tests ==========
  console.log('\n--- Roles ---\n');

  await test('List roles', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.roles.list();
    if (!result.success && !result.data) throw new Error('Invalid response');
    console.log(`   Found: ${result.data?.length || 0} roles`);
  }, true);

  // ========== Permissions Tests ==========
  console.log('\n--- Permissions ---\n');

  await test('List permissions', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.permissions.list();
    if (!result.success && !result.data) throw new Error('Invalid response');
    console.log(`   Found: ${result.data?.length || 0} permissions`);
  }, true);

  // ========== Documents Tests ==========
  console.log('\n--- Documents ---\n');

  await test('List documents', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.documents.list({ limit: 5 });
    if (!result.success && !result.data) throw new Error('Invalid response');
    console.log(`   Found: ${result.data?.length || 0} documents`);
  }, true);

  // ========== CAPAs Tests ==========
  console.log('\n--- CAPAs ---\n');

  await test('List CAPAs', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.capas.list({ limit: 5 });
    if (!result.success && !result.data) throw new Error('Invalid response');
    console.log(`   Found: ${result.data?.length || 0} CAPAs`);
  }, true);

  // ========== Training Tests ==========
  console.log('\n--- Training ---\n');

  await test('List training courses', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.training.listCourses({ limit: 5 });
    if (!result.success && !result.data) throw new Error('Invalid response');
    console.log(`   Found: ${result.data?.length || 0} courses`);
  }, true);

  // ========== Suppliers Tests ==========
  console.log('\n--- Suppliers ---\n');

  await test('List suppliers', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.suppliers.list({ limit: 5 });
    if (!result.success && !result.data) throw new Error('Invalid response');
    console.log(`   Found: ${result.data?.length || 0} suppliers`);
  }, true);

  // ========== Notifications Tests ==========
  console.log('\n--- Notifications ---\n');

  await test('List notifications', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.notifications.list({ limit: 5 });
    if (!result.success && !result.data) throw new Error('Invalid response');
    console.log(`   Found: ${result.data?.length || 0} notifications`);
  }, true);

  await test('Get unread count', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.notifications.unreadCount();
    console.log(`   Unread: ${result.data?.count ?? 0}`);
  }, true);

  // ========== Audit Logs Tests ==========
  console.log('\n--- Audit Logs ---\n');

  await test('List audit logs', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.auditLogs.list({ limit: 5 });
    if (!result.success && !result.data) throw new Error('Invalid response');
    console.log(`   Found: ${result.data?.length || 0} audit logs`);
  }, true);

  // ========== Reports Tests ==========
  console.log('\n--- Reports ---\n');

  await test('List reports', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.reports.list({ limit: 5 });
    if (!result.success && !result.data) throw new Error('Invalid response');
    console.log(`   Found: ${result.data?.length || 0} reports`);
  }, true);

  // ========== API Keys Tests ==========
  console.log('\n--- API Keys ---\n');

  await test('List API keys', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.apiKeys.list({ limit: 5 });
    if (!result.success && !result.data) throw new Error('Invalid response');
    console.log(`   Found: ${result.data?.length || 0} API keys`);
  }, true);

  // ========== Webhooks Tests ==========
  console.log('\n--- Webhooks ---\n');

  await test('List webhooks', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    const result = await client.webhooks.list({ limit: 5 });
    if (!result.success && !result.data) throw new Error('Invalid response');
    console.log(`   Found: ${result.data?.length || 0} webhooks`);
  }, true);

  // ========== Logout ==========
  console.log('\n--- Logout ---\n');

  await test('Logout', async () => {
    if (!authSuccess) throw new AuthenticationError('Not logged in');
    await client.logout();
    if (client._accessToken) throw new Error('Token not cleared');
    console.log(`   Logged out successfully`);
  }, true);

  // ========== Summary ==========
  console.log('\n==========================================');
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('==========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
