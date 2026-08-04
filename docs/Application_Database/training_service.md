# Database ER Diagram — Training Service

This service tracks employee compliance training courses, curricula groups, course contents, user assignments status, certification histories, quiz questions, quiz attempts, and competency requirements.

```mermaid
erDiagram
    training_courses {
        uuid id PK
        uuid tenant_id FK
        string course_code
        string title
        text description
        string course_type
        string category
        decimal duration_hours
        integer passing_score
        integer max_attempts
        text[] prerequisites
        text[] required_for_roles
        text[] required_for_departments
        string status
        string version
        boolean requires_recertification
        integer recertification_months
        string content_url
        uuid document_id FK
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }

    training_curricula {
        uuid id PK
        uuid tenant_id FK
        name VARCHAR
        text description
        text[] target_roles
        text[] target_departments
        string status
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    curriculum_courses {
        uuid id PK
        uuid curriculum_id FK
        uuid course_id FK
        integer sequence
        boolean is_required
    }

    training_assignments {
        uuid id PK
        uuid tenant_id FK
        uuid course_id FK
        uuid curriculum_id FK
        uuid user_id FK
        uuid assigned_by FK
        timestamp assigned_at
        string reason
        date due_date
        date extended_due_date
        text extension_reason
        string status
        timestamp started_at
        timestamp completed_at
        integer attempts
        decimal score
        boolean passed
        uuid waived_by FK
        timestamp waived_at
        text waiver_reason
        uuid workflow_instance_id FK
        timestamp created_at
        timestamp updated_at
    }

    training_records {
        uuid id PK
        uuid tenant_id FK
        uuid assignment_id FK
        uuid course_id FK
        string course_code
        string course_title
        string course_version
        uuid user_id FK
        timestamp completed_at
        decimal score
        boolean passed
        string certificate_number
        date expires_at
        uuid signature_id
        uuid instructor_id FK
        string instructor_name
        string external_provider
        string external_certificate_url
        timestamp created_at
    }

    training_quiz_questions {
        uuid id PK
        uuid course_id FK
        uuid tenant_id FK
        text question_text
        string question_type
        jsonb options
        text[] correct_answers
        integer points
        text explanation
        integer sequence
        boolean is_active
        timestamp created_at
    }

    training_quiz_attempts {
        uuid id PK
        uuid assignment_id FK
        uuid user_id FK
        uuid tenant_id FK
        integer attempt_number
        timestamp started_at
        timestamp completed_at
        jsonb answers
        decimal score
        boolean passed
        integer time_spent_seconds
    }

    competency_definitions {
        uuid id PK
        uuid tenant_id FK
        string name
        text description
        string category
        jsonb levels
        jsonb role_requirements
        timestamp created_at
    }

    user_competencies {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        uuid competency_id FK
        integer current_level
        integer target_level
        timestamp assessed_at
        uuid assessed_by FK
        text evidence
        uuid training_record_id FK
        date expires_at
    }

    tenants ||--o{ training_courses : "defines"
    tenants ||--o{ training_curricula : "defines"
    training_curricula ||--o{ curriculum_courses : "contains"
    training_courses ||--o{ curriculum_courses : "included_in"
    tenants ||--o{ training_assignments : "assigns"
    training_courses ||--o{ training_assignments : "linked_to"
    training_curricula ||--o{ training_assignments : "associated_with"
    users ||--o{ training_assignments : "assigned_to"
    tenants ||--o{ training_records : "logs"
    training_courses ||--o{ training_records : "completed_course"
    users ||--o{ training_records : "earned_by"
    training_courses ||--o{ training_quiz_questions : "tests_knowledge"
    training_assignments ||--o{ training_quiz_attempts : "attempts_for"
    users ||--o{ training_quiz_attempts : "attempted_by"
    tenants ||--o{ competency_definitions : "defines"
    users ||--o{ user_competencies : "holds"
    competency_definitions ||--o{ user_competencies : "linked_to_def"
```
