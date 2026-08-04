# Database ER Diagram — Prompt Management Service

This service manages versions, system messages, input variables, and evaluation/testing benchmarks (test cases, test runs, test scores) for AI prompt templates.

```mermaid
erDiagram
    ai_prompt_templates {
        uuid id PK
        uuid tenant_id FK
        string name
        text description
        string use_case
        integer version
        text template
        text system_message
        jsonb variables
        jsonb default_parameters
        jsonb recommended_models
        string status
        boolean is_default
        bigint usage_count
        decimal avg_cost_usd
        integer avg_latency_ms
        decimal success_rate
        jsonb tags
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }

    ai_prompt_versions {
        uuid id PK
        uuid prompt_id FK
        integer version
        text template
        text system_message
        jsonb variables
        jsonb default_parameters
        text change_notes
        uuid created_by FK
        timestamp created_at
    }

    ai_prompt_test_cases {
        uuid id PK
        uuid prompt_id FK
        uuid tenant_id FK
        string name
        text description
        jsonb input_variables
        text expected_output
        jsonb tags
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    ai_prompt_test_results {
        uuid id PK
        uuid test_case_id FK
        integer prompt_version
        string provider
        string model
        jsonb input_variables
        text output
        integer tokens_used
        numeric cost_usd
        integer latency_ms
        boolean passed
        numeric score
        text feedback
        uuid run_by FK
        timestamp created_at
    }

    tenants ||--o{ ai_prompt_templates : "customizes"
    ai_prompt_templates ||--o{ ai_prompt_versions : "has_history"
    ai_prompt_templates ||--o{ ai_prompt_test_cases : "tested_by"
    tenants ||--o{ ai_prompt_test_cases : "owns_test_cases"
    ai_prompt_test_cases ||--o{ ai_prompt_test_results : "evaluated_on"
    users ||--o{ ai_prompt_test_results : "executed_by"
```
