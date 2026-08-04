# Knowledge Service (RAG) - Testing & Test Case Document

---

## 1. Test Strategy Overview
The Knowledge Base and RAG endpoints must be validated for multi-tenant isolation, format extraction, hybrid retrieval accuracy, and RAG answer quality. The main testing areas include:
1.  **Logical Multi-Tenancy Validation**: Verifying that Tenant A cannot query, list, or modify collections or documents belonging to Tenant B.
2.  **File Parsing Verification**: Testing extraction on PDF, DOCX, and XLSX sheets.
3.  **RAG Pipelines**: Evaluating answers and confidence scores under summary and specific query intents.

---

## 2. Comprehensive Test Case Matrix

| ID | API Endpoint | Feature / Scope | Target Case Description | Input Data | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RAG-TC-01** | `POST /collections` | Collections | Create Collection with default parameters | `name`, `processingMode="text"` | Collection record created (201 Created), dimension resolved. |
| **RAG-TC-02** | `POST /collections` | Collections | Create Collection with invalid processing mode | `name`, `processingMode="audio"` | Returns 400 Bad Request. |
| **RAG-TC-03** | `GET /collections` | Collections | List all collections for a tenant | Paginated query (page=1, limit=10) | Returns 200 OK with list of collections and total counts. |
| **RAG-TC-04** | `GET /collections/:id` | Collections | Retrieve metadata for an existing collection | Collection UUID | Returns 200 OK with collection details. |
| **RAG-TC-05** | `GET /collections/:id` | Collections | Retrieve non-existent collection | Random UUID | Returns 404 Not Found. |
| **RAG-TC-06** | `PUT /collections/:id` | Collections | Update name and metadata properties | Collection UUID, updated JSON payload | Returns 200 OK with updated attributes. |
| **RAG-TC-07** | `DELETE /collections/:id` | Collections | Delete collection and clear vector namespace | Collection UUID | Returns 200 OK. Vectors deleted from Pinecone. |
| **RAG-TC-08** | `GET /collections/:collectionId/documents` | Collections | List all documents inside a collection | Collection UUID | Returns 200 OK with lists of files. |
| **RAG-TC-09** | `POST /documents` | Documents | Upload valid PDF document to Collection | `collectionId`, PDF file attachment | Returns 202 Accepted, queues background processing. |
| **RAG-TC-10** | `POST /documents` | Documents | Ingest unsupported file format | `collectionId`, `.mp3` file attachment | Upload blocked by route filter (400 Bad Request). |
| **RAG-TC-11** | `POST /documents` | Documents | Ingest file exceeding 50MB limit | Large mock file | Multer throws size limit error (400 Bad Request). |
| **RAG-TC-12** | `GET /documents/:id/status` | Documents | Query status of an ingestion job | Document UUID | Returns 200 OK with `completed`, `processing`, or `failed`. |
| **RAG-TC-13** | `DELETE /documents/:id` | Documents | Delete specific document and clean vectors | Document UUID | Returns 200 OK. Associated vectors deleted. |
| **RAG-TC-14** | `POST /search` | Search | Semantic search with minScore threshold | `query`, `collectionId`, `minScore=0.7` | Returns matches scoring $\ge 0.7$. |
| **RAG-TC-15** | `POST /search` | Search | Cross-collection global query | `query`, `collectionId=null` | Queries all tenant indexes and merges matches. |
| **RAG-TC-16** | `POST /search` | Search | Search within a single document | `query`, `documentIds=["uuid"]` | Restricts results to chunks of specified document. |
| **RAG-TC-17** | `POST /search/context` | Search | Search and compile matching context block | `query`, `collectionId` | Returns 200 OK with concatenated string block. |
| **RAG-TC-18** | `POST /rag-answer` | Search / RAG | Run RAG query returning grounded answer | `query`, `collectionId` | Returns generated answer, sources, and confidence score. |
| **RAG-TC-19** | `POST /rag-answer` | Search / RAG | Summarization intent detection | `query="summarise manual"` | Bypasses threshold floor and returns up to 50 chunks. |
| **RAG-TC-20** | `POST /rag-answer` | Search / RAG | RAG query with conversation history | `query`, history array | Integrates previous turns to resolve query context. |
| **RAG-TC-21** | `GET /search/history` | Search | List search and RAG histories | Page & limit queries | Returns 200 OK with query logs list. |
| **RAG-TC-22** | `GET /search/history/:id` | Search | Retrieve detailed search history entry | History UUID | Returns 200 OK with contexts and model info. |
| **RAG-TC-23** | `GET /stats` | Stats | Get active vector database stats | None | Returns 200 OK with index and namespace records. |
| **RAG-TC-24** | *Cross-Cutting* | Security | Access any endpoint without JWT token | None | Returns 401 Unauthorized. |
| **RAG-TC-25** | *Cross-Cutting* | Isolation | Query Tenant B collection using Tenant A token | Tenant A token, Tenant B collection ID | Returns 404 Not Found or Access Denied. |

---

## 3. Step-by-Step Test Scenarios

### Scenario A: Ingesting & Querying Standard Document
1.  **Create Collection**:
    -   Call `POST /api/v1/ai/knowledge/collections` with body:
        ```json
        { "name": "Quality Guide", "processingMode": "text" }
        ```
    -   *Verification*: Status is `201 Created`, collection ID is returned.
2.  **Upload File**:
    -   Call `POST /api/v1/ai/knowledge/documents` with form-data `collectionId` and attach a file (e.g. `guide.pdf`).
    -   *Verification*: Status is `202 Accepted`, status returns `"processing"`.
3.  **Poll Ingestion State**:
    -   Call `GET /api/v1/ai/knowledge/documents/:id/status`.
    -   *Verification*: Poll every 2 seconds until status changes to `"completed"`.
4.  **Execute RAG Query**:
    -   Call `POST /api/v1/ai/knowledge/rag-answer` with payload:
        ```json
        { "query": "What are the rules?", "collectionId": "<collectionId>" }
        ```
    -   *Verification*: Status is `200 OK`. The response should contain an answer, matching source snippets, and a confidence score between 0.0 and 1.0.

### Scenario B: Multi-Tenant Vector Boundaries Test
1.  **Ingestion (Tenant A)**:
    -   Upload a document containing `"TenantAUniqueSecretPhrase"` using Tenant A's authorization token.
2.  **Search Attempt (Tenant B)**:
    -   Perform a search query for `"TenantAUniqueSecretPhrase"` using Tenant B's authorization token and headers.
3.  **Verification**:
    -   Ensure the search query returns `200 OK` with an empty data array `[]`. This verifies vector-level isolation between namespace prefixes.
