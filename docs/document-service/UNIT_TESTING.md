# QAssure Document Management Service — Unit Testing Specification
**Framework Mocks, Service Checklists, Validation Bounds, and Test Suites**

---

## 1. Test Infrastructure & Mocking Strategy

The unit tests for the Document Management Service are executed using Jest. To test service methods in isolation, we mock all external dependencies, including database connections, the Workflow Engine, the Electronic Signature Service, and the Notification client.

```
+--------------------------------------------------------------+
|                     Mocking Architecture                     |
+--------------------------------------------------------------+
                               |
       +-----------------------+-----------------------+
       |                       |                       |
       v                       v                       v
+--------------+        +--------------+        +--------------+
|   DATABASE   |        |   WORKFLOW   |        |  SIGNATURES  |
|  - Mock pool |        | - Mock Engine|        |  - Mock sign |
|  - Mock query|        | - start/get  |        |  - verifyPIN |
+--------------+        +--------------+        +--------------+
```

### 1.1 Dependency Mock Templates

Below is the standard mock configuration used across the unit test suites:

```javascript
// Mock database pool
jest.mock('../../config/database', () => ({
  pool: {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    }),
    query: jest.fn()
  }
}));

// Mock workflow engine service
jest.mock('../workflow-engine.service', () => ({
  getWorkflowEngineService: () => ({
    startWorkflow: jest.fn().mockResolvedValue({ id: 'mock-workflow-instance-uuid' }),
    getInstance: jest.fn().mockResolvedValue({ status: 'completed' })
  })
}));

// Mock electronic signature service
jest.mock('../electronic-signature.service', () => ({
  getElectronicSignatureService: () => ({
    verifySignature: jest.fn().mockResolvedValue('mock-signature-uuid')
  })
}));
```

---

## 2. Unit Testing Checklists

### 2.1 Service Layer Tests (`document.service.js`)

#### `create()`
*   [ ] Verify that a document draft is successfully created with correct category parameters.
*   [ ] Verify that the document defaults to `status = 'draft'` when no workflow ID is provided.
*   [ ] Verify that the document transitions to `status = 'in_review'` and triggers `workflowEngine.startWorkflow` if a `workflow_definition_id` is supplied in the creation body.
*   [ ] Verify that creation fails with an error if the category ID is invalid or does not exist.

#### `checkout()`
*   [ ] Verify that a checkout lock is inserted with an expiration timestamp (`expires_at`) set to 24 hours in the future.
*   [ ] Verify that a checkout fails with a `409 Conflict` error if another active lock exists.
*   [ ] Verify that a checkout succeeds if the existing lock is expired.

#### `checkin()`
*   [ ] Verify that checkin successfully deletes the checkout lock and saves changes.
*   [ ] Verify that checkin throws an error if the user attempting checkin is not the user who holds the checkout lock.

#### `submitForReview()`
*   [ ] Verify that the document status changes to `in_review` and a workflow instance is started in the engine.
*   [ ] Verify that submission fails if the document is already in a state other than `draft` or `approved`.

#### `makeEffective()`
*   [ ] Verify that signature verification is called with the user's signature PIN and purpose.
*   [ ] Verify that the document status transitions to `effective`.
*   [ ] Verify that the `next_review_date` is correctly calculated based on the category's `review_frequency_months` setting.
*   [ ] Verify that any existing active version is demoted to `superseded` in the database.

---

### 2.2 Validation Schema Tests (`document.schema.js`)

#### `CreateDocumentSchema`
*   [ ] **Valid Inputs**: Check that a payload containing all required fields (`title`, `document_type`) passes parsing.
*   [ ] **Invalid Document Type**: Verify that types outside the supported list (e.g., `MANUAL`) are rejected.
*   [ ] **Invalid UUID formats**: Verify that invalid strings for UUID fields (`category_id`, `owner_id`) trigger parsing errors.
*   [ ] **Sections Validation**: Verify that the nested `sections` array validates section numbers, titles, and mandatory flags correctly.
