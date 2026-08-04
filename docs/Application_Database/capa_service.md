# Database ER Diagram — CAPA Service

This service manages CAPA records, immediate containment and corrective/preventive action items, links to other entities, structured 8D methodology reports, and compliance quality metrics.

```mermaid
erDiagram
    capas {
        uuid id PK
        uuid tenant_id FK
        string capa_number
        string title
        text description
        string capa_type
        string source
        string priority
        string risk_level
        text problem_statement
        text immediate_action
        text containment_action
        text root_cause
        string root_cause_method
        text[] contributing_factors
        text corrective_action
        text preventive_action
        text verification_method
        text verification_results
        text effectiveness_criteria
        boolean effectiveness_verified
        date effectiveness_date
        string status
        uuid owner_id FK
        string department
        date identified_date
        date target_date
        date closed_date
        string source_record_type
        uuid source_record_id
        uuid workflow_instance_id FK
        uuid project_id FK
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }

    capa_actions {
        uuid id PK
        uuid capa_id FK
        uuid tenant_id FK
        integer action_number
        text description
        string action_type
        uuid assigned_to FK
        string department
        date due_date
        date completed_date
        string status
        text evidence
        jsonb attachments
        uuid verified_by FK
        timestamp verified_at
        text verification_notes
        timestamp created_at
        timestamp updated_at
    }

    capa_related_records {
        uuid id PK
        uuid capa_id FK
        uuid tenant_id FK
        string related_type
        uuid related_id
        string related_number
        string relationship
        text notes
        uuid created_by FK
        timestamp created_at
    }

    capa_8d_reports {
        uuid id PK
        uuid capa_id FK UNIQUE
        uuid tenant_id FK
        jsonb d1_team
        timestamp d1_completed_at
        text d2_problem_description
        text d2_who
        text d2_what
        text d2_when
        text d2_where
        text d2_why
        text d2_how
        text d2_how_many
        timestamp d2_completed_at
        text d3_containment_actions
        text d3_verification
        timestamp d3_completed_at
        text d4_root_causes
        text d4_escape_point
        string d4_analysis_method
        timestamp d4_completed_at
        text d5_corrective_actions
        text d5_verification_plan
        timestamp d5_completed_at
        text d6_implementation_plan
        text d6_validation_results
        timestamp d6_completed_at
        text d7_preventive_actions
        text d7_systemic_changes
        timestamp d7_completed_at
        text d8_lessons_learned
        text d8_recognition
        timestamp d8_closed_at
        timestamp created_at
        timestamp updated_at
    }

    capa_metrics {
        uuid id PK
        uuid tenant_id FK
        date period_start
        date period_end
        integer total_opened
        integer total_closed
        integer total_overdue
        integer corrective_count
        integer preventive_count
        jsonb by_source
        jsonb by_department
        decimal avg_days_to_close
        decimal effectiveness_rate
        timestamp calculated_at
    }

    tenants ||--o{ capas : "manages"
    users ||--o{ capas : "owns"
    capas ||--o{ capa_actions : "has_actions"
    users ||--o{ capa_actions : "executes"
    users ||--o{ capa_actions : "verifies"
    capas ||--o{ capa_related_records : "links_to"
    capas ||--|| capa_8d_reports : "structures_as"
    tenants ||--o{ capa_metrics : "aggregates"
```
