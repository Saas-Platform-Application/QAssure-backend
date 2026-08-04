# Database ER Diagram — Billing, Licensing & Notifications Service

This service tracks subscription licensing tiers, tenant billing invoices, customer payment status histories, user in-app notifications, digest templates, escalations, webhook subscriptions, and delivery logs.

```mermaid
erDiagram
    license_types {
        uuid id PK
        string name
        string code
        text description
        jsonb features
        boolean is_active
        timestamp created_at
    }

    license_tiers {
        uuid id PK
        uuid license_type_id FK
        string name
        decimal price_monthly
        decimal price_yearly
        integer max_users
        integer max_storage_gb
        boolean is_active
        timestamp created_at
    }

    tenant_licenses {
        uuid id PK
        uuid tenant_id FK
        uuid license_tier_id FK
        string status
        date start_date
        date end_date
        boolean auto_renew
        jsonb limits_override
        timestamp created_at
    }

    billing_invoices {
        uuid id PK
        uuid tenant_id FK
        uuid tenant_license_id FK
        string invoice_number
        decimal amount
        decimal tax
        decimal discount
        decimal total
        date due_date
        date paid_date
        string status
        string invoice_pdf_url
        timestamp created_at
    }

    billing_payments {
        uuid id PK
        uuid invoice_id FK
        uuid tenant_id FK
        decimal amount
        string payment_method
        string gateway_transaction_id
        string status
        timestamp paid_at
    }

    notifications {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        string category
        string title
        text message
        jsonb action_url
        boolean is_read
        timestamp read_at
        timestamp created_at
    }

    notification_preferences {
        uuid id PK
        uuid user_id FK UNIQUE
        uuid tenant_id FK
        boolean email_enabled
        boolean in_app_enabled
        boolean push_enabled
        jsonb category_settings
        timestamp updated_at
    }

    notification_templates {
        uuid id PK
        uuid tenant_id FK
        string name
        string code UNIQUE
        string subject
        text body_text
        text body_html
        jsonb variables
        timestamp created_at
    }

    escalation_rules {
        uuid id PK
        uuid tenant_id FK
        string name
        string event_type
        integer delay_hours
        string action_type
        jsonb action_config
        boolean is_active
    }

    escalation_history {
        uuid id PK
        uuid tenant_id FK
        uuid rule_id FK
        string entity_type
        uuid entity_id
        uuid triggered_by FK
        timestamp executed_at
    }

    event_subscriptions {
        uuid id PK
        uuid tenant_id FK
        string event_type
        string target_url
        string secret_token
        boolean is_active
    }

    webhooks {
        uuid id PK
        uuid tenant_id FK
        string name
        string url
        string secret
        string[] events
        boolean is_active
    }

    webhook_deliveries {
        uuid id PK
        uuid webhook_id FK
        uuid tenant_id FK
        string event_type
        jsonb payload
        integer response_status
        text response_body
        integer attempt
        timestamp delivered_at
    }

    tenants ||--o{ tenant_licenses : "subscribed_to"
    license_tiers ||--o{ tenant_licenses : "tier_limits"
    license_types ||--o{ license_tiers : "tier_definition"
    tenants ||--o{ billing_invoices : "billed"
    tenant_licenses ||--o{ billing_invoices : "for_subscription"
    billing_invoices ||--o{ billing_payments : "paid_by"
    users ||--o{ notifications : "receives"
    users ||--|{ notification_preferences : "configures"
    tenants ||--o{ notification_templates : "customizes"
    tenants ||--o{ escalation_rules : "escalates_using"
    escalation_rules ||--o{ escalation_history : "tracks"
    tenants ||--o{ event_subscriptions : "subscribes_to"
    tenants ||--o{ webhooks : "configures_webhooks"
    webhooks ||--o{ webhook_deliveries : "triggers_delivery"
```
