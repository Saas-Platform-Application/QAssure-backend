# QAssure Document Management Service — Design Document
**Multi-Tenant Controlled Document Vault (AiDV) with Versioning, Section-Level Collaboration, and Workflow Integration**

---

## 1. Overview & Architecture

The Document Management Service (often referred to as the AI Document Vault - AiDV) provides the core infrastructure for managing controlled documents within QAssure. It governs the entire lifecycle of records like Standard Operating Procedures (SOPs), Policies, Work Instructions, and Specifications. 

In regulated spaces (e.g., medical devices, clinical trials, and pharmaceuticals), document control is a compliance mandate (FDA 21 CFR Part 11). The service guarantees:
*   **Version Control & Integrity**: Major and minor version increments, immutable PDF/file metadata, and SHA-256 integrity hashing to prevent file tampering.
*   **Concurrency Protection (Checkout/Checkin)**: Lockout mechanisms to prevent multiple authors from editing a document simultaneously.
*   **Granular Section Review (Collaboration)**: Documents are segmented into structured sections. Reviews and rework requests are handled per-section by specific workflow step assignees, facilitating fast, targeted collaboration.
*   **Electronic Signature-backed Promotion**: Transitioning a document to the `effective` state requires a verified electronic signature (username/password + signing purpose validation).
*   **Training Loop Integration**: Release of a new document version automatically triggers training requirements for users based on category configurations.

---

## 2. Architecture & Data Flow

### 2.1 Checkout & Editing Concurrency Flow

The optimistic locking model protects active document drafts from concurrent overwrites:

```mermaid
sequenceDiagram
    autonumber
    actor UserA as Document Author A
    actor UserB as Document Author B
    participant Service as Document Service
    database DB as PostgreSQL DB

    UserA->>Service: POST /api/v1/documents/:id/checkout
    Service->>DB: Check if active checkout exists
    DB-->>Service: No active checkout
    Service->>DB: INSERT into document_checkouts (checked_out_by, expires_at)
    Service-->>UserA: Checkout Successful (Document locked)

    UserB->>Service: POST /api/v1/documents/:id/checkout
    Service->>DB: Check active checkout
    DB-->>Service: Active checkout exists (User A)
    Service-->>UserB: 409 Conflict / Checkout Failed

    UserA->>Service: POST /api/v1/documents/:id/checkin (Upload/Save new version draft)
    Service->>DB: Verify checkout owner matches User A
    Service->>DB: UPDATE document_versions + DELETE document_checkouts
    Service-->>UserA: Checkin Successful (Document unlocked)
```

---

### 2.2 Workflow Review & Section Collaboration Flow

Document approvals are driven by the Workflow Engine, mapping reviews to specific step assignees:

```mermaid
sequenceDiagram
    autonumber
    actor Creator as Document Creator
    actor Reviewer as Section Reviewer / Assignee
    participant Service as Document Service
    participant Engine as Workflow Engine Service
    database DB as PostgreSQL DB

    Creator->>Service: POST /api/v1/documents/:id/submit
    Service->>Engine: startWorkflow(workflowDefinitionId, entityId, tenantId)
    Engine-->>Service: Returns workflowInstanceId
    Service->>DB: UPDATE documents (status = 'in_review', workflow_instance_id)
    Service-->>Creator: Submitted for review

    Note over Reviewer, Service: Collaborative Review Loop
    Reviewer->>Service: GET /api/v1/documents/:id/sections
    Service-->>Reviewer: List sections with review_status (pending)

    Reviewer->>Service: PATCH /api/v1/documents/:id/sections/:sectionId (Update content)
    Service->>Engine: Check if Reviewer is active step assignee
    Engine-->>Service: Yes, authorized
    Service->>DB: UPDATE section content
    Service-->>Reviewer: Section updated

    Reviewer->>Service: POST /api/v1/documents/:id/sections/:sectionId/review (Mark reviewed/rework)
    Service->>DB: UPDATE section review_status (reviewed | rework) & log rework_requested_step
    Service-->>Reviewer: Review status updated
```

---

### 2.3 Version Promotion (makeEffective) Flow

Transitioning from approved to effective status requires cryptographic signature verification:

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Document Owner
    participant Service as Document Service
    participant SigService as Electronic Signature Service
    database DB as PostgreSQL DB

    Owner->>Service: POST /api/v1/documents/:id/make-effective (Signature credentials, effective_date)
    Service->>SigService: verifySignature(username, password, purpose_code)
    SigService-->>Service: Returns signatureId (verified)
    
    Service->>DB: Begin Transaction
    Service->>DB: Demote current active version (status = 'superseded')
    Service->>DB: Promote new version (status = 'effective', current_version_id, signature_id)
    Service->>DB: Calculate next_review_date = effective_date + review_frequency_months
    Service->>DB: Commit Transaction
    
    Service-->>Owner: Promotion successful (Document released)
```

---

## 3. Database Schema Mapping

| Table Name | Description | Key Indexes / Constraints |
| :--- | :--- | :--- |
| `document_categories` | Hierarchical groupings for documents, housing settings like retention and review cycles | Unique on `(tenant_id, code)` |
| `documents` | Master records holding identity parameters, status metadata, and active version links | Unique on `(tenant_id, document_number)` |
| `document_versions` | Files metadata, file hashes, text content, change reasons, and signatures for revisions | Unique on `(document_id, version_number)` |
| `document_sections` | Granular sections of a document version, housing per-section review and rework tracking | Index on `(document_id, review_status)` |
| `document_comments` | Section-level or document-level comment threads and resolution states | Index on `(document_id, status)` |
| `document_checkouts` | Optimistic locking token table to coordinate editing rights | Unique on `document_id` |
| `document_access_log` | Immutable read/write interaction logger for Part 11 auditing | Index on `accessed_at` |
| `document_training` | Training requirements linked to released document versions | Index on `(document_id, version_id)` |
| `document_links` | Multi-document dependencies (e.g. references, supersedes, related) | Unique on `(source, target, type)` |
| `document_templates` | Predefined structural layouts for documents | Index on `(tenant_id, document_type)` |

---

## 4. Key Design Choices

### 4.1 Granular Section-Based Review and Traceability (Migration 093 & 094)
Traditional systems review documents as a single monolithic block. QAssure breaks down documents into `document_sections`. Reviewers can mark individual sections as `reviewed` or request `rework`. This isolates comments to specific lines of text and tracks rework requests directly inside the section metadata (`rework_requested_step`, `rework_requested_by`), preventing endless back-and-forth email reviews.

### 4.2 Optimistic Checkout Expiration
Locking drafts avoids the risk of overlapping changes. If a user checks out a document but becomes inactive, the system handles lock decay via the `expires_at` column in the `document_checkouts` table, releasing locks after a configurable timeout period (default 24 hours).

### 4.3 Loose Coupling with the Workflow Engine
The document service does not implement hardcoded workflow transitions. Instead, it delegates step tracking, routing, and assignees to the generic Workflow Engine via API calls. If the workflow requires signatures, the Document Service intercepts the final step, runs verification, and promotes the document locally.
