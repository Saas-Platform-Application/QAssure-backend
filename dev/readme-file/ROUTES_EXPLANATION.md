# Routes Explanation: `/files` and `/config`

## Overview

This document explains the purpose and functionality of two important route modules in the QAssure application:
- **`/files`** - File Attachment Management Routes
- **`/config`** - System Configuration Routes

---

## 1. `/files` Route - File Attachment Management

**Route File**: `src/routes/file-attachment.routes.js`  
**Controller**: `src/controllers/file-attachment.controller.js`  
**Service**: `src/services/file-attachment.service.js`

### Purpose
The `/files` route provides a **centralized file management system** for the QAssure platform. It handles file uploads, downloads, storage, sharing, and organization across all modules of the application.

### Key Features

#### 📤 **File Upload**
- **Single file upload**: `POST /api/v1/files/upload`
- **Multiple file upload**: `POST /api/v1/files/upload/multiple` (up to 10 files)
- **Security**: Blocks dangerous file types (`.exe`, `.bat`, `.cmd`, `.sh`, `.ps1`, `.msi`, `.dll`)
- **Size limit**: 100 MB per file
- **Entity association**: Files are linked to specific entities (e.g., documents, CAPAs, audits, projects)

#### 📥 **File Retrieval**
- **List files**: `GET /api/v1/files` - Get all files with filtering
- **Get file details**: `GET /api/v1/files/:id` - Get metadata about a file
- **Download file**: `GET /api/v1/files/:id/download` - Download the actual file
- **Preview file**: `GET /api/v1/files/:id/preview` - Preview file in browser
- **Get by entity**: `GET /api/v1/files/entity/:entity_type/:entity_id` - Get all files for a specific entity

#### 📊 **Storage Management**
- **Storage stats**: `GET /api/v1/files/stats` - Get storage usage statistics
- **Quota management**: 
  - `GET /api/v1/files/quota` - Check storage quota
  - `PUT /api/v1/files/quota` - Update storage quota (admin only)

#### 🔗 **File Sharing**
- **Create share link**: `POST /api/v1/files/:id/share` - Generate a shareable token
- **Access shared file**: `GET /api/v1/files/shared/:token` - Public access via token
- **Revoke share**: `DELETE /api/v1/files/shares/:shareId` - Remove sharing access

#### 🗑️ **File Management**
- **Delete file**: `DELETE /api/v1/files/:id` - Remove file and its database record

### How It Works

1. **File Storage**:
   - Files are stored in organized directories by entity type (e.g., `uploads/documents/`, `uploads/capas/`)
   - Each file gets a unique UUID-based filename
   - Original filename and metadata are stored in the database

2. **Entity Association**:
   - Files are linked to entities via `entity_type` and `entity_id`
   - Example: A file can be attached to a CAPA (`entity_type: 'capa'`, `entity_id: 'uuid'`)
   - This allows files to be organized and retrieved by their context

3. **Security**:
   - File type validation (blocks executable files)
   - Size limits enforced
   - Storage quota per tenant
   - Access control via permissions (`files:read`, `files:write`, `files:admin`)

4. **Sharing**:
   - Generate time-limited share tokens
   - Public access without authentication via token
   - Track share access logs

### Use Cases in the Application

- **Document Management**: Attach files to documents, SOPs, policies
- **CAPA Management**: Attach evidence, photos, reports to CAPA records
- **Audit Management**: Attach audit findings, photos, evidence
- **Project Management**: Attach project files, specifications, reports
- **Training**: Attach training materials, certificates
- **Supplier Management**: Attach supplier documents, certificates, contracts

---

## 2. `/config` Route - System Configuration

**Route File**: `src/routes/system-config.routes.js`  
**Controller**: `src/controllers/system-config.controller.js`  
**Service**: `src/services/system-config.service.js`

### Purpose
The `/config` route provides **system-wide configuration management** for the QAssure platform. It allows administrators to configure settings, branding, security policies, feature flags, webhooks, and email templates.

### Key Features

#### ⚙️ **System Settings**
- **Get all settings**: `GET /api/v1/config/settings` - Retrieve all or category-specific settings
- **Get single setting**: `GET /api/v1/config/settings/:category/:key` - Get a specific setting value
- **Update setting**: `PUT /api/v1/config/settings/:category/:key` - Update a single setting
- **Bulk update**: `PUT /api/v1/config/settings` - Update multiple settings at once

**Settings Categories**:
- `general` - General platform settings
- `notifications` - Notification preferences
- `integrations` - Third-party integrations
- `compliance` - Compliance-related settings
- `performance` - Performance tuning
- Custom categories as needed

#### 🎨 **Branding Configuration**
- **Get branding**: `GET /api/v1/config/branding` - Get current branding settings
- **Update branding**: `PUT /api/v1/config/branding` - Update logo, colors, company name

**Branding Settings**:
- Logo URL
- Primary/secondary colors
- Company name
- Footer text
- Custom CSS

#### 🔒 **Security Policies**
- **Get security policy**: `GET /api/v1/config/security` - Get security configuration
- **Update security policy**: `PUT /api/v1/config/security` - Update security settings (admin only)

**Security Settings**:
- Session timeout
- Password policies
- IP whitelist/blacklist
- Geo restrictions
- Audit retention
- Electronic signature requirements
- API rate limiting
- Compliance mode (FDA Part 11, EU Annex 11, HIPAA, ISO 13485)

#### 🚩 **Feature Flags**
- **List flags**: `GET /api/v1/config/features` - Get all feature flags
- **Get flag**: `GET /api/v1/config/features/:flagKey` - Get specific flag
- **Check flag**: `GET /api/v1/config/features/:flagKey/check` - Public endpoint to check if feature is enabled
- **Create flag**: `POST /api/v1/config/features` - Create new feature flag
- **Update flag**: `PUT /api/v1/config/features/:id` - Update feature flag
- **Delete flag**: `DELETE /api/v1/config/features/:id` - Remove feature flag

**Feature Flags Use Cases**:
- Enable/disable features per tenant
- A/B testing
- Gradual feature rollouts
- Maintenance mode
- Beta features

#### 🔗 **Webhooks**
- **List webhooks**: `GET /api/v1/config/webhooks` - Get all webhook configurations
- **Get webhook**: `GET /api/v1/config/webhooks/:id` - Get specific webhook
- **Create webhook**: `POST /api/v1/config/webhooks` - Create new webhook
- **Update webhook**: `PUT /api/v1/config/webhooks/:id` - Update webhook
- **Delete webhook**: `DELETE /api/v1/config/webhooks/:id` - Remove webhook
- **Test webhook**: `POST /api/v1/config/webhooks/:id/test` - Send test event

**Webhook Features**:
- Event subscriptions (e.g., document.created, capa.closed)
- Custom payloads
- Authentication (API keys, OAuth)
- Retry logic
- Delivery logs

#### 📧 **Email Templates**
- **List templates**: `GET /api/v1/config/email-templates` - Get all email templates
- **Get template**: `GET /api/v1/config/email-templates/:templateCode` - Get specific template
- **Create template**: `POST /api/v1/config/email-templates` - Create new template
- **Update template**: `PUT /api/v1/config/email-templates/:id` - Update template

**Email Template Features**:
- HTML/text templates
- Variable substitution
- Multi-language support
- Template versioning

#### 📮 **SMTP Configuration**
- **Get SMTP config**: `GET /api/v1/config/smtp` - Get SMTP settings (admin only)
- **Update SMTP config**: `PUT /api/v1/config/smtp` - Update SMTP settings (admin only)
- **Test SMTP**: `POST /api/v1/config/smtp/test` - Send test email (admin only)

**SMTP Settings**:
- SMTP server host/port
- Authentication credentials
- TLS/SSL configuration
- From address
- Reply-to address

### How It Works

1. **Settings Storage**:
   - Settings stored in `system_settings` table
   - Support for global (tenant_id = NULL) and tenant-specific settings
   - Tenant-specific settings override global settings
   - Settings cached for performance (5-minute TTL)

2. **Configuration Hierarchy**:
   ```
   Global Settings (tenant_id = NULL)
        ↓ (can be overridden by)
   Tenant-Specific Settings (tenant_id = UUID)
   ```

3. **Security**:
   - Different permission levels:
     - `settings:read` - Read settings
     - `settings:write` - Update settings
     - `settings:admin` - Admin-only settings (security, SMTP)

4. **Feature Flags**:
   - Enable/disable features without code deployment
   - Per-tenant configuration
   - Public check endpoint for frontend feature toggles

5. **Webhooks**:
   - Event-driven integrations
   - Automatic retries on failure
   - Delivery tracking and logging

### Use Cases in the Application

- **Multi-tenant Configuration**: Different settings per tenant
- **Compliance Management**: Configure compliance modes (FDA Part 11, ISO 13485)
- **Customization**: Brand the platform per tenant
- **Feature Control**: Enable/disable features per tenant
- **Integration**: Configure webhooks for external systems
- **Communication**: Manage email templates and SMTP settings
- **Security**: Configure security policies per tenant

---

## Integration with Other Modules

### Files Route Integration
The `/files` route is used by:
- **Document Management**: Attach files to documents
- **CAPA Module**: Attach evidence and reports
- **Audit Module**: Attach audit findings
- **Project Module**: Attach project files
- **Training Module**: Attach training materials
- **Supplier Module**: Attach supplier documents

### Config Route Integration
The `/config` route affects:
- **All Modules**: Feature flags control module availability
- **Authentication**: Security policies affect login/session
- **Notifications**: Email templates and SMTP affect all notifications
- **Branding**: Affects UI appearance across all modules
- **Integrations**: Webhooks connect to external systems
- **Compliance**: Security settings ensure regulatory compliance

---

## API Endpoints Summary

### Files Endpoints
```
POST   /api/v1/files/upload              - Upload single file
POST   /api/v1/files/upload/multiple     - Upload multiple files
GET    /api/v1/files                     - List files
GET    /api/v1/files/stats               - Storage statistics
GET    /api/v1/files/quota               - Get quota
PUT    /api/v1/files/quota               - Update quota
GET    /api/v1/files/:id                 - Get file details
GET    /api/v1/files/:id/download       - Download file
GET    /api/v1/files/:id/preview         - Preview file
GET    /api/v1/files/entity/:type/:id   - Get files by entity
DELETE /api/v1/files/:id                - Delete file
POST   /api/v1/files/:id/share           - Create share link
GET    /api/v1/files/shared/:token       - Access shared file
DELETE /api/v1/files/shares/:shareId     - Revoke share
```

### Config Endpoints
```
GET    /api/v1/config/settings                    - Get settings
GET    /api/v1/config/settings/:category/:key     - Get setting
PUT    /api/v1/config/settings/:category/:key     - Update setting
PUT    /api/v1/config/settings                     - Bulk update
GET    /api/v1/config/branding                     - Get branding
PUT    /api/v1/config/branding                     - Update branding
GET    /api/v1/config/security                     - Get security policy
PUT    /api/v1/config/security                     - Update security
GET    /api/v1/config/features                    - List feature flags
GET    /api/v1/config/features/:flagKey           - Get feature flag
GET    /api/v1/config/features/:flagKey/check     - Check feature flag
POST   /api/v1/config/features                    - Create feature flag
PUT    /api/v1/config/features/:id                - Update feature flag
DELETE /api/v1/config/features/:id                - Delete feature flag
GET    /api/v1/config/webhooks                    - List webhooks
GET    /api/v1/config/webhooks/:id                - Get webhook
POST   /api/v1/config/webhooks                    - Create webhook
PUT    /api/v1/config/webhooks/:id                - Update webhook
DELETE /api/v1/config/webhooks/:id                 - Delete webhook
POST   /api/v1/config/webhooks/:id/test           - Test webhook
GET    /api/v1/config/email-templates             - List templates
GET    /api/v1/config/email-templates/:code       - Get template
POST   /api/v1/config/email-templates             - Create template
PUT    /api/v1/config/email-templates/:id         - Update template
GET    /api/v1/config/smtp                        - Get SMTP config
PUT    /api/v1/config/smtp                        - Update SMTP config
POST   /api/v1/config/smtp/test                   - Test SMTP
```

---

## Permissions Required

### Files Permissions
- `files:read` - Read files, download, list
- `files:write` - Upload, delete, share files
- `files:admin` - Manage quotas and storage settings

### Config Permissions
- `settings:read` - Read settings, branding, features
- `settings:write` - Update settings, branding, features, webhooks, templates
- `settings:admin` - Update security policies and SMTP (admin only)

---

## Database Tables

### Files Module
- `file_attachments` - File metadata and records
- `file_shares` - Share tokens and access
- `file_access_logs` - Access tracking
- `storage_quotas` - Storage limits per tenant

### Config Module
- `system_settings` - System configuration settings
- `branding_config` - Branding configuration
- `security_policies` - Security settings
- `feature_flags` - Feature flag definitions
- `webhooks` - Webhook configurations
- `webhook_deliveries` - Webhook delivery logs
- `email_templates` - Email template definitions
- `smtp_configs` - SMTP server configurations

---

## Summary

**`/files` Route**: Provides centralized file management for the entire platform, allowing any module to attach, store, and manage files with proper security, quotas, and sharing capabilities.

**`/config` Route**: Provides system-wide configuration management, allowing administrators to customize the platform's behavior, appearance, security, and integrations without code changes.

Both routes are essential infrastructure components that support all other modules in the QAssure platform.
