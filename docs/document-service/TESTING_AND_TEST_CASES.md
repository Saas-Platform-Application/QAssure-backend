# QAssure Document Management Service — Testing & Test Cases Guide
**Test Strategy, Target Scenarios, Verification Criteria, and Compliance Audits**

---

## 1. Quality Assurance & Test Strategy

Testing the Document Management Service requires validating standard API behaviors, database state changes, and regulatory compliance constraints.

```
+--------------------------------------------------------------+
|                    Testing Architecture                      |
+--------------------------------------------------------------+
                               |
       +-----------------------+-----------------------+
       |                       |                       |
       v                       v                       v
+--------------+        +--------------+        +--------------+
|  UNIT TESTS  |        | INTEGRATION  |        |  COMPLIANCE  |
|  - Services  |        |  - API Keys  |        |  - Part 11   |
|  - Schemas   |        |  - Workflows |        |  - Hash check|
|  - Models    |        |  - Isolation |        |  - Access log|
+--------------+        +--------------+        +--------------+
```

### 1.1 Scope of Testing
*   **Unit Level**: Validation of Zod request parsing schemas, file hash calculators, and service layer methods (such as version comparison and lock expiration calculations).
*   **Integration Level**: Verification of database locks, multi-tenant workspace isolation boundaries, and interactions with external modules (e.g., Workflow Engine, E-Signature).
*   **Compliance Auditing**: Verification of electronic signature security validations and immutable access logging.

---

## 2. Test Cases & Verification Scenarios

### 2.1 Scenario 1: Document Draft Creation & Zod Schema Validation
*   **Objective**: Verify that documents can be created with valid inputs, and that incorrect inputs are rejected with appropriate error codes.
*   **Test Setup**: Active tenant, authenticated user.
*   **Test Steps**:
    1. Send a `POST /api/v1/documents` request with valid details (title, type, category UUID).
    2. Send a `POST /api/v1/documents` request with an invalid type (e.g., `RANDOM_TYPE`).
    3. Send a `POST /api/v1/documents` request with a missing title.
*   **Expected Results**:
    *   Step 1 returns HTTP `211 Created` and a valid document object with status `draft`.
    *   Step 2 returns HTTP `400 Bad Request` with a Zod validation error for the `document_type` field.
    *   Step 3 returns HTTP `400 Bad Request` with a Zod validation error for the `title` field.

### 2.2 Scenario 2: Checkout Concurrency & Locking
*   **Objective**: Verify that checked-out documents cannot be edited by other users.
*   **Test Setup**: Active document ID, User A (Author) and User B (Reviewer).
*   **Test Steps**:
    1. User A sends a `POST /api/v1/documents/:id/checkout` request with a valid checkout reason.
    2. User B sends a `POST /api/v1/documents/:id/checkout` request.
    3. User B attempts to edit a section of the document via `PATCH /api/v1/documents/:id/sections/:sectionId`.
    4. User A sends a `POST /api/v1/documents/:id/checkin` request.
*   **Expected Results**:
    *   Step 1 returns HTTP `200 OK` and locks the document for User A.
    *   Step 2 returns HTTP `409 Conflict` (checkout failed).
    *   Step 3 returns HTTP `403 Forbidden` or `409 Conflict` (document is locked).
    *   Step 4 returns HTTP `200 OK`, releases the checkout entry, and unlocks the document.

### 2.3 Scenario 3: Collaborative Section Reviews
*   **Objective**: Verify that section-based review flows work correctly during the review step.
*   **Test Setup**: Document in `in_review` status, associated workflow instance active, User B assigned to the active step.
*   **Test Steps**:
    1. User B reviews a mandatory section and sends a `POST /api/v1/documents/:id/sections/:sectionId/review` request with status `rework`.
    2. User B attempts to approve the final document draft via `POST /api/v1/documents/:id/approve`.
    3. The author corrects the section content and checks in the document.
    4. User B reviews the section again and sends a `POST /api/v1/documents/:id/sections/:sectionId/review` request with status `reviewed`.
*   **Expected Results**:
    *   Step 1 returns HTTP `200 OK` and updates `review_status` to `rework`.
    *   Step 2 returns HTTP `400 Bad Request` (cannot approve with pending or rework sections).
    *   Step 4 returns HTTP `200 OK` and updates `review_status` to `reviewed`.

### 2.4 Scenario 4: Electronic Signature Validation & Promotion
*   **Objective**: Verify that a document can only be promoted to `effective` with a valid electronic signature.
*   **Test Setup**: Approved document, User A (Quality Manager).
*   **Test Steps**:
    1. User A sends a `POST /api/v1/documents/:id/make-effective` request with invalid signature credentials (wrong password or signature PIN).
    2. User A sends a `POST /api/v1/documents/:id/make-effective` request with valid signature credentials.
*   **Expected Results**:
    *   Step 1 returns HTTP `401 Unauthorized` or `400 Bad Request` (signature verification failed).
    *   Step 2 returns HTTP `200 OK`, transitions the document status to `effective`, updates the `current_version_id`, and sets the next review date.

### 2.5 Scenario 5: Access Log Integrity
*   **Objective**: Verify that all document interactions are logged in the access log.
*   **Test Setup**: Active document.
*   **Test Steps**:
    1. User A views the document (`GET /api/v1/documents/:id`).
    2. Check the database `document_access_log` table for the latest entries.
*   **Expected Results**:
    *   An entry exists in the access log table with User A's ID, action `view`, the correct document ID, the client's IP address, and the request timestamp.
