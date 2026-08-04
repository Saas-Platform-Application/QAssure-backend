# Knowledge Service (RAG) - Codebase & API Documentation

This document provides a detailed mapping of the codebase structure and exhaustive technical documentation for all **15 API endpoints** of the QAssure Knowledge (RAG) Service.

---

## 1. Codebase Layout & File Mapping

### 1.1 Routing Layer
*   **Path**: [knowledge.routes.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/routes/knowledge.routes.js)
    *   *Purpose*: Configures Express routes.
    *   *Middlewares*:
        *   `authenticate`: Verifies the bearer JWT token and populates `req.user`.
        *   `tenantContext`: extracts and maps the header `x-tenant-id` to the context to enforce database security boundaries.
        *   `upload`: A Multer middleware configured for in-memory file streaming. It strictly enforces a **50MB maximum file size limit** and filters file uploads by MIME type, accepting only PDF, Word (`.docx`, `.doc`), Excel (`.xlsx`, `.xls`), JSON, Markdown, and plain text.
        *   `authorize(<permission>)`: Gates request execution based on granular user authorization claims.

### 1.2 Controller Layer
*   **Path**: [knowledge.controller.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/controllers/knowledge.controller.js)
    *   *Purpose*: Maps network input payload variables to the service controller, performs structural inputs validation (e.g. validating required fields, enum boundaries), and handles error response structures.

### 1.3 Service Layer
*   **Path**: [knowledge.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/knowledge.service.js)
    *   *Purpose*: Coordinates business logic execution, database operations, paragraph segment chunking, dynamic index creation, vector generation requests, BM25 scoring, and RAG compilation.

### 1.4 Database Models
*   **Paths**:
    *   [knowledge_collection.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/sequelize-models/knowledge_collection.js): Represents the collection metadata and config database table.
    *   [knowledge_document.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/sequelize-models/knowledge_document.js): Represents the ingested documents database table.
    *   [knowledge_search_history.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/sequelize-models/knowledge_search_history.js): Represents the query and completion log database table.

---

## 2. Global Headers & Security Context
Every endpoint requires the following headers:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
x-tenant-id: <TENANT_UUID>
Content-Type: application/json (unless uploading files)
```

---

## 3. Exhaustive API Reference

### 3.1 Collections Management

#### 3.1.1 Create Collection
*   **Endpoint**: `POST /api/v1/ai/knowledge/collections`
*   **Permission Required**: `ai:create`
*   **Description**: Creates a logical document collection. Resolves embedding configs dynamically and setups routing coordinates.
*   **Request Body**:
    ```json
    {
      "name": "pharma-sop-collection",
      "description": "Standard Operating Procedures for cold-chain shipping.",
      "processingMode": "text",
      "provider": "openai",
      "embeddingModel": "text-embedding-3-small",
      "metadata": {
        "department": "Quality Assurance"
      }
    }
    ```
    *   `name` (String, Required): Name of the collection.
    *   `processingMode` (String, Optional): Ingestion pipeline. Must be `text` or `multimodal`. Defaults to `text`.
    *   `provider` (String, Optional): Embedding provider name (e.g., `openai`, `gemini`).
    *   `embeddingModel` (String, Optional): Model name mapping.
*   **Responses**:
    *   **201 Created**:
        ```json
        {
          "success": true,
          "data": {
            "id": "2c90c7e2-45bb-4cf4-94c6-2c5e5db215c0",
            "name": "pharma-sop-collection",
            "description": "Standard Operating Procedures for cold-chain shipping.",
            "document_count": 0,
            "chunk_count": 0,
            "status": "active",
            "embedding_model": "text-embedding-3-small",
            "embedding_dimension": 1536,
            "embedding_provider": "openai",
            "processing_mode": "text",
            "created_by": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            "metadata": { "department": "Quality Assurance" },
            "created_at": "2026-06-18T09:00:00.000Z",
            "updated_at": "2026-06-18T09:00:00.000Z"
          }
        }
        ```
    *   **400 Bad Request**: (If name is missing or processingMode is invalid)
        ```json
        {
          "success": false,
          "error": { "code": "INVALID_INPUT", "message": "Collection name is required" }
        }
        ```

#### 3.1.2 List Collections
*   **Endpoint**: `GET /api/v1/ai/knowledge/collections`
*   **Permission Required**: `ai:read`
*   **Description**: Retrieves a paginated list of active collections scoped to the user's tenant.
*   **Query Parameters**:
    *   `page` (Integer, Optional): Page number. Defaults to `1`.
    *   `limit` (Integer, Optional): Number of records per page. Defaults to `20`.
    *   `status` (String, Optional): Filter by status (e.g., `active`).
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "collections": [
            {
              "id": "2c90c7e2-45bb-4cf4-94c6-2c5e5db215c0",
              "name": "pharma-sop-collection",
              "status": "active",
              "document_count": 2,
              "chunk_count": 14
            }
          ],
          "total": 1,
          "page": 1,
          "pages": 1
        }
        ```

#### 3.1.3 Get Collection by ID
*   **Endpoint**: `GET /api/v1/ai/knowledge/collections/:id`
*   **Permission Required**: `ai:read`
*   **Description**: Fetches a single collection's metadata and statistics.
*   **URL Parameters**:
    *   `id` (UUID, Required): ID of the collection.
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": {
            "id": "2c90c7e2-45bb-4cf4-94c6-2c5e5db215c0",
            "name": "pharma-sop-collection",
            "status": "active"
          }
        }
        ```
    *   **404 Not Found**:
        ```json
        {
          "success": false,
          "error": { "code": "NOT_FOUND", "message": "Collection not found" }
        }
        ```

#### 3.1.4 Update Collection
*   **Endpoint**: `PUT /api/v1/ai/knowledge/collections/:id`
*   **Permission Required**: `ai:update`
*   **Description**: Modifies description, metadata configurations, or name properties of a collection.
*   **URL Parameters**:
    *   `id` (UUID, Required)
*   **Request Body**:
    ```json
    {
      "name": "pharma-sop-collection-v2",
      "description": "Updated cold-chain procedures doc reference.",
      "metadata": { "department": "Logistics" }
    }
    ```
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": {
            "id": "2c90c7e2-45bb-4cf4-94c6-2c5e5db215c0",
            "name": "pharma-sop-collection-v2",
            "description": "Updated cold-chain procedures doc reference."
          }
        }
        ```

#### 3.1.5 Delete Collection
*   **Endpoint**: `DELETE /api/v1/ai/knowledge/collections/:id`
*   **Permission Required**: `ai:delete`
*   **Description**: Deletes a collection, its ingested document relations, search logs, and clears all corresponding vector indices in the Pinecone namespace.
*   **URL Parameters**:
    *   `id` (UUID, Required)
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "message": "Collection deleted"
        }
        ```

#### 3.1.6 List Documents in Collection
*   **Endpoint**: `GET /api/v1/ai/knowledge/collections/:collectionId/documents`
*   **Permission Required**: `ai:read`
*   **Description**: Lists all files that have been uploaded or processed in a specific collection.
*   **URL Parameters**:
    *   `collectionId` (UUID, Required)
*   **Query Parameters**:
    *   `page` (Integer, Optional): Defaults to `1`.
    *   `limit` (Integer, Optional): Defaults to `20`.
    *   `status` (String, Optional): Filter by `completed`, `processing`, or `failed`.
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "documents": [
            {
              "id": "f8d97c39-301a-4d7a-8f5b-9b48f5e71bc2",
              "file_name": "SOP-102_ColdChain.pdf",
              "mime_type": "application/pdf",
              "file_size": 204850,
              "status": "completed",
              "word_count": 1205,
              "chunk_count": 8
            }
          ],
          "total": 1,
          "page": 1,
          "pages": 1
        }
        ```

---

### 3.2 Documents Management

#### 3.2.1 Ingest / Upload Document
*   **Endpoint**: `POST /api/v1/ai/knowledge/documents`
*   **Permission Required**: `ai:create`
*   **Headers**: Content-Type must be `multipart/form-data`
*   **Form-Data parameters**:
    *   `collectionId` (UUID, Required): ID of the destination collection.
    *   `file` (Binary File Upload, Required): The document. Size limit is **50MB**. Permitted types: PDF, DOCX, DOC, TXT, MD, JSON.
    *   `provider` (String, Optional): Force embedding provider context.
*   **Responses**:
    *   **202 Accepted**:
        ```json
        {
          "success": true,
          "data": {
            "id": "f8d97c39-301a-4d7a-8f5b-9b48f5e71bc2",
            "fileName": "SOP-102_ColdChain.pdf",
            "status": "processing",
            "message": "Document queued for processing"
          }
        }
        ```
    *   **400 Bad Request**: (If collectionId is missing, file is missing, or file type is not supported)
        ```json
        {
          "success": false,
          "error": { "code": "INVALID_INPUT", "message": "collectionId is required" }
        }
        ```

#### 3.2.2 Get Document Status
*   **Endpoint**: `GET /api/v1/ai/knowledge/documents/:id/status`
*   **Permission Required**: `ai:read`
*   **Description**: Retrieves processing state and statistics of an ingestion job.
*   **URL Parameters**:
    *   `id` (UUID, Required): Document ID.
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": {
            "id": "f8d97c39-301a-4d7a-8f5b-9b48f5e71bc2",
            "file_name": "SOP-102_ColdChain.pdf",
            "mime_type": "application/pdf",
            "status": "completed",
            "word_count": 1205,
            "chunk_count": 8,
            "error_message": null,
            "processed_at": "2026-06-18T09:00:03.000Z"
          }
        }
        ```

#### 3.2.3 Delete Document
*   **Endpoint**: `DELETE /api/v1/ai/knowledge/documents/:id`
*   **Permission Required**: `ai:delete`
*   **Description**: Removes a document's SQL records and deletes all associated text vector chunks from Pinecone.
*   **URL Parameters**:
    *   `id` (UUID, Required)
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "message": "Document deleted"
        }
        ```

---

### 3.3 Search & RAG Operations

#### 3.3.1 Semantic Search
*   **Endpoint**: `POST /api/v1/ai/knowledge/search`
*   **Permission Required**: `ai:read`
*   **Description**: Returns matching text chunks ordered by vector similarity. Supports single collection, specific document, or cross-collection scopes.
*   **Request Body**:
    ```json
    {
      "query": "temperature threshold details",
      "collectionId": "2c90c7e2-45bb-4cf4-94c6-2c5e5db215c0",
      "documentIds": ["f8d97c39-301a-4d7a-8f5b-9b48f5e71bc2"],
      "topK": 3,
      "minScore": 0.3
    }
    ```
    *   `query` (String, Required): Search query.
    *   `collectionId` (UUID, Optional): Search within a specific collection. If omitted, search queries all collections within the tenant.
    *   `documentIds` (Array of UUIDs, Optional): Restrict search to specific documents.
    *   `topK` (Integer, Optional): Number of matches to return. Defaults to `5`.
    *   `minScore` (Float, Optional): Similarity threshold. Defaults to `0.25`.
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": [
            {
              "id": "chunk_f8d97c39_1",
              "score": 0.824,
              "content": "SOP-102: Cold chain storage must not exceed 8°C. Alert triggers immediately.",
              "metadata": {
                "documentId": "f8d97c39-301a-4d7a-8f5b-9b48f5e71bc2",
                "fileName": "SOP-102_ColdChain.pdf"
              }
            }
          ]
        }
        ```

#### 3.3.2 Search with Context
*   **Endpoint**: `POST /api/v1/ai/knowledge/search/context`
*   **Permission Required**: `ai:read`
*   **Description**: Similar to semantic search, but formats and compiles the text content of matching chunks into a single text block.
*   **Request Body**: Same parameters as `POST /search`.
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": {
            "context": "[Source: SOP-102_ColdChain.pdf]\nSOP-102: Cold chain storage must not exceed 8°C.",
            "sources": [
              {
                "id": "chunk_f8d97c39_1",
                "score": 0.824,
                "documentId": "f8d97c39-301a-4d7a-8f5b-9b48f5e71bc2",
                "fileName": "SOP-102_ColdChain.pdf"
              }
            ]
          }
        }
        ```

#### 3.3.3 RAG Answer
*   **Endpoint**: `POST /api/v1/ai/knowledge/rag-answer`
*   **Permission Required**: `ai:read`
*   **Description**: The primary conversational RAG endpoint. Executes a hybrid search, builds context, generates an answer (via Mistral 7B), and scores confidence (via Qwen 7B).
*   **Request Body**:
    ```json
    {
      "query": "temperature threshold",
      "collectionId": "2c90c7e2-45bb-4cf4-94c6-2c5e5db215c0",
      "conversationHistory": [],
      "answerProvider": "Mistral7b",
      "answerModel": "mistral:7b",
      "confidenceProvider": "qwen7b",
      "confidenceModel": "Qwen7B",
      "topK": 5,
      "minScore": 0.2
    }
    ```
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": {
            "answer": "Insulin shipping temperatures must be maintained between 2°C and 8°C.",
            "confidence": 0.92,
            "sources": [
              {
                "chunkId": "f8d97c39-301a-4d7a-8f5b-9b48f5e71bc2_3",
                "score": 0.84,
                "content": "Keep shipment between 2 and 8 deg C.",
                "documentId": "f8d97c39-301a-4d7a-8f5b-9b48f5e71bc2",
                "fileName": "SOP-102_ColdChain.pdf"
              }
            ],
            "metadata": {
              "answerProvider": "Mistral7b",
              "answerModel": "mistral:7b"
            }
          }
        }
        ```

#### 3.3.4 List Search History
*   **Endpoint**: `GET /api/v1/ai/knowledge/search/history`
*   **Permission Required**: `ai:read`
*   **Description**: Retrieves paginated search query logs for the current tenant.
*   **Query Parameters**:
    *   `page` (Integer, Optional): Defaults to `1`.
    *   `limit` (Integer, Optional): Defaults to `20`.
    *   `collectionId` (UUID, Optional)
    *   `documentId` (UUID, Optional)
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "history": [
            {
              "id": "5a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d",
              "query": "temperature threshold",
              "search_type": "context",
              "created_at": "2026-06-18T09:05:00.000Z"
            }
          ],
          "total": 1,
          "page": 1,
          "pages": 1
        }
        ```

#### 3.3.5 Get Search History by ID
*   **Endpoint**: `GET /api/v1/ai/knowledge/search/history/:id`
*   **Permission Required**: `ai:read`
*   **Description**: Retrieves a single logged search event, including the generated answer, context, and metadata.
*   **URL Parameters**:
    *   `id` (UUID, Required)
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": {
            "id": "5a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d",
            "query": "temperature threshold",
            "context": "Context information details...",
            "results": [ ... ],
            "metadata": { "confidence": 0.92 }
          }
        }
        ```

---

### 3.4 Diagnostics & Stats

#### 3.4.1 Get Vector Store Stats
*   **Endpoint**: `GET /api/v1/ai/knowledge/stats`
*   **Permission Required**: `ai:read`
*   **Description**: Returns diagnostics for all Pinecone indexes and namespaces mapped under the current environment configuration.
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": {
            "totalVectors": 1400,
            "namespaces": {
              "tenant-uuid_collection-uuid": {
                "recordCount": 240
              }
            },
            "indexes": [
              {
                "indexName": "qassure-knowledge-1536",
                "dimension": 1536,
                "totalVectors": 1400
              }
            ]
          }
        }
        ```
