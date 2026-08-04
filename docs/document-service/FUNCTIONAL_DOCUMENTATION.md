# QAssure Document Management Service — Functional Documentation
**User Stories, Business Rules, Collaboration Workflows, and 21 CFR Part 11 Compliance**

---

## 1. User Stories & Persona Mapping

The service supports various stakeholders who interact with controlled documents during their lifecycle:

```
                  +-----------------------------------+
                  |  Persona Map & Lifecycle Roles   |
                  +-----------------------------------+
                                    |
         +--------------------------+--------------------------+
         |                                                     |
         v                                                     v
+------------------+                                  +------------------+
|      AUTHOR      |                                  |     REVIEWER     |
|  - Check out/in  |                                  |  - Add comments  |
|  - Write drafts  |                                  |  - Mark sections |
|  - Create version|                                  |  - Check tasks   |
+------------------+                                  +------------------+
         |                                                     |
         +--------------------------+--------------------------+
                                    |
         +--------------------------+--------------------------+
         |                                                     |
         v                                                     v
+------------------+                                  +------------------+
| QUALITY MANAGER  |                                  |     OPERATOR     |
|  - Setup configs |                                  |  - View SOPs     |
|  - Approve workflow|                                |  - Complete quiz |
|  - Sign & release|                                  |  - Acknowledge   |
+------------------+                                  +------------------+
```

### 1.1 Document Author / Creator
*   *As a* Document Author,
*   *I want to* check out an existing document draft and create a minor version update,
*   *So that* I can implement regulatory updates without other authors overriding my changes.

### 1.2 Document Reviewer / Subject Matter Expert (SME)
*   *As a* Document Reviewer,
*   *I want to* review individual document sections assigned to my workflow step, mark them as "reviewed" or request "rework," and add targeted comments,
*   *So that* the author knows exactly which sections need corrections.

### 1.3 Quality Manager / Compliance Officer
*   *As a* Quality Manager,
*   *I want to* verify that all mandatory document sections are marked as "reviewed" and all thread comments are resolved,
*   *So that* I can securely sign off on the release using my electronic signature PIN.

### 1.4 Operator / Trainee
*   *As an* Operator on the shop floor,
*   *I want to* access effective versions of procedures and automatically receive training tasks when new versions are released,
*   *So that* I remain compliant with standard operating procedures.

---

## 2. Core Functional Capabilities & Business Rules

### 2.1 Concurrency Prevention (Checkout / Checkin)
*   A user must explicitly **Checkout** a document to unlock its editing capability.
*   While checked out, the document is locked; other users attempting to save, update sections, or execute checkins will receive a `409 Conflict` error.
*   Checkouts automatically expire after **24 hours** to prevent documents from being locked indefinitely due to user inactivity.

### 2.2 Section-Based Structured Reviews
*   When a document is in the `in_review` state, it is divided into `document_sections`.
*   Assignees of the current active workflow step have the exclusive right to edit section content or mark section statuses.
*   A section can be marked as `pending` (needs review), `reviewed` (approved by assignee), or `rework` (needs author correction).
*   If any section has `is_mandatory = true`, the workflow task cannot transition to "completed" until that section's status is set to `reviewed`.

### 2.3 Threaded Comments & Resolutions
*   Comments can be attached to the overall document or linked to a specific section.
*   Comments support threaded replies (parent/child hierarchy).
*   Comments are initialized in the `open` status. A Quality Manager or the author can mark comments as `resolved` once the correction is implemented. The system blocks final approval if there are any unresolved (`open`) comments.

### 2.4 Automatic Training Enrollment
*   If a category is configured with `requires_training = true`, promoting a document to the `effective` status triggers the creation of training tasks for all assigned users/roles.
*   Users are notified via Kafka/email and must acknowledge or pass a quiz before they are marked as "Trained" for the new document version.

---

## 3. Compliance and Security Controls (FDA 21 CFR Part 11)

To support audits in regulated environments, the service includes several built-in compliance controls:

### 3.1 Dual-Factored Electronic Signatures
*   Transitioning a document version to `effective` requires an electronic signature.
*   The signature API verifies two distinct identity credentials: the user's password/PIN and a signing purpose code (e.g., `AUTHOR_SIGN`, `REVIEW_SIGN`, `QA_RELEASE`).
*   The verified signature record is linked to the `document_versions` table, creating an unalterable sign-off log.

### 3.2 File Integrity Cryptographic Hashes
*   Whenever a file (e.g., PDF, DOCX) is checked into the document vault, the system calculates its SHA-256 hash.
*   This hash is stored in `document_versions.file_hash`. During periodic system checks, the system verifies the hash of the physical file in storage against the database record to detect unauthorized external modifications.

### 3.3 Immutable Access Logging
*   All read/write operations (viewing, downloading, editing, checkout, checkin) are logged in the `document_access_log` table.
*   This log records the user's ID, action, timestamp, IP address, and user agent. Access log entries cannot be modified or deleted by any user role (including Super Admin).
