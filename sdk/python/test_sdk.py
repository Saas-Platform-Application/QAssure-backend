"""
QAssure Python SDK - Validation Test
"""

import sys

print('==========================================')
print('QAssure Python SDK - Validation Test')
print('==========================================\n')

passed = 0
failed = 0

def test(name, fn):
    global passed, failed
    try:
        fn()
        print(f'✅ {name}')
        passed += 1
    except Exception as e:
        print(f'❌ {name}')
        print(f'   Error: {str(e)}')
        failed += 1

# Test 1: SDK imports correctly
def test_imports():
    from qassure_sdk import QAssureClient, QAssureError, AuthenticationError, NotFoundError, ValidationError, RateLimitError
    assert callable(QAssureClient), 'QAssureClient not callable'

test('SDK imports correctly', test_imports)

# Test 2: Exceptions import correctly
def test_exception_imports():
    from qassure_sdk.exceptions import (
        QAssureError, AuthenticationError, NotFoundError, 
        ValidationError, RateLimitError, ServerError, InvalidStateTransitionError
    )
    assert callable(QAssureError)
    assert callable(AuthenticationError)
    assert callable(NotFoundError)
    assert callable(ValidationError)
    assert callable(RateLimitError)
    assert callable(ServerError)
    assert callable(InvalidStateTransitionError)

test('Exception classes import correctly', test_exception_imports)

# Test 3: Client instantiation with defaults
def test_client_defaults():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    assert client.base_url == 'https://api.qassure.ai', f'Wrong base_url: {client.base_url}'
    assert client.api_version == 'v1', f'Wrong api_version: {client.api_version}'
    assert client.timeout == 30, f'Wrong timeout: {client.timeout}'

test('Client instantiation with defaults', test_client_defaults)

# Test 4: Client instantiation with custom options
def test_client_custom():
    from qassure_sdk import QAssureClient
    client = QAssureClient(
        base_url='http://localhost:3000',
        api_version='v2',
        tenant_id='test-tenant',
        timeout=60
    )
    assert client.base_url == 'http://localhost:3000'
    assert client.api_version == 'v2'
    assert client.tenant_id == 'test-tenant'
    assert client.timeout == 60

test('Client instantiation with custom options', test_client_custom)

# Test 5: All resource managers exist
def test_resources_exist():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    resources = [
        'auth', 'users', 'tenants', 'roles', 'permissions', 'modules',
        'api_keys', 'documents', 'capas', 'training', 'suppliers',
        'workflows', 'notifications', 'reports', 'audit_logs',
        'ai', 'qms', 'files', 'webhooks', 'health'
    ]
    for resource in resources:
        assert hasattr(client, resource), f'Missing resource: {resource}'

test('All resource managers exist', test_resources_exist)

# Test 6: Auth resource has all methods
def test_auth_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    methods = ['login', 'logout', 'logout_all', 'refresh', 'me', 'change_password', 'forgot_password', 'reset_password']
    for method in methods:
        assert hasattr(client.auth, method) and callable(getattr(client.auth, method)), f'Missing method: auth.{method}'

test('Auth resource has all methods', test_auth_methods)

# Test 7: Modules resource has all methods
def test_modules_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    methods = [
        'list', 'get', 'get_by_code', 'register', 'update', 'delete',
        'start', 'stop', 'restart', 'set_maintenance', 'deprecate', 'deregister',
        'update_status', 'update_version', 'health_check', 'health_history', 'stats', 'states'
    ]
    for method in methods:
        assert hasattr(client.modules, method) and callable(getattr(client.modules, method)), f'Missing method: modules.{method}'

test('Modules resource has all methods', test_modules_methods)

# Test 8: Users resource has all methods
def test_users_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    methods = ['list', 'get', 'create', 'update', 'delete', 'activate', 'deactivate', 'assign_role', 'remove_role']
    for method in methods:
        assert hasattr(client.users, method) and callable(getattr(client.users, method)), f'Missing method: users.{method}'

test('Users resource has all methods', test_users_methods)

# Test 9: Documents resource has all methods
def test_documents_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    methods = ['list', 'get', 'create', 'update', 'delete', 'submit_for_review', 'approve', 'reject', 'get_versions', 'create_version']
    for method in methods:
        assert hasattr(client.documents, method) and callable(getattr(client.documents, method)), f'Missing method: documents.{method}'

test('Documents resource has all methods', test_documents_methods)

# Test 10: CAPAs resource has all methods
def test_capas_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    methods = ['list', 'get', 'create', 'update', 'delete', 'add_action', 'update_action', 'complete_action', 'add_root_cause', 'close', 'verify_effectiveness']
    for method in methods:
        assert hasattr(client.capas, method) and callable(getattr(client.capas, method)), f'Missing method: capas.{method}'

test('CAPAs resource has all methods', test_capas_methods)

# Test 11: Training resource has all methods
def test_training_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    methods = ['list_courses', 'get_course', 'create_course', 'update_course', 'delete_course', 'assign_training', 'get_assignments', 'complete_training', 'get_transcript']
    for method in methods:
        assert hasattr(client.training, method) and callable(getattr(client.training, method)), f'Missing method: training.{method}'

test('Training resource has all methods', test_training_methods)

# Test 12: Suppliers resource has all methods
def test_suppliers_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    methods = ['list', 'get', 'create', 'update', 'delete', 'add_audit', 'get_audits', 'add_scorecard', 'get_scorecards', 'update_risk_level']
    for method in methods:
        assert hasattr(client.suppliers, method) and callable(getattr(client.suppliers, method)), f'Missing method: suppliers.{method}'

test('Suppliers resource has all methods', test_suppliers_methods)

# Test 13: Workflows resource has all methods
def test_workflows_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    methods = ['list_definitions', 'get_definition', 'create_definition', 'update_definition', 'list_instances', 'get_instance', 'start_workflow', 'complete_task', 'get_my_tasks']
    for method in methods:
        assert hasattr(client.workflows, method) and callable(getattr(client.workflows, method)), f'Missing method: workflows.{method}'

test('Workflows resource has all methods', test_workflows_methods)

# Test 14: AI resource has all methods
def test_ai_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    methods = ['complete', 'analyze_document', 'get_usage', 'list_prompts', 'get_prompt', 'create_prompt', 'query_knowledge']
    for method in methods:
        assert hasattr(client.ai, method) and callable(getattr(client.ai, method)), f'Missing method: ai.{method}'

test('AI resource has all methods', test_ai_methods)

# Test 15: QMS resource has all methods
def test_qms_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    methods = ['list_connections', 'get_connection', 'create_connection', 'update_connection', 'delete_connection', 'test_connection', 'sync', 'get_sync_status', 'list_sync_jobs', 'get_conflicts', 'resolve_conflict']
    for method in methods:
        assert hasattr(client.qms, method) and callable(getattr(client.qms, method)), f'Missing method: qms.{method}'

test('QMS resource has all methods', test_qms_methods)

# Test 16: Health resource has all methods
def test_health_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    methods = ['check', 'detailed', 'ready', 'live']
    for method in methods:
        assert hasattr(client.health, method) and callable(getattr(client.health, method)), f'Missing method: health.{method}'

test('Health resource has all methods', test_health_methods)

# Test 17: Webhooks resource has all methods
def test_webhooks_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    methods = ['list', 'get', 'create', 'update', 'delete', 'test', 'get_deliveries', 'retry_delivery']
    for method in methods:
        assert hasattr(client.webhooks, method) and callable(getattr(client.webhooks, method)), f'Missing method: webhooks.{method}'

test('Webhooks resource has all methods', test_webhooks_methods)

# Test 18: Files resource has all methods
def test_files_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    methods = ['upload', 'download', 'get', 'delete', 'list_for_entity']
    for method in methods:
        assert hasattr(client.files, method) and callable(getattr(client.files, method)), f'Missing method: files.{method}'

test('Files resource has all methods', test_files_methods)

# Test 19: set_tokens method works
def test_set_tokens():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    client.set_tokens('access-token-123', 'refresh-token-456')
    assert client._access_token == 'access-token-123', 'Access token not set'
    assert client._refresh_token == 'refresh-token-456', 'Refresh token not set'

test('set_tokens method works', test_set_tokens)

# Test 20: HTTP methods exist
def test_http_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    methods = ['get', 'post', 'put', 'patch', 'delete', 'request']
    for method in methods:
        assert hasattr(client, method) and callable(getattr(client, method)), f'Missing HTTP method: {method}'

test('HTTP methods exist (get, post, put, patch, delete)', test_http_methods)

# Test 21: Exception inheritance
def test_exception_inheritance():
    from qassure_sdk.exceptions import QAssureError, AuthenticationError, NotFoundError, ValidationError
    
    err = AuthenticationError('test', 401, {})
    assert isinstance(err, QAssureError), 'AuthenticationError should inherit from QAssureError'
    
    err = NotFoundError('test', 404, {})
    assert isinstance(err, QAssureError), 'NotFoundError should inherit from QAssureError'

test('Exception inheritance is correct', test_exception_inheritance)

# Test 22: Convenience login/logout methods exist
def test_convenience_methods():
    from qassure_sdk import QAssureClient
    client = QAssureClient()
    assert hasattr(client, 'login') and callable(client.login), 'login method missing'
    assert hasattr(client, 'logout') and callable(client.logout), 'logout method missing'

test('Convenience methods (login, logout) exist on client', test_convenience_methods)

# Summary
print('\n==========================================')
print(f'Results: {passed} passed, {failed} failed')
print('==========================================')

if failed > 0:
    sys.exit(1)
