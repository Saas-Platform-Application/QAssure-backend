# Database ER Diagram — Security & FDA 21 CFR Part 11 Compliance

This service tracks electronic signature manifestations, password policies, hashes history to prevent reuse, and periodic access certification review campaigns.

```mermaid
erDiagram
    electronic_signatures {
        uuid id PK
        uuid user_id FK
        uuid tenant_id FK
        string resource_type
        string resource_id
        string resource_name
        string action
        text meaning
        string auth_method
        string signature_hash
        inet ip_address
        text user_agent
        jsonb device_info
        jsonb location
        timestamp signed_at
        integer signature_order
        integer required_signatures
        uuid workflow_id
        boolean is_valid
        timestamp invalidated_at
        uuid invalidated_by FK
        text invalidation_reason
        timestamp created_at
    }

    password_policies {
        uuid id PK
        uuid tenant_id FK UNIQUE
        integer min_length
        integer max_length
        boolean require_uppercase
        boolean require_lowercase
        boolean require_numbers
        boolean require_special_chars
        string special_chars_allowed
        integer password_history_count
        integer password_expiry_days
        integer password_expiry_warning_days
        integer max_failed_attempts
        integer lockout_duration_minutes
        integer session_timeout_minutes
        integer concurrent_sessions_allowed
        boolean mfa_required
        text[] mfa_required_for_roles
        boolean prevent_username_in_password
        boolean prevent_common_passwords
        boolean is_active
        timestamp created_at
        timestamp updated_at
        uuid created_by FK
        uuid updated_by FK
    }

    password_history {
        uuid id PK
        uuid user_id FK
        uuid tenant_id FK
        string password_hash
        timestamp created_at
        timestamp changed_at
        string change_reason
        inet changed_from_ip
    }

    access_reviews {
        uuid id PK
        uuid tenant_id FK
        string name
        text description
        string review_type
        string scope_type
        jsonb scope_criteria
        string frequency
        date start_date
        date due_date
        uuid reviewer_id FK
        string reviewer_role
        string status
        timestamp completed_at
        uuid completed_by FK
        integer total_users
        integer certified_count
        integer revoked_count
        integer pending_count
        boolean auto_revoke_on_overdue
        integer auto_revoke_after_days
        timestamp created_at
        timestamp updated_at
        uuid created_by FK
    }

    access_review_items {
        uuid id PK
        uuid review_id FK
        uuid tenant_id FK
        uuid user_id FK
        string user_email
        string user_name
        text[] current_roles
        text[] current_permissions
        timestamp last_login_at
        string decision
        text decision_reason
        text[] new_roles
        uuid decided_by FK
        timestamp decided_at
        boolean executed
        timestamp executed_at
        text execution_error
        timestamp created_at
    }

    security_settings {
        uuid id PK
        uuid tenant_id FK UNIQUE
        integer session_timeout_minutes
        integer idle_timeout_minutes
        boolean force_single_session
        boolean ip_whitelist_enabled
        inet[] ip_whitelist
        inet[] ip_blacklist
        boolean geo_restriction_enabled
        string[] allowed_countries
        integer audit_retention_years
        boolean audit_all_reads
        text[] audit_sensitive_fields
        boolean esig_require_pin
        integer esig_pin_length
        boolean esig_require_reason
        integer esig_session_timeout_minutes
        integer api_rate_limit_per_minute
        integer api_key_expiry_days
        boolean notify_on_failed_login
        boolean notify_on_password_change
        boolean notify_on_new_device
        boolean notify_on_permission_change
        string security_contact_email
        string compliance_mode
        timestamp created_at
        timestamp updated_at
        uuid updated_by FK
    }

    users ||--o{ electronic_signatures : "signs"
    tenants ||--o{ electronic_signatures : "records_sig"
    tenants ||--|| password_policies : "enforces"
    users ||--o{ password_history : "has_passwords"
    tenants ||--o{ access_reviews : "schedules_reviews"
    users ||--o{ access_reviews : "performs_review"
    access_reviews ||--o{ access_review_items : "contains"
    users ||--o{ access_review_items : "reviewed"
    tenants ||--|| security_settings : "configures"
```
