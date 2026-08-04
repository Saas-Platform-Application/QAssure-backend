<div align="center">
  <h1>QAssure Platform</h1>
  <h2>CAPA Service — Technical Documentation</h2>
  <h3>Prepared for LTTS Review</h3>
  <p>Version 1.2 | April 24, 2026 | Tech4Biz Solutions | Strictly Confidential</p>
</div>

| Document Property | Details |
| :--- | :--- |
| **Document Title** | QAssure CAPA Service — Technical Documentation |
| **Prepared By** | Tech4Biz Solutions Pvt Ltd |
| **Prepared For** | LTTS Review Team |
| **Date** | April 24, 2026 |
| **Version** | 1.2 |
| **Status** | Final — Implementation Complete & Live-Tested |
| **Classification** | Confidential |

---

# CAPA Service Technical Documentation

## 1. Executive Summary
The **CAPA (Corrective and Preventive Action) Service** is a core component of the QAssure platform designed to manage and track systematic investigations into non-conformities, customer complaints, and audit findings. The service provides a structured framework for identifying root causes, implementing corrective actions to eliminate existing problems, and preventive actions to avoid recurrence. It uniquely supports the industry-standard **8D (Eight Disciplines)** problem-solving methodology, ensuring a robust and compliant quality management process.

---

## 2. Architecture Overview
The CAPA service is built using a modular Node.js architecture:
- **Routes**: Define the RESTful interface for external communication.
- **Controllers**: Handle request validation and response mapping.
- **Services**: Contain the core business logic, workflow triggers, and integration with other services.
- **Models**: Sequelize-based PostgreSQL schemas defining the data structure.

### 2.1 How a CAPA Flows
The lifecycle of a CAPA record follows a structured workflow managed by both the **Workflow Engine** and authorized users (Owners/Quality Managers):

1.  **Drafting**: A CAPA is initiated by identifying a problem. Initial information like title, source, and identified date are captured.
2.  **Submission**: Once ready, the author (usually a Quality Inspector or Auditor) submits the CAPA. This triggers an automated **Workflow Instance**.
3.  **Assignment**: The system assigns an **Owner** (e.g., Department Head). The status shifts to `open` or `investigation`.
4.  **Investigation (Root Cause)**: The **Owner** performs root cause analysis. They can update the status to `investigation` as they work.
5.  **Action Implementation**: The Owner adds one or more **Action Items**. These are assigned to specific **Assignees** who receive notifications. Status shifts to `action`.
6.  **Verification**: Once all actions are completed, a Quality Manager verifies the effectiveness. Status shifts to `verification`.
7.  **Closure**: If verified, the Quality Manager or System Admin marks the CAPA as `closed`. If using 8D methodology, the final report is locked and shared.

---

## 3. Database Schema

### 3.1 `capas` Table
This is the primary table storing the core CAPA record.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier for the CAPA record. |
| `tenant_id` | UUID | ID of the organization (tenant) owning the record. |
| `capa_number` | STRING | Auto-generated unique reference (e.g., CAPA-2024-0001). |
| `title` | STRING | Short descriptive title of the CAPA. |
| `description` | TEXT | Detailed description of the issue. |
| `capa_type` | STRING | Type: `corrective`, `preventive`, or `both`. |
| `source` | STRING | The origin of the CAPA (e.g., `audit`, `customer_complaint`). |
| `priority` | STRING | Urgency level: `critical`, `high`, `medium`, `low`. |
| `status` | STRING | Current workflow state (e.g., `draft`, `open`, `closed`). |
| `problem_statement` | TEXT | Formal definition of the problem being addressed. |
| `immediate_action` | TEXT | Actions taken immediately to mitigate the issue. |
| `containment_action` | TEXT | Temporary actions to contain the non-conformity. |
| `root_cause` | TEXT | Findings from the root cause investigation. |
| `root_cause_method`| STRING | Methodology used (e.g., `5_why`, `fishbone`). |
| `owner_id` | UUID | User ID of the person responsible for the CAPA. |
| `department` | STRING | Department associated with the CAPA. |
| `identified_date` | DATE | Date the issue was first identified. |
| `target_date` | DATE | Expected completion date for the entire CAPA. |
| `closed_date` | DATE | The date when the CAPA was officially closed. |
| `workflow_instance_id`| UUID | ID of the active workflow instance managing approvals. |

**Description**: The `capas` table maintains the high-level state, ownership, and metadata. It links to the tenant for isolation and users for accountability.

### 3.2 `capa_actions` Table
Stores individual implementation tasks associated with a CAPA.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier for the action item. |
| `capa_id` | UUID | Foreign key linking to the parent CAPA. |
| `description` | TEXT | Detailed instruction (e.g., "Update SOP for machine X"). |
| `action_type` | STRING | Category: `immediate`, `corrective`, or `preventive`. |
| `assigned_to` | UUID | User ID responsible for completing this action. |
| `due_date` | DATE | Deadline for action completion. |
| `status` | STRING | `pending`, `in_progress`, `completed`, `verified`. |
| `evidence` | TEXT | Notes or links to documentation proving completion. |

**Description**: Actions represent the granular tasks required to fulfill the CAPA goals.

### 3.3 `capa_8d_reports` Table
Stores discipline-specific data for the 8D problem-solving methodology.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier. |
| `capa_id` | UUID | Link to the CAPA record. |
| `d1_team` | JSONB | List of team members involved (Name, Role). |
| `d2_problem_description`| TEXT | Detailed 5W2H problem description. |
| `d3_containment_actions` | TEXT | Interim actions taken to protect the customer. |
| `d4_root_causes` | TEXT | Detailed analysis of root cause and escape point. |
| `d5_corrective_actions` | TEXT | Chosen permanent corrective actions. |
| `d6_implementation_plan` | TEXT | Validation and implementation details. |
| `d7_preventive_actions` | TEXT | Actions to prevent systemic recurrence. |
| `d8_recognition` | TEXT | Team recognition and closure notes. |

---

## 4. REST API Endpoints

### 4.1 Lookup Data Endpoints
- **GET** `/api/v1/capas/types`: Returns CAPA categories.
- **GET** `/api/v1/capas/sources`: Returns possible CAPA origins.
- **GET** `/api/v1/capas/priorities`: Returns priority levels and SLA days.
- **GET** `/api/v1/capas/statuses`: Returns valid workflow statuses.

### 4.2 CAPA Management Endpoints

#### **Create CAPA**
- **Endpoint**: `POST /api/v1/capas`
- **Use Case**: Initialize a new CAPA record.
- **Payload Example**:
```json
{
  "title": "Machine Overheating in Production Line A",
  "capa_type": "corrective",
  "source": "internal",
  "priority": "high",
  "owner_id": "us-uuid-123",
  "use_8d": true
}
```

#### **Submit for Investigation**
- **Endpoint**: `POST /api/v1/capas/:id/submit`
- **Use Case**: Move CAPA from `draft` to `open` status and trigger the workflow.

#### **Update Status**
- **Endpoint**: `PATCH /api/v1/capas/:id/status`
- **Use Case**: Manually progress the CAPA through lifecycle stages.
- **Payload Example**: `{"status": "investigation"}`

---

## 5. Implementation Details

### 5.1 Notification System
The CAPA service uses the platform's Notification Engine to ensure timely actions.

| Notification Code | Trigger Event | Primary Recipient |
| :--- | :--- | :--- |
| `capa_assigned` | CAPA is created or owner is changed. | CAPA Owner |
| `capa_closed` | CAPA status is updated to `closed`. | CAPA Owner |
| `capa_overdue` | CAPA `target_date` has passed and status != `closed`. | CAPA Owner & Quality Manager |

**How users see notifications:**
-   **Email**: Users receive structured HTML emails with direct links to the CAPA record.
-   **In-App Alerts**: A bell icon in the QAssure header displays real-time alerts.
-   **Dashboard**: Overdue CAPAs are highlighted in the "Attention Required" widget of the CAPA Dashboard.

### 5.2 Audit Logging & Governance
Every action is audited to maintain compliance with ISO 9001 and IATF 16949 standards. The **Audit Service** captures:
-   **Who**: The User ID and IP address of the actor.
-   **What**: The specific action (e.g., `status_changed`, `root_cause_updated`).
-   **When**: Server-side timestamp.
-   **Fields**: A JSON diff showing the old value vs the new value for critical fields like `priority`, `status`, and `target_date`.

### 5.3 Workflow & Lifecycle Management
-   **Workflow Instance ID**: Each submitted CAPA is bound to a process instance in the **Workflow Engine**. This allows for parallel approval paths and conditional logic based on priority or department.
-   **Status Changes**:
    -   Authorized users (Owners or Admins) can update statuses via the `Update Status` endpoint.
    -   The Workflow Engine can automatically transition statuses upon completion of specific milestones (e.g., "All Actions Completed").
-   **Action Management**:
    -   **Who adds Actions?**: The CAPA Owner or a Quality Manager with `capa:write` permission.
    -   **What can be added?**: Instructions, action types, assignees, and deadlines.
    -   **Assignee Responsibility**: Assignees can update the Action status to `completed` and upload evidence (links/text) for the Owner to review.

---

## 6. Integrations
-   **Workflow Engine**: Governs state transitions and automated tasking.
-   **Notification Service**: Multi-channel alerting (Email, In-app).
-   **Audit Service**: Compliance history and traceability.
-   **Search/Indexing**: Enables rapid discovery via `IndexingHooks`.
-   **Reporting Service**: Aggregates data for the CAPA Performance Dashboard.
