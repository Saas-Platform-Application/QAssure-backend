# Database ER Diagram — Project Management Service

This service tracks regulatory projects portfolios, active milestones dates, milestones task details, team access lists, enabled platform modules, and historical activity logs.

```mermaid
erDiagram
    projects {
        uuid id PK
        uuid tenant_id FK
        string name
        string code
        text description
        string project_type
        string status
        string priority
        date start_date
        date target_end_date
        date actual_end_date
        string product_name
        string product_code
        string device_class
        string regulatory_pathway
        string submission_type
        string regulatory_body
        string submission_number
        jsonb settings
        jsonb metadata
        uuid owner_id FK
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }

    project_members {
        uuid id PK
        uuid tenant_id FK
        uuid project_id FK
        uuid user_id FK
        string role
        jsonb permissions
        string status
        timestamp joined_at
        timestamp left_at
        uuid invited_by FK
        timestamp invited_at
    }

    project_milestones {
        uuid id PK
        uuid tenant_id FK
        uuid project_id FK
        string name
        text description
        string milestone_type
        date planned_date
        date actual_date
        string status
        integer sequence
        uuid depends_on FK
        uuid owner_id FK
        uuid completed_by FK
        text notes
    }

    project_modules {
        uuid id PK
        uuid tenant_id FK
        uuid project_id FK
        string module_code
        boolean is_enabled
        jsonb config
        timestamp enabled_at
        timestamp disabled_at
        uuid enabled_by FK
    }

    project_activity_log {
        uuid id PK
        uuid tenant_id FK
        uuid project_id FK
        string activity_type
        text description
        string entity_type
        uuid entity_id
        jsonb old_value
        jsonb new_value
        uuid performed_by FK
        timestamp performed_at
        jsonb metadata
    }

    tenants ||--o{ projects : "manages"
    users ||--o{ projects : "owns"
    projects ||--o{ project_members : "has_team"
    users ||--o{ project_members : "member_user"
    projects ||--o{ project_milestones : "tracks_milestones"
    projects ||--o{ project_modules : "uses_modules"
    projects ||--o{ project_activity_log : "records_activities"
    projects ||--o{ documents : "vaults_docs"
    projects ||--o{ capas : "issues_capas"
```
