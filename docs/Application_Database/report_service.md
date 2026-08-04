# Database ER Diagram — Report Service

This service acts as a centralized reporting & analytics engine, handling saved custom reports definitions, execution history, automated delivery schedules, KPIs definitions and snapshots, dashboard widgets, and user dashboard layouts.

```mermaid
erDiagram
    report_definitions {
        uuid id PK
        uuid tenant_id FK
        string name
        text description
        string code
        string report_type
        string category
        string module
        jsonb config
        string chart_type
        boolean is_system
        boolean is_public
        uuid owner_id FK
        boolean is_active
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    scheduled_reports {
        uuid id PK
        uuid tenant_id FK
        uuid report_definition_id FK
        string name
        string schedule_type
        jsonb schedule_config
        jsonb recipients
        string output_format
        boolean include_charts
        boolean is_active
        timestamp last_run_at
        timestamp next_run_at
        uuid created_by FK
        timestamp created_at
    }

    report_history {
        uuid id PK
        uuid tenant_id FK
        uuid report_definition_id FK
        uuid scheduled_report_id FK
        string report_name
        uuid executed_by FK
        timestamp executed_at
        jsonb parameters
        string status
        integer row_count
        integer execution_time_ms
        string output_path
        string output_format
        bigint file_size
        text error_message
    }

    kpi_definitions {
        uuid id PK
        uuid tenant_id FK
        string name
        string code
        text description
        string module
        string calculation_type
        jsonb query_config
        decimal target_value
        string target_direction
        decimal warning_threshold
        decimal critical_threshold
        string unit
        integer decimal_places
        boolean is_active
        timestamp created_at
    }

    kpi_values {
        uuid id PK
        uuid tenant_id FK
        uuid kpi_definition_id FK
        string period_type
        date period_start
        date period_end
        decimal value
        decimal previous_value
        decimal change_percent
        string status
        timestamp calculated_at
    }

    dashboard_widgets {
        uuid id PK
        uuid tenant_id FK
        string name
        string widget_type
        string data_source
        uuid source_id
        jsonb query_config
        string size
        jsonb chart_config
        integer position
        boolean is_system
        boolean is_default
        timestamp created_at
    }

    user_dashboards {
        uuid id PK
        uuid user_id FK
        uuid tenant_id FK
        string name
        boolean is_default
        jsonb widgets
        integer refresh_interval
        timestamp created_at
        timestamp updated_at
    }

    tenants ||--o{ report_definitions : "defines"
    users ||--o{ report_definitions : "owns_definition"
    tenants ||--o{ scheduled_reports : "schedules"
    report_definitions ||--o{ scheduled_reports : "uses_definition"
    tenants ||--o{ report_history : "logs_execution"
    report_definitions ||--o{ report_history : "executed_definition"
    scheduled_reports ||--o{ report_history : "triggered_from_schedule"
    users ||--o{ report_history : "executed_by_user"
    tenants ||--o{ kpi_definitions : "defines_kpis"
    tenants ||--o{ kpi_values : "tracks_values"
    kpi_definitions ||--o{ kpi_values : "records_snapshots"
    tenants ||--o{ dashboard_widgets : "defines_widgets"
    users ||--o{ user_dashboards : "owns_dashboard"
    tenants ||--o{ user_dashboards : "manages_dashboards"
```
