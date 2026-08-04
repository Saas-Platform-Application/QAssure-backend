# QAssure Prompt Management Service — Integration Testing Document

---

## 1. Integration Scope

Integration tests validate the prompt management database tables, transactions, document processors, and gateway integration under multi-tenant runtime conditions.

```
                  +--------------------------------+
                  |    Integration Test Runner     |
                  +--------------------------------+
                                  |
                                  v
                  +--------------------------------+
                  |      Express App Router        |
                  +--------------------------------+
                                  |
                                  v
                  +--------------------------------+
                  |       PromptController         |
                  +--------------------------------+
                     /                          \
                    /                            \
                   v                              v
    +------------------------------+     +------------------------------+
    |        PromptService         |     |      ExecutionRegistry       |
    +------------------------------+     +------------------------------+
         /         |            \                       |
        /          |             \                      v
       v           v              v              +--------------+
    +----+ +---------------+ +----------+        |  vLLM/Ollama |
    | DB | | DocProcessor  | | Gateway  | ---->  |   Endpoints  |
    +----+ +---------------+ +----------+        +--------------+
```

---

## 2. Database Constraint & Cascading Integrity

Ensures database constraints function correctly.

- **Cascade Deletion**: When a prompt template is deleted, the database must delete all related versions, test cases, and test results.
- **Trigger Cleanup**: When a module is deleted, PostgreSQL must execute the `clean_deleted_module_from_prompts()` trigger to clean up corresponding elements from the `module_ids` UUID array in `ai_prompt_templates`.
- **Version Uniqueness**: The unique index `idx_ai_prompt_templates_unique_version` must prevent two templates from having the same `(tenant_id, name, version)`.

---

## 3. SSE Connection Handling

Completions run using Server-Sent Events (SSE) when `stream: true` is passed. Tests must verify:

1. **Headers Check**: The connection must write the headers:
   ```
   Content-Type: text/event-stream
   Cache-Control: no-cache
   Connection: keep-alive
   ```
2. **Immediate Request Identification**: The first event dispatched on the stream must be the `clientRequestId` so that the client can request cancellation if needed.
3. **Chunk Delivery**: Content must be written and flushed block-by-block.
4. **Closing Event**: The stream must terminate with `done: true` and a JSON metadata payload summarizing token count and execution cost.

---

## 4. Document Extraction and Rasterization Integration

Validates `document.processor.js` and `prompt.service.js` coordination:

- **Text Mode Integration**:
  - Test uploads of `.docx`, `.xlsx`, or `.txt` templates.
  - Confirm the extraction code parses plain text from the document.
  - Verify that the extracted string replaces `{{file_content}}` in the template before execution.
- **Visual Mode Ingestion**:
  - Test uploads of `.png` or `.pdf` files.
  - Confirm the PDF pages are rasterized and converted to base64 images.
  - Verify that the payload is sent to the Gateway's visual completion method (`createMultimodalCompletion`).

---

## 5. End-to-End Integration Scenarios

### 5.1 Scenario A: Tenant Isolation Verification
1. Register two mock tenants: `tenant-a` and `tenant-b`.
2. As `tenant-a`, create a prompt template `"Summarize Code"`.
3. Try to access `"Summarize Code"` using `tenant-b`'s API token.
4. Verify the response is `404 Not Found`.
5. As `tenant-b`, list templates and verify `"Summarize Code"` is not returned.

### 5.2 Scenario B: Transactional Deletion
1. Create a prompt template.
2. Add a test case and run it to log a test result in the DB.
3. Call `DELETE /api/v1/ai/prompts/:id` as the tenant admin.
4. Query the DB and verify that:
   - The template record is removed from `ai_prompt_templates`.
   - The test case record is removed from `ai_prompt_test_cases`.
   - The test result record is removed from `ai_prompt_test_results`.
   - The version record is removed from `ai_prompt_versions`.

### 5.3 Scenario C: Cascaded Module Cleanup
1. Register a mock module and get its UUID.
2. Create a prompt template referencing this module UUID in `module_ids`.
3. Delete the module record from the `modules` table.
4. Query the prompt template and verify that the module UUID has been removed from the `module_ids` array, while the template remains intact.
