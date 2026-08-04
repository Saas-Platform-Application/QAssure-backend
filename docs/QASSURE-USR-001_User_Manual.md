# QAssure Platform
# User Manual

| **Document ID**     | QASSURE-USR-001          |
| ------------------- | ------------------------ |
| **Version**         | 1.4.0                    |
| **Release Date**    | 16 July 2026             |
| **Prepared For**    | L&T Technology Services  |
| **Prepared By**     | QAssure Development Team |
| **Status**          | Final Draft              |
| **Classification**  | CONFIDENTIAL             |

---

## About This Manual

This User Manual provides step-by-step guidance for all roles on the QAssure Platform based on the currently implemented screens and features.

### Platform Role Model

QAssure has **two system-defined roles**:

| System Role | Access Level |
|---|---|
| **Super Administrator** | Full platform-level access — manages all tenants, global configuration, platform users, and system settings |
| **Tenant Administrator** | Full access within their own organisation — manages users, custom roles, departments, designations, documents, workflows, and all tenant settings |

All other roles (e.g. Quality Manager, QA Engineer, Document Controller, Reviewer) are **custom roles** created by the Tenant Administrator. The Tenant Admin defines what modules, resources, and actions each custom role can access. There is no fixed set of named roles beyond Super Admin and Tenant Admin.

> ℹ️ **If you are not a Super Admin or Tenant Admin**, your access depends entirely on the custom role your Tenant Admin has assigned to you. Contact your Tenant Admin if you need access to additional features or modules.

Use the table below to navigate to your section:

| Your Role | Start Here |
|----------|-----------|
| Super Administrator | [Part 1 — Super Admin Guide](#part-1--super-admin-guide) |
| Tenant Administrator | [Part 2 — Tenant Admin Guide](#part-2--tenant-admin-guide) |
| Tenant User (any custom role) | [Part 3 — Tenant User Guide](#part-3--tenant-user-guide) |

---

## Getting Started

### System Requirements

| Platform | Requirements |
|---------|-------------|
| Browser | Chrome 100+, Firefox 100+, Safari 15+, Edge 100+ |
| Screen | Minimum 1280×720 resolution |
| Internet | Stable connection (minimum 5 Mbps) |
| Documents | No external viewer required (previews are rendered natively in-app) |

### Logging In

1. Open your browser and navigate to your organization's QAssure URL
   - Example: `https://yourcompany.qassure.com`
2. Enter your registered **email address** and **password**
3. Click the **Login** button
4. Upon successful validation, the system redirects you automatically based on your role:
   - **Super Admins** and **Platform Users** are redirected to the Super Admin Dashboard (`/dashboard`)
   - **Tenant Admins** and **Tenant Users** are redirected to the Workspace Selection landing page (`/tenant/landing`) or the Tenant Dashboard (`/tenant`)
   - If policy requires a password change (e.g., initial login or expired password), you will be prompted to reset your password first.

**Forgot Password:**
1. Click **Forgot Password** on the login page
2. Enter your registered email address
3. Check your inbox for a password reset link (valid for 30 minutes)
4. Follow the link to create a new password

> 🔒 **Session Timeout:** For security compliance, the platform will automatically log you out after a period of inactivity (default: 30 minutes). When this occurs, a notification will appear on the login page explaining the reason. Simply log in again to resume your work.

---

## Part 1 — Super Admin Guide

Super Admins have platform-level access and manage tenants, global modules, platform users, and system-wide settings.

### 1.0 Platform Users vs. Super Admins
- **Super Admin**: The root administrative user with unrestricted control over all tenants, configuration, and security settings.
- **Platform Users**: Sub-administrators who can access and use the Super Admin panel. Their operational capabilities (e.g., creating tenants, creating/updating modules, editing settings, or viewing logs) are governed strictly by the granular permissions configured in their assigned **Platform Role**.

### 1.1 Managing Tenants

**Navigate to:** `Super Admin → Tenants`

**Create a New Tenant:**
1. Navigate to **Tenants**
2. Click **+ New Tenant** (launches the Create Tenant Wizard)
3. Fill in required fields:
   - **Organization Name** (required)
   - **Subdomain** (required; e.g., `acme` → `acme.qassure.com`)
   - **Primary Contact Email** (required)
   - **Country / Region** (required)
4. Configure **Platform Services**: Select which of the 14 core internal services (Document Management, CAPA, Training, Workflow, AI Services, E-Signatures, etc.) are licensed and enabled for this tenant.
5. Click **Create Tenant**
   > ℹ️ Branding assets (logo, favicon) are configured post-creation under the tenant's organisation settings, as storage buckets are provisioned only after tenant creation completes.
6. The system generates Tenant Admin credentials and sends an activation email automatically

**View Tenant Details:**
1. Navigate to **Tenants**
2. Click on any tenant row to open the **Tenant Details** page
3. The details page shows tenant info, assigned modules, platform services status, and users

**Edit a Tenant:**
1. Navigate to **Tenants** → click the tenant → click **Edit**
2. The Edit Tenant page allows updating:
   - Basic information (name, contact, region)
   - **Platform Services** tab — enable/disable individual services using toggles or "Enable All" / "Disable All" buttons; changes take effect immediately (cache is invalidated automatically)
   - **Branding** tab — upload logo, favicon, and set primary/secondary/accent colours (post-creation only)
   - Module assignments
3. Click **Save Changes**

**Deactivate a Tenant:**
1. Navigate to **Tenants** → find the tenant → click **⋮** → **Deactivate**
2. Confirm deactivation — all tenant users lose access immediately

### 1.2 Managing Platform Users

**Navigate to:** `Super Admin → Platform Users → Users`

Platform Users are sub-administrators with permission-scoped platform-level access.

**Create a Platform User:**
1. Navigate to **Platform Users → Users**
2. Click **+ New Platform User**
3. Fill in first name, last name, and email
4. Select a **Platform Role**
5. Click **Create User** — the system provisions the account, automatically generates a secure password, and sends activation credentials to the user's email

**Edit / Suspend / Delete a Platform User:**
1. Find the user in the list → click **Edit**
2. Modify role assignment or status (Active, Suspended, Deleted) → click **Save**

### 1.3 Platform Roles & Permissions

**Navigate to:** `Super Admin → Platform Users → Roles & Permissions`

**Create a Platform-Scoped Role:**
1. Navigate to **Platform Roles**
2. Click **+ New Platform Role**
3. Enter **Role Name** and **Description**
4. Select platform-level permissions (e.g. `settings:update`, `tenants:read`, `notifications:manage`)
5. Click **Save Role**

### 1.4 Tenant Admin Role Configuration

**Navigate to:** `Super Admin → Tenant Admin Role`

This screen allows the Super Admin to configure the default permission set that is automatically assigned to Tenant Admins when a new tenant is created. Modifying this role affects all existing Tenant Admins.

### 1.5 Managing Global Modules

**Navigate to:** `Super Admin → Modules`

A **Module** refers to registered internal or external applications (e.g. COC - Certificate of Compliance, CR - Change Request, etc.) integrated with QAssure for single sign-on (SSO) and launch.

**Register a New Module:**
1. Navigate to **Modules**
2. Click **New Module**
3. Complete Module Configuration details:
   - Module ID, Name, Description, Version, and Runtime language/framework
   - Base URLs (Frontend, Backend, Health, Webhook URLs)
   - Kubernetes resource limits (CPU/Memory, Replicas) if self-hosted
4. Click **Register Module**
5. Copy the generated **API Key** immediately (shown only once)

**Assign Modules to Tenants:**
- To link/assign modules to specific tenants, navigate to **Tenants**, select the tenant, click **Edit**, and use the module checklist. Module assignment is managed from the tenant detail/edit screens, not from the Modules list.

### 1.6 Notifications Management

**Navigate to:** `Super Admin → Notifications`

| Sub-section | Purpose |
|------------|---------|
| **Notifications List** | View all platform-level notification records |
| **Master Management** | Configure notification event types and trigger conditions |
| **Global Templates** | Manage email/in-app notification templates (subject, body, variables) |

### 1.7 Audit Logs

**Navigate to:** `Super Admin → Audit Logs`

- View all platform-wide audit events (user logins, tenant changes, config updates)
- Filter by date range, action type, user, or tenant
- Click any row to see the full before/after diff of changed values

**Navigate to:** `Super Admin → Audit Resources`
- View and manage the list of auditable resource types registered in the system

### 1.8 System Settings

**Navigate to:** `Super Admin → Settings`

| Setting | Path | Purpose |
|---------|------|---------|
| SMTP Configuration | Settings → SMTP Config | Configure global outbound email server (host, port, credentials, TLS) |
| Failed Emails | Settings → Failed Emails | View and retry emails that failed to deliver |
| AI Fallback Monitoring | Settings → AI Fallback Monitoring | Track which AI provider fallback events occurred and why |
| Storage Buckets | Settings → Storage Buckets | Create and manage cloud storage buckets (S3/Azure Blob/GCS); assign buckets to tenants |

**Storage Buckets:**
1. Navigate to **Settings → Storage Buckets**
2. Click **+ New Bucket** to register a new cloud storage bucket
3. Fill in provider type, bucket name, region, and credentials
4. After creation, click **Assign to Tenant** to link the bucket to a specific tenant — the tenant can then upload files and branding assets

---

## Part 2 — Tenant Admin Guide

Tenant Admins manage users, roles, departments, designations, documents, and configuration within their own organisation.

### 2.0 Dashboard & Quick Actions

After logging in, the Tenant Admin **Dashboard** provides:
- Overview widgets (pending tasks, document counts, notifications)
- A **Quick Actions** panel for rapid entity creation:

| Quick Action | What It Does |
|---|---|
| **New User** | Navigates to the Users page and automatically opens the Create User form |
| **New Role** | Navigates to Roles & Permissions and opens the Create Role form |
| **New Dept** | Navigates to Departments and opens the Create Department form |
| **New Desig** | Navigates to Designations and opens the Create Designation form |

> ℹ️ After the modal opens and is closed, refreshing the page will NOT reopen it (navigation state is cleared automatically).

### 2.1 User Management

**Navigate to:** `Administration → Users`

**Create a New User:**
1. Navigate to **Administration → Users** (or click the **New User** Quick Action on the dashboard)
2. Click **New User**
3. Complete the **Create New User** form:
   - **Email** (required; must be a valid email format)
   - **First Name** and **Last Name** (required)
   - **Department** and **Designation** (select from the dropdown list)
   - **User Category**: Select *Tenant User* or *Supplier User* (if Supplier User is selected, select the *Linked Supplier* from the list)
   - **Status**: Set to *Active*, *Suspended*, or *Deleted*
   - **Role & Module Assignments**: Assign one or more custom roles mapped to specific platform modules (you can add multiple assignments to match the user's operational needs)
4. Click **Create User**
5. The backend automatically generates a secure password and emails the login credentials to the user.

**Edit a User:**
1. Navigate to **Administration → Users**
2. Locate the user, click on the row or click **⋮** → **Edit**
3. Modify the user details, department, designation, role assignments, or status
4. Click **Save Changes**

**Suspend or Delete a User:**
1. In the User list, click **⋮** → **Edit** on the target user
2. Change the **Status** field:
   - **Active**: User has full platform access.
   - **Suspended**: User is blocked from logging in. Active sessions are invalidated.
   - **Deleted**: User is soft-deleted and removed from the active lists.
3. Click **Save Changes**

**Reactivate a Suspended User:**
1. Locate the user whose status is **Suspended**
   > Suspension can happen automatically via security lockout if the user repeatedly attempts unauthorized access to another tenant's data.
2. Click **Edit** → change **Status** to **Active**
3. Click **Save Changes** to restore their access and clear security metadata.

### 2.2 Role & Permission Management

**Navigate to:** `Administration → Roles`

**Create a Custom Role:**
1. Click **+ New Role**
2. Enter **Role Name** and **Description**
3. Toggle permissions per module (Read, Create, Update, Delete, Approve, etc.)
   > 🔒 If a platform service has been disabled by the Super Admin, its permission checkboxes will be locked and cannot be assigned.
4. Click **Save Role**

### 2.3 Departments & Designations

**Departments** — Navigate to `Administration → Departments`
- Click **+ New Department** → enter name and description → **Save**
- Edit or toggle active status (Active / Inactive) for existing departments from the list

**Designations** — Navigate to `Administration → Designations`
- Click **+ New Designation** → enter name and description → **Save**
- Edit or toggle active status (Active / Inactive) for existing designations from the list

### 2.4 Branding & Organisation Settings

**Navigate to:** `Administration → Settings → General Settings`

- **Organisation Branding**: Upload organization **Logo** (PNG/SVG, max 2MB, recommended 200×60px) and **Favicon** (PNG/ICO, 32×32px). Note: uploads are available only after a cloud storage bucket is assigned to the tenant by the Super Admin.
- **Colour Palette**: Customize the theme using hex codes for:
  - **Primary Color**: Controls headers and primary action buttons.
  - **Secondary Color**: Controls sidebar icons and secondary text.
  - **Accent Color**: Controls tabs, highlighted borders, and callouts.
- Click **Save Settings** to persist branding (takes effect system-wide within 5 minutes due to caching).

### 2.5 Security Policy

**Navigate to:** `Administration → Settings → Security Policy`

Configure organization-specific security parameters for GxP and electronic records compliance:
- **Password Complexity Policy**:
  - **Minimum Length**: Set minimum characters (default: 8).
  - **Complexity Requirements**: Toggle requirements for numbers, lowercase/uppercase letters, and special characters.
  - **Password History**: Restrict reuse of past passwords (e.g., last 5 passwords).
  - **Password Expiry**: Set lifetime in days (e.g., 90 days) before forcing a password change.
- **Session Policy**:
  - **Idle Timeout**: Set inactivity period in minutes (default: 30) before a user session is automatically locked and logged out.
  - **Max Concurrent Sessions**: Limit concurrent logins per user account.
- **Account Protection & Lockout**:
  - **Max Login Attempts**: Failed attempts before account lockout (default: 5).
  - **Lockout Duration**: Minutes a user is locked out before they can retry or request admin unlock (default: 15).

### 2.6 Notification Settings & Templates

**Navigate to:** `Administration → Settings → Notification Settings`
- **Notification Channels**: Toggle email and in-app (browser) alerts for specific categories (Document Approvals, Task Assignments, Overdue Warnings, System Alerts).
- **Timezone Selection**: Choose the tenant's primary timezone for all scheduled notifications.
- **Digest Frequency**: Choose delivery timing (Instant, Daily Digest, or Weekly Digest).
- **Quiet Hours**: Define time windows (Start/End times) during which non-urgent notifications are held.

**Navigate to:** `Administration → Settings → Notification Templates`
- **Custom Template Editor**: View system-defined triggers and customize the email content.
- **Rich Text Editor**: Edit email templates with formatting, lists, tables, and colors.
- **Dynamic Variables Chips**: Click and copy placeholder chips (e.g., `{{recipient_name}}`, `{{document_title}}`, `{{task_due_date}}`) to inject live database values into subjects or bodies.
- **Reset to System Defaults**: Revert any edited template to its original system boilerplate.

### 2.7 SMTP Settings & Failed Emails

**Navigate to:** `Administration → Settings → SMTP`
- **Mail Server Configuration**: Configure custom outgoing email credentials:
  - **Host Name / IP**: (e.g., `smtp.mailgun.org` or `smtp.office365.com`)
  - **Port**: Typically `587` (STARTTLS) or `465` (SSL/TLS).
  - **Encryption**: Toggle SSL or TLS security protocols.
  - **Credentials**: Enter SMTP Username, Password, and "From" email address.
- **Test Connection**: Enter a recipient email address and click **Send Test Email** to verify SMTP connectivity and credentials.

**Navigate to:** `Administration → Settings → Failed Emails`
- **Delivery Log Register**: A data table displaying all outbound emails that failed to deliver (Timestamp, Recipient, Subject, and Error Reason).
- **Audit Details Modal**: Click **View Details** to open a modal displaying:
  - Recipient email address
  - Subject line
  - Full HTML message body preview
  - Exact error log returned by the SMTP provider
- **Failed Email Actions**:
  - **Retry**: Attempt to resend the selected email immediately.
  - **Resend All Failed**: Trigger a batch retry process for all failed emails currently in the list.
  - **Delete**: Remove the failure log entry from the system.

### 2.8 Storage Configuration & Dashboard

**Navigate to:** `Administration → Settings → Storage`
- **Active Bucket Profile**: Displays read-only configuration details of the tenant's assigned cloud storage bucket (Bucket Name, Cloud Provider [AWS/Azure/GCS], Region, and Connection Status).

**Navigate to:** `Files → Storage Dashboard`
- **Usage Statistics Tab**:
  - **Gradient Cards**: Storage Usage Percentage (percentage of quota consumed), Total Files count, Images count, and Docs/PDFs count.
  - **Usage Grid**: Displays usage breakdowns:
    - *By Entity Type* (Entity Name, File Count, and Total Size).
    - *By Source Module* (Module Name, File Count, and Total Size).
- **Quota Details Tab**:
  - **Profile Details**: Displays Max Total Storage, Max Per-File Size, Currently Used storage, and Total File Count.
  - **Edit Quota**: Launches a modal (if authorized) to adjust Max Total Storage (GB) and Max Per-File Size (MB).
  - **Security Blocklist**: Lists file extensions strictly blocked by system policy (e.g., `.exe`, `.bat`, `.sh`, `.js`, `.py`) to prevent malicious uploads.
- **Storage Cleanup Tab**:
  - **Purge Orphaned Files**: Reclaim physical storage space by cleaning up soft-deleted files with zero active references.
  - **Timeframe Selector**: Enter an age threshold in hours (e.g., 24 hours) to keep recently deleted files for potential background processing. Enter `0` to instantly purge all eligible files.
  - **Purge Unreferenced Files**: Launches a verification modal to permanently wipe files matching the threshold from the storage provider.

### 2.9 Electronic Signatures Management

**Navigate to:** `E-Signatures` (visible only to users with audit/signature privileges)

- **Signature Logs / My Signatures Tab**:
  - A chronological ledger of 21 CFR Part 11 compliant digital signatures.
  - **Electronic Signature Audit Record Modal**: Click **View Details** on any log to review:
    - Signature ID and Verification Status (e.g., Compliant & Verified / Invalidated)
    - Signer Name and Email
    - Timestamp and Action Code (e.g., APPROVE, REJECT, REVIEW, AUTHOR)
    - Target Resource Context (Resource Type, Name, and unique ID)
    - Signature Meaning (declared intent)
    - Security Audit Trail (IP Address and SHA-256 Digital Fingerprint)
- **Manage Credentials Tab**:
  - Form to update or set your personal **Electronic Signature PIN**.
  - **Fields**: Login Password (required for validation), New Signature PIN (4-6 digits), and Confirm Signature PIN.
  - Click **Update Signature PIN** to activate.
- **Compliance Stats Tab** (requires `audit_logs` permission):
  - **Date Range Filter**: Select Start Date and End Date, then click **Apply Range**.
  - **Metric Summary Cards**: Displays Total Signatures, Unique Signers, and Unique Resources.
  - **Distribution Chart**: Visual breakdown of signature actions (APPROVE, REJECT, REVIEW, AUTHOR, VERIFY, etc.).

### 2.10 Audit Logs

**Navigate to:** `Audit Logs`

- **Activity Logs Grid**: Lists chronological audit entries with columns: Timestamp, Resource Type, Module, Action, User, and HTTP Response Status.
- **Search & Filters**:
  - **Search Box**: Search across log descriptions and metadata.
  - **Action Dropdown**: Filter by operations (LOGIN, LOGOUT, CREATE, UPDATE, DELETE, SUBMIT, APPROVE, REJECT).
  - **Module Dropdown**: Filter by source module.
- **More Filters Popover**:
  - **Resource Type Dropdown**: Select specific resource classes.
  - **Sort Order Dropdown**: Sort by Newest First, Oldest First, Action (A-Z), or Resource Type (A-Z).
  - **Date Boundaries**: Enter From Date and To Date.
- **Audit Log Actions**:
  - **Export JSON**: Downloads the current filtered activity log records as a `.json` file.
  - **Expand Row**: Opens an inline expansion panel showing:
    - *Request Info*: HTTP Method (GET, POST, PUT, DELETE), Request Path, IP Address, and User Agent.
    - *Audit Details*: Log ID, Resource ID, and Correlation ID.
    - *Metadata*: Formatted JSON object containing the exact before/after payload state.
  - **View details**: Opens a full-screen modal showing a formatted view of the log entry.

### 2.11 Modules

**Navigate to:** `Modules`

- **Tenant Modules List**: Lists all SSO-integrated external modules assigned to the tenant (e.g., Certificate of Compliance [COC], Change Request [CR]).
- **Launch Action**: Click a module card to open the module application in a new browser tab with automated Single Sign-On. Disabled modules will display a locked state.

### 2.12 Suppliers

**Navigate to:** `Suppliers`

- **Suppliers Register**: Data table showing all registered suppliers with columns: Supplier Code, Supplier Name, Supplier Type, Category, and Status.
- **Supplier Actions**:
  - **Add Supplier / Edit Supplier**: Launches a modal to create or update supplier credentials (Supplier Code, Name, Type [e.g., Critical, Non-Critical], Category, Address, Contact details, and Status [Active/Inactive]).
  - **View Details**: Displays complete metadata for a supplier in a read-only modal.
  - **Manage Contacts**: Opens a sub-modal to add, edit, or delete contact persons associated with the supplier.
  - **Scorecards**: Opens the performance scorecard manager to track and grade supplier quality audits, response times, and compliance metrics.

---

## Part 3 — Tenant User Guide

This section covers all features available to **tenant users with custom roles**. Which screens and actions you can access depends on the permissions your Tenant Administrator has assigned to your role. If a feature described below is not visible in your account, contact your Tenant Admin to request the appropriate permissions.

### 3.1 Document Management

**Navigate to:** `Documents`

The Documents module supports the complete document lifecycle from drafting to obsolescence.

#### Creating a Document
1. Navigate to **Documents → Create Document**
2. Fill in the required fields:
   - **Title**: Descriptive name of the document.
   - **Document Category**: Select from organization-configured categories (e.g., SOP, Quality Policy, Technical Spec).
   - **Document Type**: Select the document class.
   - **Review Interval**: Enter duration in days (e.g., 365 days) after which a review is triggered.
   - **Description**: Summary of scope and contents.
3. Upload the document file (PDF, DOCX, XLSX; max size governed by tenant storage quota).
4. Click **Save as Draft**.

#### Document Lifecycle
```
Draft → In Review → Approved → Obsolete
  ↑         ↓
  └─── Rejected ─────┘
```
- **Submit for Review**: Opens the reviewer selection modal. Select one or more **Reviewers** and define a **Due Date**.
- **Approve or Reject (as Reviewer)**: Click **Approve** or **Reject** in the document page or under tasks. If an **Electronic Signature** is required, enter your **PIN**, define the **Meaning of Signature** (e.g., Approval, Authorship), and click **Sign & Approve**.

#### Document Check-Out & Check-In
- **Check-Out Locking**: Click **Check Out** on an approved or active document. This applies a lock on the document resource. While checked out, only the locking user can upload new files, edit metadata, or check in a revision. All other users see a locked state.
- **Check-In Revisioning**: Click **Check In** to upload your modified file. You will be prompted to select:
  - **Minor Version (Increment)**: (e.g., v1.0 → v1.1) for minor corrections.
  - **Major Version (Increment)**: (e.g., v1.0 → v2.0) for substantial edits or revisions.
  - **Version Notes**: Required field detailing changes made.

#### Native File Viewer
- Clicking on a document or file opens the in-app **File Viewer**.
- **Supported Formats**: Previews PDF, DOCX (Word), XLSX (Spreadsheets), and standard images directly in the browser.
- **Spreadsheet Grids**: Spreadsheet previews render as interactive multi-sheet tables. You can click between worksheet tabs and scroll grids.
- **Viewer Controls**: Includes Zoom In, Zoom Out, Fit to Page, and Page Navigation headers. No external software or Adobe PDF browser plugins are required.

#### Document Categories
**Navigate to:** `Documents → Categories`
- View, create, and manage document category labels used to classify files.

#### Documents Due for Review
**Navigate to:** `Documents → Due for Review`
- Lists all documents whose scheduled review date is approaching or overdue. Click any document to view or initiate the review process.

### 3.2 Workflow Management

**Navigate to:** `Workflows`

#### Workflow Definitions
**Navigate to:** `Workflows → Definitions`
- **Definitions Registry**: View all document approval templates. Table columns show: Workflow Component, Code, Entity Type (e.g., Document), Version, Status, Module, and Created Date.
- **Definitions Actions**:
  - **New Workflow / Edit**: Opens `WorkflowDefinitionModal` to configure definition name, unique code, description, source modules, and to build transition stages (Draft, In Review, Approved, Rejected).
  - **View**: Opens `WorkflowDefinitionViewModal` to inspect the workflow steps.
  - **Clone**: Duplicates the selected workflow template.
  - **Activate / Deprecate**: Toggles status. Active definitions are ready for document routing; deprecating moves them to locked status.
  - **Delete**: Deletes draft/unused workflow templates.

#### Workflow Tasks
**Navigate to:** `Workflows → Tasks`
- **Assigned Tasks Grid**: Displays workflow tasks assigned to you or your team.
- **Multi-Assignee Tooltips**: The **Assigned To** column displays `email@domain.com (Full Name)` for single assignees. For tasks with multiple assignees, the grid displays the first assignee followed by `...` — hovering over this displays a tooltip listing all assignees.
- **Task Action Panel**: Click a task to open the details view. Review the attached document, enter approval comments, and submit an Electronic Signature PIN/meaning to complete the action.

### 3.3 File Attachments

**Navigate to:** `File Attachments → Files List`

- **Files Register**: Shows all uploaded files. Columns: File Name (with file-type icon), Size, Category, Source Module, Uploaded By (avatar + email initials), Upload Date, Version, and Actions.
- **File Upload Modal**: Click **Upload New File** to drag/drop files, set Category (Finance, Marketing, HR, Data, Legal, Training, Other), select Source Module, and specify custom tags.
- **File Actions**:
  - **View**: Opens the file in the browser-native **File Viewer**.
  - **Download**: Downloads the binary file locally.
  - **Delete**: Opens `DeleteConfirmationModal` (authorized users only) with a checkbox for **Permanent Delete (Hard Delete)** to wipe files completely from the physical storage provider vs moving them to the trash bin.

### 3.4 AI Services

**Navigate to:** `AI Services`

#### Completion History
**Navigate to:** `AI Services → Completion History`
- **Completions Ledger**: Shows all previous AI requests. Columns: Date, Module, User, Provider, Model, Status, and View.
- **Filters**: Filter by Provider, Model, or Status. Click **More Filters** to filter by Module, User, and Date Range (From/To).
- **Expandable Rows**: Clicking any row expands inline to show:
  - Tokens, Cost (USD with 6 decimal places), and Latency (ms).
  - Use case context.
  - Error code and message (if status is failed).
  - Text response preview block.
- **New Completion**: Click **Create Completion** to open a playground form (configure System Prompt, User Prompt, select Provider/Model, and adjust Temperature, Top P, Max Tokens, and Frequency Penalty).
- **Completion Detail**: Click **View** on a record or click **Open full detail view** in expanded rows to see full payload parameters and raw JSON response logs.

#### Prompt Management
**Navigate to:** `AI Services → Prompt Management`
- **Prompts Grid**: Table of reusable prompts with columns: Name & Description, Use Case, Status toggle, Version, Tags (first 2, plus count), Last Updated, and Actions.
- **Prompt Status Switch**: Toggle the status switch (Active / Draft) inline to activate/deactivate a prompt template.
- **Prompt Actions**:
  - **Create / Edit Prompt**: Launches form to define name, code, description, use case, modules, system message, user message template (supporting `{{variable}}` substitution), temperature, top_p, max_tokens, tags, and fallback settings.
  - **Prompt Test Cases**: Redirects to the test case builder to validate prompt outputs.
  - **Version History**: Opens `PromptVersionsModal` showing list of prompt versions. Admins can view differences or click **Rollback** to restore a previous version.
  - **Run / Execute**: Opens the run window where users fill in prompt variables, execute, and inspect the live completion result.
  - **Execution Logs**: Lists chronological executions of that specific prompt.
  - **Clone Prompt**: Duplicates the prompt.
  - **Delete Prompt**: Deletes the prompt.

#### Tenant AI Providers
**Navigate to:** `AI Services → Tenant AI Providers`
- **Providers Table**: Lists all configured AI gateway integrations. Columns: Provider Name, Config Type (Direct or Azure), Default Model, Status, Last Verified, and Actions.
- **Provider Actions**:
  - **Create AI Provider**: Opens the configuration form: Provider vendor, Display Name, Config Type (Direct vs. Azure), API Key (password masked), Endpoint URL, Deployment Name (Azure), API Version (Azure), Default Model, Fallback Provider, Custom Models tags, and Status toggle.
  - **Test Connection**: Pings the provider API, showing a success message with latency or error logs on failure.
  - **View Config**: Opens detail modal.
  - **Delete Config**: Deletes configuration.

#### AI Usage & Cost Dashboard
**Navigate to:** `AI Services → AI Usage & Cost Dashboard`
- **Dashboard Controls**: Date range selector and **Group by** dropdown (Day, Week, Month).
- **Metric summary Cards**: Displays Total Completions (requests), Total Tokens, Total Cost (USD), and Average Latency (ms).
- **Breakdown Grids**:
  - **Usage by Provider**: Table listing requests, tokens, and USD costs for each AI provider.
  - **Cost by Model**: Table listing requests, tokens, and USD costs for each specific model.

---

## Part 4 — Common Tasks for All Users

The following tasks apply to any user on the platform, regardless of role — as long as your role has the relevant permissions granted by the Tenant Admin.

### 4.1 My Dashboard

After logging in, your dashboard shows:
- **Pending Tasks** — workflow approvals and actions requiring your attention
- **Notifications** — recent alerts and updates
- **Quick Links** — modules your role has access to

### 4.2 Electronic Signatures

When a document or record requires your signature:

1. Navigate to **E-Signatures** or open the document directly
2. Review the content carefully
3. Click **Sign**
4. Enter:
   - **PIN** (your personal identification number)
   - **Meaning of Signature** (e.g., "I have reviewed and approve this document")
   - **Comments** (optional)
5. Click **Sign & Submit**

> ⚠️ **Important:** Your electronic signature is legally equivalent to a handwritten signature under FDA 21 CFR Part 11. Ensure you have fully reviewed all content before signing.

### 4.3 Workflow Task Approvals

1. Navigate to **Workflows → Tasks**
2. The **Assigned To** column shows `email@domain.com (Full Name)`. For multiple assignees, the first user is shown followed by `...` — hover to see all assignees in a tooltip.
3. Click the task → review all details and attached documents
4. Click **Approve** or **Reject**
5. Enter your comments
6. If an e-signature is required, enter your PIN and meaning of signature

### 4.4 Notifications

**View Notifications:**
- Click the bell icon (🔔) in the top navigation bar to see all notifications
- Click any notification to navigate directly to the related record

**Configure Notification Preferences:**
1. Navigate to **Notifications → Notification Settings**
2. Toggle on/off for each event type:
   - Email notifications
   - In-app (browser) notifications
   - Escalation alerts

### 4.5 Document Viewing

1. Navigate to **Documents → Document List**
2. Click any document to open the **Document Viewer**
3. The viewer supports in-browser rendering of PDF, DOCX, XLSX, and image files — no download required
4. From the viewer you can also:
   - View **Version History**
   - View **Electronic Signatures** linked to the document
   - Initiate a workflow action (Approve/Reject) if you are an assigned reviewer

---

## Frequently Asked Questions

**Q: I forgot my PIN for electronic signatures. What should I do?**
A: If you know your account login password, you can reset or update your PIN yourself by navigating to **E-Signatures → Manage Credentials** and entering your login password along with a new 4-6 digit PIN. If you have forgotten both your password and PIN, contact your Tenant Admin to reset your account.

**Q: A document I uploaded shows "Processing" — what does this mean?**
A: The platform is indexing and scanning the file. This typically takes 15–60 seconds. Refresh the page.

**Q: I cannot see a module I expect to have access to.**
A: Your role may not have permission for that module, or the Super Admin may have disabled that service for your organisation. Contact your Tenant Admin to review your access rights.

**Q: Why are some permission checkboxes locked when creating a role?**
A: The Super Admin has disabled that platform service for your organisation. Permissions for disabled services cannot be assigned to any user until the service is re-enabled.

**Q: I was logged out automatically and saw a "Session Expired" message. What happened?**
A: The platform has an inactivity auto-logout feature for security and GxP compliance. If your session is idle for longer than the configured timeout (typically 30 minutes), your session is automatically ended. Simply log in again to continue. If this happens frequently during active use, contact your Tenant Admin to review the idle timeout settings.

**Q: The "New User" quick action on my dashboard opens a page but no form appeared. What should I do?**
A: Wait 1–2 seconds for the page to load — the creation form/modal opens automatically. If it does not appear, click the **New User** button manually in the Users list toolbar.

**Q: Can I access QAssure from my mobile phone?**
A: Yes, the platform is responsive and works on tablet and mobile browsers.

**Q: How long are audit logs retained?**
A: Audit logs are retained for a minimum of 7 years by default. Your Tenant Admin can configure this under Security Policy settings.

---

## Getting Help

| Support Type | Contact |
|-------------|---------|
| Technical Issues | support@qassure.com |
| Training & Onboarding | training@qassure.com |
| Feature Requests | feedback@qassure.com |
| Emergency (P1) | +1-800-QASSURE (24/7) |
| Knowledge Base | https://docs.qassure.com |

---

*End of QASSURE-USR-001*
