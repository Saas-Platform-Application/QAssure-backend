<div align="center">
  <h1>QAssure Platform</h1>
  <h2>Electronic Signature Service — Technical Documentation</h2>
  <h3>Prepared for Compliance & Technical Review</h3>
  <p>Version 1.0 | April 27, 2026 | Tech4Biz Solutions | Strictly Confidential</p>
</div>

| Document Property | Details |
| :--- | :--- |
| **Document Title** | QAssure Electronic Signature Service — Technical Documentation |
| **Prepared By** | Tech4Biz Solutions Pvt Ltd |
| **Prepared For** | Technical Review & Compliance Audit |
| **Date** | April 27, 2026 |
| **Version** | 1.0 |
| **Status** | Final — Implementation Complete |
| **Classification** | Confidential |

---

# Electronic Signature Service Technical Documentation

## 1. Executive Summary
The **Electronic Signature Service** is a critical compliance component of the QAssure platform, specifically designed to meet **FDA 21 CFR Part 11** requirements for electronic records and electronic signatures. This service provides a legally binding way for users to approve, verify, and authorize records within the platform. By ensuring non-repudiation, auditability, and unique identification, the service enables transition from paper-based quality processes to fully digital, compliant workflows.

---

## 2. Architecture Overview
The Electronic Signature service operates as a cross-cutting concern within the platform:
-   **Routes**: Provides endpoints for signing, verification, and PIN management.
-   **Controllers**: Manages request handling and response formatting.
-   **Services**: Implements the core signing logic, including hashing, validation, and multi-factor authentication (Password + PIN).
-   **Models**: PostgreSQL schema (`electronic_signatures`) designed for long-term audit retention (7+ years).

---

## 3. How Electronic Signatures Work

### 3.1 Compliance Logic (FDA Part 11)
The service implements specific sections of the FDA regulation:
-   **§11.50 (Signature Manifestations)**: Every signature includes a "meaning" (e.g., "I am the author," "I approve this record") and a timestamp.
-   **§11.100 (Unique Identification)**: Each signature is uniquely linked to a specific user and cannot be reassigned or reused.
-   **§11.70 (Signature/Record Linking)**: Signatures are cryptographically linked to the specific state of the record they represent using SHA-256 hashing.

### 3.2 The Signing Process
When a resource (like a Workflow Task or a Document) requires a signature:
1.  **Identity Verification**: The user must provide their current platform **Password**.
2.  **Second Factor (PIN)**: The user must provide a secret **4-6 digit PIN** (this ensures the signature is not just a reuse of the session).
3.  **Action Selection**: The user selects an action (APPROVE, REJECT, etc.) which carries a predefined meaning.
4.  **Hash Generation**: The system generates a `signature_hash` by combining the User ID, Resource ID, Timestamp, Action, and Meaning.
5.  **Persistence**: The record is stored in the `electronic_signatures` table, providing a permanent, immutable record of the intent.

---

## 4. Database Schema

### 4.1 `electronic_signatures` Table
Stores the non-repudiable record of each signature event. This table is optimized for long-term storage and regulatory auditing.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier for the signature record. |
| `user_id` | UUID | ID of the user who performed the signature. |
| `tenant_id` | UUID | ID of the organization owning the record. |
| `resource_type` | STRING | Category of the signed entity (e.g., `workflow_task`, `document`). |
| `resource_id` | STRING | The specific ID of the entity being signed. |
| **`resource_name`** | STRING | Human-readable name of the entity at the time of signing. |
| `action` | STRING | The compliance intent (e.g., `APPROVE`, `REJECT`, `VERIFY`). |
| `meaning` | TEXT | Legal manifestation (e.g., "I have reviewed and approve this record"). |
| **`auth_method`** | STRING | Method used for authentication (e.g., `password_pin`, `sso`). |
| `signature_hash`| STRING | SHA-256 HMAC of signature data to ensure non-repudiation. |
| **`user_agent`** | TEXT | Browser/Client identifier used during the signing process. |
| **`device_info`** | JSONB | Details about the device (OS, Browser, Platform) used for signing. |
| **`location`** | JSONB | Geographic metadata (Region, Country) captured during signing. |
| `ip_address` | INET | Network address from which the signature was captured. |
| `signed_at` | TIMESTAMP| Server-side timestamp proving when the signature occurred. |
| **`signature_order`**| INTEGER| The sequence number in a multi-signature workflow. |
| **`required_signatures`**| INTEGER| Total count of signatures needed for the specific resource. |
| `workflow_id` | UUID | Link to the Workflow Instance, if part of a governed process. |
| `is_valid` | BOOLEAN | Logic flag to indicate if the signature is active. |
| **`invalidated_at`**| TIMESTAMP| Date and time when the signature was declared void. |
| **`invalidated_by`**| UUID | ID of the administrator who invalidated the signature. |
| **`invalidation_reason`**| TEXT | Justification for removing the signature from the valid pool. |

---

## 5. REST API Endpoints - Lifecycle Flow

To properly implement or test the Electronic Signature service, follow this logical sequence of operations.

### Step 1: User Configuration
Before a user can sign records, they must establish their second-factor secret (PIN).

#### **Set/Update Signature PIN**
- **Endpoint**: `POST /api/v1/electronic-signatures/pin`
- **Description**: Securely hashes and stores a 4-6 digit PIN. Requires the user's current login password for verification.
- **Payload**:
  ```json
  {
    "password": "UserCurrentPassword123",
    "pin": "1234"
  }
  ```

---

### Step 2: Resource Signing
Once the PIN is set, the user can perform signing actions across various platform modules.

#### **Create Electronic Signature**
- **Endpoint**: `POST /api/v1/electronic-signatures/sign`
- **Description**: Captures a formal signature for a specific resource. This endpoint performs double-authentication (Password + PIN) and calculates the cryptographic hash.
- **Key Parameters**:
    - `resource_type`: The entity category (e.g., `capa`).
    - `resource_id`: The UUID of the record.
    - `action`: The intent (must be one of the [Allowed Actions](#lookup-data)).
    - `password` & `pin`: The authentication tokens.
- **Payload Example**:
  ```json
  {
    "resource_type": "workflow_task",
    "resource_id": "8489-uuid-999",
    "action": "APPROVE",
    "meaning": "I have verified the root cause analysis.",
    "password": "Password123",
    "pin": "1234"
  }
  ```

---

### Step 3: Verification & Status Tracking
Systems or admins can verify the validity of signatures at any time.

#### **Verify Signature Integrity**
- **Endpoint**: `POST /api/v1/electronic-signatures/verify`
- **Description**: Verifies that a signature exists, is linked to the correct tenant, and has not been invalidated.
- **Payload**: `{"signature_id": "sig-uuid-111"}`

#### **Get Specific Signature**
- **Endpoint**: `GET /api/v1/electronic-signatures/:id`
- **Description**: Retrieves full metadata for a specific signature, including signer details and cryptographic hash.

#### **Workflow Completion Status**
- **Endpoint**: `GET /api/v1/electronic-signatures/workflow/:workflowId/status`
- **Description**: Returns the progress of a multi-signature workflow, showing how many signatures are captured vs. how many are required.

---

### Step 4: Audit & History Discovery
These endpoints are used for compliance reporting and in-app audit history views.

#### **Get Resource Signatures**
- **Endpoint**: `GET /api/v1/electronic-signatures/resource/:resourceType/:resourceId`
- **Use Case**: Displays the "Signature Log" at the bottom of a document or CAPA record.

#### **Get User Signature History**
- **Endpoint**: `GET /api/v1/electronic-signatures/history`
- **Use Case**: Allows users to view their own signing profile and history. Supports filters for `resource_type`, `action`, and date ranges.

#### **Compliance Statistics**
- **Endpoint**: `GET /api/v1/electronic-signatures/statistics`
- **Use Case**: Used by Quality Managers to generate reports on signing frequency, unique signers, and action breakdown across the organization.

---

### Step 5: Governance & Correction
In rare cases of administrative error, signatures must be managed.

#### **Invalidate Signature**
- **Endpoint**: `POST /api/v1/electronic-signatures/:id/invalidate`
- **Access**: Restricted to Super Admins.
- **Significance**: FDA Part 11 prohibits deleting signatures. This endpoint marks the signature as invalid while preserving the record in the database for 7+ years. A mandatory `reason` must be provided for the compliance log.

---

#### <a name="lookup-data"></a>Lookup Data Endpoints
- **GET** `/api/v1/electronic-signatures/actions`: Returns the official list of actions (APPROVE, REJECT, REVIEW, etc.) and their functional descriptions.

---

## 6. Implementation & Integrations

### 6.1 Workflow Service Integration
The **Workflow Engine** is the primary consumer of this service. In a regulated workflow (e.g., CAPA Approval), a transition between steps may be configured to require an electronic signature.
-   **Blocking Transitions**: If a step requires a signature, the `transition()` method in the Workflow Engine calls the Electronic Signature Service.
-   **Failure Handling**: If the password or PIN is incorrect, the workflow transition is blocked, and a failed attempt is recorded.
-   **Traceability**: The `workflow_tasks` table stores a `signature_id`, linking the task completion directly to the electronic signature evidence.

### 6.2 Security & Governance
-   **Encryption**: PINs are hashed using `bcrypt` before storage. Signature data is hashed using SHA-256.
-   **Lockout Policy**: 5 failed signature attempts will lock the user's account for 30 minutes, preventing brute-force attacks on PINs.
-   **Audit Logging**: Every signature creation is automatically logged to the `audit_logs` service, capturing metadata like IP Address and User Agent.
-   **Invalidation**: Only Super Admins can invalidate a signature (e.g., in case of data entry error), and even then, the record is not deleted—it is marked `is_valid = false` with a forced `invalidation_reason`.

---

## 7. Key Benefits
-   **Regulatory Readiness**: Out-of-the-box compliance for Bio-Tech, Pharma, and Medical Device industries.
-   **Operational Speed**: Eliminates the need for physical printing, signing, and scanning of quality documents.
-   **Enhanced Traceability**: Instant visibility into who approved what and when, with cryptographically verifiable evidence.
-   **Cross-Module Utility**: Can be used for CAPA, Documents, Change Requests, Batch Records, and Training Attendance.
