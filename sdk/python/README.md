# QAssure Python SDK

Official Python SDK for the QAssure Platform API.

## Installation
```bash
pip install qassure-sdk
```

## Quick Start
```python
from qassure_sdk import QAssureClient

# Initialize client
client = QAssureClient(
    base_url="https://api.qassure.ai",
    tenant_id="your-tenant-id"
)

# Login
client.login("user@example.com", "password")

# List modules
modules = client.modules.list()
print(modules["data"])

# Register a new module
new_module = client.modules.register({
    "module_id": "aich",
    "name": "AiCH - AI Compliance Helper",
    "version": "1.0.0",
    "runtime_language": "python",
    "base_url": "http://aich-service:3001",
    "health_endpoint": "/health",
    "endpoints": [
        {"path": "/api/v1/aich/analyze", "method": "POST", "description": "Analyze document"}
    ],
    "kafka_topics": {
        "publish": ["qassure.aich.events"],
        "subscribe": ["qassure.document.events"]
    }
})

# Start the module
client.modules.start(new_module["data"]["id"])

# Check health
health = client.modules.health_check(new_module["data"]["id"])
print(f"Status: {health['data']['status']}")
```

## Resource Reference

### Authentication
```python
client.auth.login(email, password)
client.auth.logout()
client.auth.me()
client.auth.change_password(current, new)
client.auth.forgot_password(email)
client.auth.reset_password(token, new_password)
```

### Modules
```python
client.modules.list(page=1, limit=20, status="running")
client.modules.get(module_id)
client.modules.register(data)
client.modules.update(module_id, data)
client.modules.delete(module_id)
client.modules.start(module_id)
client.modules.stop(module_id, reason="Maintenance")
client.modules.restart(module_id)
client.modules.set_maintenance(module_id, reason)
client.modules.deprecate(module_id)
client.modules.health_check(module_id)
client.modules.health_history(module_id, limit=100)
client.modules.stats()
client.modules.states()
```

### Users
```python
client.users.list(page=1, limit=20)
client.users.get(user_id)
client.users.create(data)
client.users.update(user_id, data)
client.users.delete(user_id)
client.users.activate(user_id)
client.users.deactivate(user_id)
client.users.assign_role(user_id, role_id)
client.users.remove_role(user_id, role_id)
```

### Documents
```python
client.documents.list(page=1, limit=20, status="approved")
client.documents.get(document_id)
client.documents.create(data)
client.documents.update(document_id, data)
client.documents.submit_for_review(document_id)
client.documents.approve(document_id, comments)
client.documents.reject(document_id, reason)
client.documents.get_versions(document_id)
```

### CAPAs
```python
client.capas.list(page=1, limit=20, priority="high")
client.capas.get(capa_id)
client.capas.create(data)
client.capas.add_action(capa_id, action_data)
client.capas.complete_action(capa_id, action_id)
client.capas.add_root_cause(capa_id, data)
client.capas.close(capa_id, data)
client.capas.verify_effectiveness(capa_id, data)
```

### Training
```python
client.training.list_courses()
client.training.create_course(data)
client.training.assign_training(data)
client.training.complete_training(assignment_id, data)
client.training.get_transcript(user_id)
```

### Suppliers
```python
client.suppliers.list(page=1, limit=20, risk_level="high")
client.suppliers.get(supplier_id)
client.suppliers.create(data)
client.suppliers.add_audit(supplier_id, audit_data)
client.suppliers.add_scorecard(supplier_id, scorecard_data)
client.suppliers.update_risk_level(supplier_id, "medium", "Improved performance")
```

### Workflows
```python
client.workflows.list_definitions()
client.workflows.create_definition(data)
client.workflows.start_workflow(definition_id, data)
client.workflows.complete_task(task_id, data)
client.workflows.get_my_tasks()
```

### AI Gateway
```python
client.ai.complete(prompt, model="claude-3-sonnet")
client.ai.analyze_document(document_id, "compliance")
client.ai.query_knowledge(query)
client.ai.get_usage(start_date, end_date)
```

### QMS Integration
```python
client.qms.list_connections()
client.qms.create_connection(data)
client.qms.test_connection(connection_id)
client.qms.sync(connection_id, entity_types=["documents", "capas"])
client.qms.get_conflicts(connection_id)
client.qms.resolve_conflict(conflict_id, "use_local")
```

### Files
```python
client.files.upload("/path/to/file.pdf", "document", document_id)
client.files.download(file_id)
client.files.list_for_entity("capa", capa_id)
```

### Webhooks
```python
client.webhooks.list()
client.webhooks.create(data)
client.webhooks.test(webhook_id)
client.webhooks.get_deliveries(webhook_id)
```

## Error Handling
```python
from qassure_sdk import (
    QAssureClient,
    AuthenticationError,
    NotFoundError,
    ValidationError,
    InvalidStateTransitionError
)

client = QAssureClient(base_url="https://api.qassure.ai")

try:
    client.modules.start(module_id)
except InvalidStateTransitionError as e:
    print(f"Cannot start module: {e.message}")
except NotFoundError:
    print("Module not found")
except AuthenticationError:
    print("Please login first")
except ValidationError as e:
    print(f"Invalid request: {e.message}")
```

## License

MIT
