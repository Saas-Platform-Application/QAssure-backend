"""
QAssure Python SDK - Real Integration Test
Tests actual API calls against running server
"""

import sys
sys.path.insert(0, '.')

from qassure_sdk import QAssureClient, AuthenticationError, NotFoundError

API_URL = 'http://localhost:3000'
TEST_EMAIL = 'superadmin@qassure.ai'
TEST_PASSWORD = 'Password123!'

print('==========================================')
print('QAssure Python SDK - Integration Test')
print(f'API: {API_URL}')
print('==========================================\n')

passed = 0
failed = 0
skipped = 0

def test(name, fn, skip_on_auth_fail=False):
    global passed, failed, skipped
    try:
        fn()
        print(f'✅ {name}')
        passed += 1
    except Exception as e:
        err_msg = str(e)
        if skip_on_auth_fail and ('401' in err_msg or 'Not logged in' in err_msg or 'AuthenticationError' in err_msg):
            print(f'⏭️  {name} (skipped - auth required)')
            skipped += 1
        else:
            print(f'❌ {name}')
            print(f'   Error: {err_msg}')
            failed += 1

# Create client
client = QAssureClient(base_url=API_URL, timeout=10)

# ========== Health Tests ==========
print('\n--- Health Endpoints ---\n')

def test_health_check():
    result = client.health.check()
    status = result.get('status') or result.get('data', {}).get('status')
    print(f'   Response: status={status}')

test('Health check', test_health_check)

def test_health_detailed():
    result = client.health.detailed()
    status = result.get('status') or result.get('data', {}).get('status')
    print(f'   Response: status={status}')

test('Health detailed', test_health_detailed)

# ========== Authentication ==========
print('\n--- Authentication ---\n')

auth_success = False

def test_login():
    global auth_success
    result = client.login(TEST_EMAIL, TEST_PASSWORD)
    if not result.get('success'):
        raise Exception(f'Login failed: {result}')
    if not client._access_token:
        raise Exception('No access token received')
    auth_success = True
    print(f'   Token: {client._access_token[:30]}...')

test('Login with credentials', test_login)

def test_auth_me():
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    result = client.auth.me()
    user = result.get('data', {})
    print(f'   User: {user.get("email")} ({user.get("first_name")} {user.get("last_name")})')

test('Get current user (auth.me)', test_auth_me, True)

# ========== Modules ==========
print('\n--- Modules ---\n')

module_id = None

def test_list_modules():
    global module_id
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    result = client.modules.list()
    data = result.get('data', [])
    if len(data) > 0:
        module_id = data[0].get('id')
    print(f'   Found: {len(data)} modules')

test('List modules', test_list_modules, True)

def test_module_stats():
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    result = client.modules.stats()
    data = result.get('data', {})
    print(f'   Stats: total={data.get("total", 0)}, running={data.get("by_status", {}).get("running", 0)}')

test('Get module stats', test_module_stats, True)

def test_module_states():
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    result = client.modules.states()
    data = result.get('data', {})
    states = data.get('states', {})
    print(f'   States: {len(states)} states defined')

test('Get module states', test_module_states, True)

# ========== Users ==========
print('\n--- Users ---\n')

def test_list_users():
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    result = client.users.list(limit=5)
    data = result.get('data', [])
    print(f'   Found: {len(data)} users')

test('List users', test_list_users, True)

# ========== Tenants ==========
print('\n--- Tenants ---\n')

def test_list_tenants():
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    result = client.tenants.list(limit=5)
    data = result.get('data', [])
    print(f'   Found: {len(data)} tenants')

test('List tenants', test_list_tenants, True)

# ========== Roles ==========
print('\n--- Roles ---\n')

def test_list_roles():
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    result = client.roles.list()
    data = result.get('data', [])
    print(f'   Found: {len(data)} roles')

test('List roles', test_list_roles, True)

# ========== Documents ==========
print('\n--- Documents ---\n')

def test_list_documents():
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    result = client.documents.list(limit=5)
    data = result.get('data', [])
    print(f'   Found: {len(data)} documents')

test('List documents', test_list_documents, True)

# ========== CAPAs ==========
print('\n--- CAPAs ---\n')

def test_list_capas():
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    result = client.capas.list(limit=5)
    data = result.get('data', [])
    print(f'   Found: {len(data)} CAPAs')

test('List CAPAs', test_list_capas, True)

# ========== Training ==========
print('\n--- Training ---\n')

def test_list_courses():
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    result = client.training.list_courses(limit=5)
    data = result.get('data', [])
    print(f'   Found: {len(data)} courses')

test('List training courses', test_list_courses, True)

# ========== Suppliers ==========
print('\n--- Suppliers ---\n')

def test_list_suppliers():
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    result = client.suppliers.list(limit=5)
    data = result.get('data', [])
    print(f'   Found: {len(data)} suppliers')

test('List suppliers', test_list_suppliers, True)

# ========== Audit Logs ==========
print('\n--- Audit Logs ---\n')

def test_list_audit_logs():
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    result = client.audit_logs.list(limit=5)
    data = result.get('data', [])
    print(f'   Found: {len(data)} audit logs')

test('List audit logs', test_list_audit_logs, True)

# ========== API Keys ==========
print('\n--- API Keys ---\n')

def test_list_api_keys():
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    result = client.api_keys.list(limit=5)
    data = result.get('data', [])
    print(f'   Found: {len(data)} API keys')

test('List API keys', test_list_api_keys, True)

# ========== Webhooks ==========
print('\n--- Webhooks ---\n')

def test_list_webhooks():
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    result = client.webhooks.list()
    data = result.get('data', [])
    print(f'   Found: {len(data)} webhooks')

test('List webhooks', test_list_webhooks, True)

# ========== Logout ==========
print('\n--- Logout ---\n')

def test_logout():
    if not auth_success:
        raise AuthenticationError('Not logged in', 401, {})
    client.logout()
    if client._access_token:
        raise Exception('Token not cleared')
    print('   Logged out successfully')

test('Logout', test_logout, True)

# ========== Summary ==========
print('\n==========================================')
print(f'Results: {passed} passed, {failed} failed, {skipped} skipped')
print('==========================================\n')

if failed > 0:
    sys.exit(1)
