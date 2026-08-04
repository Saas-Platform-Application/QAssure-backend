**QAssure Platform**

**Notification Service - Implementation Report**

**Prepared for LTTS Review**

Version 2.0 | April 16, 2026 | Tech4Biz Solutions | Strictly Confidential

| **Document Property** | **Details**                                          |
| --------------------- | ---------------------------------------------------- |
| Document Title        | QAssure Notification Service - Implementation Report |
| Prepared By           | Tech4Biz Solutions Pvt Ltd                           |
| Prepared For          | LTTS Review Team                                     |
| Date                  | April 16, 2026                                       |
| Version               | 2.0 (Phase 2 Update)                                 |
| Status                | Final - SMTP & Reliability Features Implemented       |
| Classification        | Confidential                                         |

# **1. Executive Summary**

The QAssure Notification Service has been upgraded to a enterprise-grade, multi-tenant capable system. While Phase 1 established real-time in-app capabilities, Phase 2 introduces **Industrial Reliability**: tenant-specific email delivery (SMTP), robust failure tracking, and global master data governance for notification types.

**Key enhancements in Version 2.0:**
*   **Multi-Tenant SMTP Routing**: Tenants can now bring their own SMTP infrastructure (Gmail, SES, SendGrid) to send branded notifications.
*   **Failure Resilience**: Centrally logged delivery failures with a dedicated management interface for auditing and resending emails.
*   **Governance Architecture**: Separated notification "Categories" and "Codes" into master tables, allowing platform admins to standardize event types while giving tenants flexibility to customize templates.
*   **Automatic Health Monitoring**: A daily cron job verifies SMTP connectivity for every tenant and reports failures to administrators.

# **2. Multi-Tenant SMTP Architecture**

The system now supports dynamic SMTP routing. When an email is triggered, the system resolves the "Delivery Context" to determine which credentials to use.

### **2.1 SMTP Resolution Logic**
1.  **Direct Lookup**: The system checks if the relevant `tenant_id` has an active configuration in `notification_smtp_configs`.
2.  **Authentication Emails**: When a user is not yet logged in (e.g., Forgot Password), the system dynamically identifies their tenant from the database to ensure the correct SMTP is used.
3.  **No Fallback for Tenants**: If a tenant has not configured a custom SMTP, notifications are **not** sent via Super Admin SMTP. Instead, they are routed to the **Failed Email Log** (see Section 3).
4.  **Admin Resend Flow**: Once a tenant admin configures their SMTP, they can resend the failed notifications from the dashboard.
5.  **Super Admin SMTP**: The global SMTP (defined as `scope = super_admin`) is reserved exclusively for platform-level alerts and Super Admin user accounts.
6.  **Credential Protection**: SMTP passwords are encrypted/stored securely and are never returned in cleartext to the UI.

### **2.2 Health Tracking**
Each SMTP configuration tracks its last successful and failed connection attempts:
*   `last_tested_at`: Timestamp of the last connectivity test.
*   `last_test_status`: boolean (Success/Failure).
*   `smtp_error`: Detailed error log for the last failure (Connection Timeout, Invalid Credentials, etc.).

# **3. Failure Management & Reliability**

To prevent "silent failures" (where an email is sent but never reaches the recipient), we have implemented a global Failure Gateway.

### **3.1 The Failed Email Log**
Every email dispatch attempt is wrapped in a tracking layer. If `EmailService.send()` fails:
1.  A record is created in the `failed_emails` table.
2.  The record captures the **Full Payload** (To, Subject, Body) and the **Exact Error Code** from the SMTP server.
3.  The ID of the failing user and notification is linked for traceability.

### **3.2 Resend Mechanism**
Administrators can view failing emails and trigger retries:
*   **Individual Resend**: Retries a specific failed attempt.
*   **Resend All**: Processes the entire failure queue for a tenant.
*   **Duplicate Prevention**: Retries use a `skipFailureLog` flag to ensure a failing retry doesn't create endless recursive log entries.

# **4. Governance: Categories & Codes**

Standardization of notifications is handled via a structured Master Data hierarchy.

| **Level** | **Entity** | **Governance** | **Example** |
| :--- | :--- | :--- | :--- |
| **Top Level** | **Category** | Platform-Wide (Super Admin Only) | `capa`, `document`, `training` |
| **Mid Level** | **Code** | Platform-Wide (Super Admin Only) | `workflow_assigned`, `capa_overdue` |
| **User Level** | **Template** | Tenant-Specific (Overrides) | "Custom HTML for ACME Corp CAPA assigned" |

### **4.1 Security Rules**
*   **Creation/Deletion**: Restricted to Super Admins (`requireSuperAdmin` middleware) to prevent fragmentation of the platform's notification data model.
*   **Assignment**: Business modules (CAPA, QMS) reference these static Codes to trigger events.
*   **Customization**: Tenant Admins cannot delete Codes but can **Override** the template text and branding for any Code.

# **5. Updated Database Schema (Phase 2)**

### **5.1 notification_smtp_configs Table**
| **Column** | **Description** |
| :--- | :--- |
| host / port / secure | Connection details for the SMTP server. |
| username / password | Encrypted credentials. |
| scope | `tenant` (specific) or `super_admin` (global fallback). |
| last_tested_at | Timestamp of last manual or cron-based test. |

### **5.2 failed_emails Table**
| **Column** | **Description** |
| :--- | :--- |
| to_email / subject | Recipient details. |
| body | The full HTML content of the failed email. |
| error_message | Snippet from the SMTP error (e.g., Auth Failure). |
| status | `failed` (default) or `retried`. |

### **5.3 notification_categories & codes Tables**
| **Column** | **Description** |
| :--- | :--- |
| code | String identifier used in backend calls (e.g., `system`). |
| module_id | Links the category to a commercial module (Optional). |
| variables | (Code Table) JSONB array of expected variables (e.g., `["entity_name"]`). |

# **6. REST API Reference (Phase 2 Endpoints)**

### **6.1 SMTP Management**
| **Method** | **Endpoint** | **Description** |
| :--- | :--- | :--- |
| GET | `/api/v1/smtp-config` | Get active config for My Tenant. |
| POST | `/api/v1/smtp-config` | Upsert (Save/Update) SMTP settings. |
| POST | `/api/v1/smtp-config/test` | Live connectivity test. |
| POST | `/api/v1/smtp-config/setup` | (Super Admin) Manage any tenant's SMTP. |

### **6.2 Failed Email Management**
| **Method** | **Endpoint** | **Description** |
| :--- | :--- | :--- |
| GET | `/api/v1/failed-emails` | Paginated list of failures for audit. |
| POST | `/api/v1/failed-emails/:id/resend` | Manually retry 1 email. |
| POST | `/api/v1/failed-emails/resend-all` | Bulk retry for current tenant. |

### **6.3 Template & Master Management**
| **Method** | **Endpoint** | **Description** |
| :--- | :--- | :--- |
| GET | `/api/v1/notifications/categories/tenant` | Get categories (filterable by `module_id`). |
| PUT | `/api/v1/notifications/templates/:id` | Edit/Update Template branding. |
| PUT | `/api/v1/notifications/templates/:code/override` | Create tenant override for global code. |
| DELETE| `/api/v1/notifications/templates/:code/reset` | Revert to platform standard template. |

# **7. User Interface (Frontend Reference)**

The Phase 2 implementation includes four major administrative screens:

### **7.1 SMTP Configuration (Tenant Admin)**
*   **Status Indicators**: Shows if the tenant is using "Platform Defaults" or a custom SMTP.
*   **Test Suite**: Integrated "Test Connection" button providing real-time SMTP feedback.
*   **Sender Identity**: Configurations for "Sender Display Name" and "Sender Email" per-tenant.

### **7.2 Failed Emails Dashboard**
*   **Audit Log**: A premium table view of all failed dispatches with pagination.
*   **Detailed Inspection**: Modal popup to view the **exact HTML body** and **exact SMTP error message** for debugging.
*   **Bulk Actions**: "Resend All Failed" button with loading state and result reporting.

### **7.3 Category & Code Master (Super Admin)**
*   Centralized management of the notification taxonomy.
*   Ability to bind Categories to specific Modules (CAPA, etc.).

### **7.4 Template Editor (Branding)**
*   Rich text interface for updating HTML templates.
*   Support for Dynamic Variable injection (e.g., `{{entity_name}}`).

# **8. Conclusion**

The Notification Service now provides a robust foundation for all multi-tenant communication. By centralizing failures, providing flexible SMTP routing, and maintaining strict master data governance, QAssure ensures that notifications are professional, reliable, and highly customizable.

_- End of Document -_