# QAssure Prompt Management Service — Testing & Test Cases Document

---

## 1. Test Strategy

The Prompt Management Service test plan covers API validations, template compilation, execution control, file processing, and isolation boundaries.

1. **Schema & Validation**: Checking Zod rules for names, variables, temperatures, and query limits.
2. **Dynamic Interpolation**: Verifying that variables are correctly parsed and system instructions compile.
3. **Execution Lifecycle**: Testing standard completions, SSE streams, and active request cancellations.
4. **Multimodal Processing**: Testing visual files (images/PDFs) and extractable documents.
5. **Regression Testing (Test Cases)**: Running user test scenarios and logging assertions.
6. **Multi-Tenant Protection**: Confirming that tenant boundaries prevent data exposure.

---

## 2. Test Case Matrix

| ID | Endpoint | Scope | Test Scenario | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **PM-TC-01** | `POST /` | CRUD | Create new prompt template (draft) | 201 Created. Template stored, version 1 snapshot created. |
| **PM-TC-02** | `POST /` | CRUD | Create prompt with default parameters | 201 Created. Custom temperature/max_tokens stored. |
| **PM-TC-03** | `POST /` | Validation | Missing template or name | 400 Bad Request. Zod returns name/template errors. |
| **PM-TC-04** | `POST /` | Validation | Variable with invalid type (e.g. `object`) | 400 Bad Request. Zod fails type validation. |
| **PM-TC-05** | `PUT /:id` | Versioning | Edit prompt template string | 200 OK. Version increments to 2, version 1 saved to history. |
| **PM-TC-06** | `PUT /:id` | Versioning | Edit prompt metadata only (no template text change) | 200 OK. Version number does not increment. |
| **PM-TC-07** | `PATCH /:id/status` | Lifecycle | Transition prompt status to `active` | 200 OK. status field set to active. |
| **PM-TC-08** | `PATCH /:id/status` | Lifecycle | Transition prompt to invalid status | 400 Bad Request. Zod fails enum constraint. |
| **PM-TC-09** | `POST /:id/clone` | CRUD | Clone active template | 201 Created. Copy saved in draft state. |
| **PM-TC-10** | `POST /:id/execute` | Execution | Run active template with valid variables | 200 OK. Variables interpolated, completion result returned. |
| **PM-TC-11** | `POST /:id/execute` | Execution | Run active template with missing required variable | 400 Bad Request. Returns variable missing error. |
| **PM-TC-12** | `POST /:id/execute` | Execution | Run draft template | 400 Bad Request. Returns error prompt is not active. |
| **PM-TC-13** | `POST /:id/execute` | Streaming | Run completion with `stream: true` | 200 OK. Returns SSE chunks, done metadata object at end. |
| **PM-TC-14** | `POST /:id/cancel` | Cancellation | Cancel active streaming connection | 200 OK. Local stream aborted. |
| **PM-TC-15** | `POST /:id/cancel` | Cancellation | Cancel non-existent request ID | 404 Not Found. Returns no active execution found. |
| **PM-TC-16** | `POST /:id/execute-with-file`| Multimodal | Upload DOCX/XLSX text file | 200 OK. Text extracted and injected into prompt. |
| **PM-TC-17** | `POST /:id/execute-with-file`| Multimodal | Upload PNG/JPEG visual file | 200 OK. Base64 sent to LLM vision model. |
| **PM-TC-18** | `POST /:id/execute-with-file`| Multimodal | Upload file exceeding 50MB limit | 400 Bad Request. Multer returns file size error. |
| **PM-TC-19** | `POST /:id/test` | Playground | Test draft prompt | 200 OK. Runs completion successfully (ignores active check). |
| **PM-TC-20** | `POST /:id/rollback` | Versioning | Rollback template to version 1 | 200 OK. Template reverted, version counter incremented. |
| **PM-TC-21** | `DELETE /:id` | CRUD | Delete template | 200 OK. Template, test cases, and history deleted. |
| **PM-TC-22** | `GET /` | Isolation | Tenant B attempts to fetch Tenant A's template | 404 Not Found / Excluded from list. |
| **PM-TC-23** | `POST /:id/test-cases` | Regression | Create test case with variables and expectations | 201 Created. Test case registered. |
| **PM-TC-24** | `POST /test-cases/:testCaseId/run`| Regression | Run test case and log result | 200 OK. Output verified and logged to DB. |

---

## 3. Step-by-Step Test Scenarios

### Scenario A: Creating, Versioning, and Rollback Flow
1. **Create Draft**: Create a template `POST /` with `template: "Hello {{name}}"` and `status: "draft"`. Check that version is set to 1.
2. **Update Content**: Send a `PUT /:id` modifying the template to `"Welcome {{name}}"`. Verify the version increments to 2.
3. **Verify Version History**: Fetch version history `GET /:id/versions`. Check that version 1 is listed.
4. **Trigger Rollback**: Send a `POST /:id/rollback` with `{ version: 1 }`. Verify that the current active template reverts to `"Hello {{name}}"`.

### Scenario B: Streaming and Request Cancellation Flow
1. **Initiate SSE Stream**: Send a `POST /:id/execute` with `{ stream: true }`. Read the first chunk to extract `clientRequestId`.
2. **Execute Cancellation**: While the stream is active, send a `POST /:id/cancel` with `{ request_id: "<id>" }` using a different HTTP client connection.
3. **Confirm Cancelled State**: Ensure the connection is closed and the `AbortController` stops further billing consumption.

### Scenario C: Multimodal File Extraction Flow
1. **Configure Prompt**: Create a template with content `"Summarize: {{file_content}}"`.
2. **Upload Text File**: Upload a `.txt` file using the multipart endpoint `POST /:id/execute-with-file`.
3. **Verify Injection**: Check the execution logs to confirm the text content was extracted and replaced `{{file_content}}`.
