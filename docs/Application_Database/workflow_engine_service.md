# Database ER Diagram — Workflow Engine Service

This service stores custom approval paths templates (definitions, steps, transitions), running instances, delegated roles, assigned tasks, and audit logs.

```mermaid
erDiagram
    workflow_definitions {
        uuid id PK
        uuid tenant_id FK
        string name
        text description
        string code
        integer version
        string entity_type
        string status
        boolean is_default
        jsonb config
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }

    workflow_steps {
        uuid id PK
        uuid workflow_definition_id FK
        uuid tenant_id FK
        string step_code
        string name
        text description
        integer sequence
        string step_type
        string assignee_type
        uuid assignee_id FK
        string assignee_role
        integer sla_hours
        integer sla_warning_hours
        integer sla_escalation_hours
        string escalation_to
        string escalation_role
        uuid escalation_user_id FK
        boolean requires_signature
        boolean requires_comment
        boolean requires_attachment
        jsonb available_actions
        jsonb form_config
        timestamp created_at
        timestamp updated_at
    }

    workflow_transitions {
        uuid id PK
        uuid workflow_definition_id FK
        uuid tenant_id FK
        uuid from_step_id FK
        uuid to_step_id FK
        string action
        string name
        text condition_expression
        jsonb condition_config
        boolean requires_signature
        boolean requires_comment
        string signature_meaning
        integer priority
        timestamp created_at
    }

    workflow_instances {
        uuid id PK
        uuid tenant_id FK
        uuid workflow_definition_id FK
        string entity_type
        uuid entity_id
        string entity_name
        uuid current_step_id FK
        string status
        timestamp started_at
        timestamp completed_at
        timestamp cancelled_at
        uuid cancelled_by FK
        text cancellation_reason
        jsonb context
        uuid started_by FK
        uuid project_id FK
    }

    workflow_tasks {
        uuid id PK
        uuid tenant_id FK
        uuid workflow_instance_id FK
        uuid workflow_step_id FK
        uuid assigned_to FK
        string assigned_role
        timestamp assigned_at
        uuid assigned_by FK
        string status
        timestamp due_at
        timestamp warning_sent_at
        timestamp escalated_at
        uuid escalated_to FK
        timestamp completed_at
        uuid completed_by FK
        string action_taken
        text comments
        uuid delegated_from FK
        text delegation_reason
        uuid signature_id
    }

    workflow_history {
        uuid id PK
        uuid tenant_id FK
        uuid workflow_instance_id FK
        string event_type
        uuid from_step_id FK
        uuid to_step_id FK
        string from_step_name
        string to_step_name
        string action
        text comments
        uuid performed_by FK
        string performed_by_name
        timestamp performed_at
        jsonb metadata
        uuid signature_id
    }

    workflow_delegates {
        uuid id PK
        uuid tenant_id FK
        uuid delegator_id FK
        uuid delegate_id FK
        uuid workflow_definition_id FK
        string entity_type
        timestamp starts_at
        timestamp ends_at
        boolean is_active
        text reason
        timestamp created_at
        uuid created_by FK
    }

    workflow_definitions ||--o{ workflow_steps : "stages"
    workflow_definitions ||--o{ workflow_transitions : "rules"
    workflow_steps ||--o{ workflow_transitions : "transitions_from"
    workflow_steps ||--o{ workflow_transitions : "transitions_to"
    workflow_definitions ||--o{ workflow_instances : "spawns"
    workflow_instances ||--o{ workflow_tasks : "contains"
    workflow_steps ||--o{ workflow_tasks : "executes_at"
    workflow_instances ||--o{ workflow_history : "logs"
    users ||--o{ workflow_delegates : "delegator"
    users ||--o{ workflow_delegates : "delegate"
```
