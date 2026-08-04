# Database ER Diagram — Document Vault Service (AiDV)

This service manages controlled document categories, draft documents, document versioning histories, access trace audits, concurrent editing checkouts, training acknowledgments, document relationship links, and file templates.

```mermaid
erDiagram
    document_categories {
        uuid id PK
        uuid tenant_id FK
        string name
        string code
        text description
        uuid parent_id FK
        boolean requires_training
        integer retention_years
        integer review_frequency_months
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    documents {
        uuid id PK
        uuid tenant_id FK
        string document_number
        string title
        text description
        uuid category_id FK
        string document_type
        string status
        uuid current_version_id
        uuid owner_id FK
        string department
        date effective_date
        date next_review_date
        date obsolete_date
        uuid workflow_instance_id FK
        uuid project_id FK
        text[] tags
        jsonb custom_fields
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }

    document_versions {
        uuid id PK
        uuid document_id FK
        uuid tenant_id FK
        string version_number
        integer major_version
        integer minor_version
        string status
        string file_name
        string file_path
        bigint file_size
        string mime_type
        string file_hash
        text content
        text content_html
        text change_summary
        string change_reason
        uuid approved_by FK
        timestamp approved_at
        uuid signature_id
        uuid workflow_instance_id FK
        uuid created_by FK
        timestamp created_at
    }

    document_access_log {
        uuid id PK
        uuid document_id FK
        uuid version_id FK
        uuid tenant_id FK
        uuid user_id FK
        string action
        inet ip_address
        text user_agent
        timestamp accessed_at
    }

    document_checkouts {
        uuid id PK
        uuid document_id FK
        uuid tenant_id FK
        uuid checked_out_by FK
        timestamp checked_out_at
        timestamp expires_at
        text reason
    }

    document_training {
        uuid id PK
        uuid document_id FK
        uuid version_id FK
        uuid tenant_id FK
        string required_for
        string role_name
        string department_name
        uuid user_id FK
        integer due_within_days
        boolean requires_acknowledgment
        boolean requires_quiz
        integer quiz_pass_score
        timestamp created_at
    }

    document_links {
        uuid id PK
        uuid tenant_id FK
        uuid source_document_id FK
        uuid target_document_id FK
        string link_type
        text description
        uuid created_by FK
        timestamp created_at
    }

    document_templates {
        uuid id PK
        uuid tenant_id FK
        string name
        text description
        string document_type
        uuid category_id FK
        text template_content
        text template_html
        string file_path
        boolean is_active
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    tenants ||--o{ document_categories : "defines"
    document_categories ||--o{ document_categories : "nested_under"
    tenants ||--o{ documents : "vaults"
    document_categories ||--o{ documents : "classifies"
    users ||--o{ documents : "owns"
    documents ||--o{ document_versions : "has_history"
    tenants ||--o{ document_versions : "versions_in"
    users ||--o{ document_versions : "approves_or_creates"
    documents ||--o{ document_access_log : "tracked_on"
    users ||--o{ document_access_log : "accessed_by"
    documents ||--o{ document_checkouts : "locked_by"
    users ||--o{ document_checkouts : "checked_out_by"
    documents ||--o{ document_training : "requires_training_for"
    document_versions ||--o{ document_training : "linked_to_version"
    users ||--o{ document_training : "trainee"
    documents ||--o{ document_links : "points_from"
    documents ||--o{ document_links : "points_to"
    tenants ||--o{ document_templates : "templates_for"
    document_categories ||--o{ document_templates : "template_category"
```
