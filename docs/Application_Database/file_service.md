# Database ER Diagram — File Service

This service acts as a centralized registry for cloud and local files attachments, metadata, version history, access history logs, temporary shares, and storage quotas.

```mermaid
erDiagram
    file_attachments {
        uuid id PK
        uuid tenant_id FK
        string original_name
        string stored_name
        string file_path
        string mime_type
        bigint file_size
        string checksum
        string storage_provider
        string storage_bucket
        string storage_region
        string entity_type
        uuid entity_id
        string category
        text description
        text[] tags
        integer version
        boolean is_current_version
        uuid previous_version_id FK
        boolean is_public
        string access_level
        integer download_count
        boolean has_thumbnail
        string thumbnail_path
        jsonb metadata
        string scan_status
        timestamp scanned_at
        uuid uploaded_by FK
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    file_access_logs {
        uuid id PK
        uuid tenant_id FK
        uuid file_id FK
        uuid user_id FK
        string action
        string ip_address
        string user_agent
        timestamp created_at
    }

    file_shares {
        uuid id PK
        uuid tenant_id FK
        uuid file_id FK
        string share_token
        string share_type
        uuid shared_with_user_id FK
        string shared_with_email
        string permissions
        string password_hash
        timestamp expires_at
        integer max_downloads
        integer current_downloads
        uuid created_by FK
        timestamp created_at
        timestamp last_accessed_at
        boolean is_active
    }

    storage_quotas {
        uuid id PK
        uuid tenant_id FK UNIQUE
        bigint max_storage_bytes
        bigint max_file_size_bytes
        bigint used_storage_bytes
        integer file_count
        text[] allowed_mime_types
        text[] blocked_extensions
        timestamp updated_at
    }

    tenants ||--o{ file_attachments : "owns"
    users ||--o{ file_attachments : "uploads"
    file_attachments ||--o{ file_attachments : "has_older_versions"
    tenants ||--o{ file_access_logs : "records_access"
    file_attachments ||--o{ file_access_logs : "tracked_on"
    users ||--o{ file_access_logs : "accessed_by"
    tenants ||--o{ file_shares : "owns_shares"
    file_attachments ||--o{ file_shares : "shared_file"
    users ||--o{ file_shares : "shared_by"
    tenants ||--|| storage_quotas : "allocated_quota"
```
