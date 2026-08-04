# Knowledge Service (RAG) - Design Document
**Tenant-Isolated Multi-Index Vector Retrieval & Hybrid RAG System**

---

## 1. Overview & Architecture
The Knowledge Base / Retrieval-Augmented Generation (RAG) module in QAssure provides secure, high-performance, and tenant-isolated information retrieval. It indexes structured and unstructured documentation and uses generative AI to answer user queries with verifiable citations.

Key compliance and design guidelines addressed in this service include:
*   **Defense-in-Depth Multi-Tenancy**: Scopes all relational rows with `tenant_id` and partitions all vector embeddings via Pinecone namespaces (`{tenantId}_{collectionId}`).
*   **Dynamic Dimension Alignment**: Automatically routes embeddings to appropriate serverless indexes matching their dimensions (e.g., 1536 for OpenAI, 768 for Gemini) rather than forcing down-sampling.
*   **Hybrid Search Fusion**: Combines dense vector retrieval with sparse keyword-based BM25 scoring using Reciprocal Rank Fusion (RRF) to ensure high keyword accuracy (e.g., for system codes like CAPA or SOP-998) alongside semantic meaning.
*   **Verifiable RAG Grounding**: Generates answers using a primary LLM (Mistral 7B) and cross-evaluates grounding confidence using a secondary evaluator LLM (Qwen 7B) to output a score from 0.0 to 1.0.

---

## 2. Architecture & Data Flow

The diagram below outlines the system interaction during the ingestion and retrieval phases.

```mermaid
sequenceDiagram
    autonumber
    actor User as Frontend User / Client
    participant Controller as Knowledge Controller
    participant Service as Knowledge Service
    participant DocProc as Document Processor
    participant VectorStore as Vector Store Service
    participant Gateway as AI Gateway Service
    database DB as PostgreSQL Database

    rect rgb(240, 248, 255)
        Note over User, DB: Ingestion Phase (Async)
        User->>Controller: POST /api/v1/ai/knowledge/documents (File buffer)
        Controller->>Service: ingestDocument(collectionId, file, context)
        Service->>DB: Save document metadata (status = 'processing')
        Service-->>Controller: Return receipt
        Controller-->>User: 202 Accepted (Queued)
        Note over Service: Asynchronous execution starts
        Service->>DocProc: Extract text (Standard or Multimodal Mode)
        DocProc-->>Service: Clean raw text content
        Service->>Service: Chunk text into paragraphs
        Service->>Gateway: Create embeddings in batches of 100
        Gateway-->>Service: Vector arrays
        Service->>VectorStore: Upsert vectors to Namespace {tenantId}_{collectionId}
        VectorStore-->>Service: Success index routing details
        Service->>DB: Set document status = 'completed', update stats
    end

    rect rgb(255, 240, 245)
        Note over User, DB: Retrieval Phase (RAG Query)
        User->>Controller: POST /api/v1/ai/knowledge/rag-answer { query, collectionId }
        Controller->>Service: ragAnswer(query, context)
        Service->>Service: Hybrid retrieve (Dense Candidates + BM25 Rerank + RRF)
        Service->>Gateway: mistral:7b generate answer from context
        Gateway-->>Service: Text Answer
        Service->>Gateway: qwen:7b score answer grounding
        Gateway-->>Service: Confidence Score (0.0 - 1.0)
        Service->>DB: Save entry to `knowledge_search_history`
        Service-->>Controller: Return { answer, confidence, sources }
        Controller-->>User: 200 OK Response
    end
```

---

## 3. Database Schema Mapping
The Sequelize models for the Knowledge Service establish relationships between tenants, collections, documents, and search history.

| Table Name | Model Name | Fields | Description |
| :--- | :--- | :--- | :--- |
| `knowledge_collections` | `KnowledgeCollection` | `id` (UUID, PK), `tenant_id` (UUID), `name` (String), `description` (Text), `document_count` (Int), `chunk_count` (Int), `status` (String), `embedding_model` (String), `embedding_dimension` (Int), `embedding_provider` (String), `processing_mode` (String), `created_by` (UUID), `created_at` (Date), `updated_at` (Date) | Tracks vector collections, dimensions, models, and processing configurations. |
| `knowledge_documents` | `KnowledgeDocument` | `id` (UUID, PK), `collection_id` (UUID), `tenant_id` (UUID), `file_name` (String), `mime_type` (String), `file_size` (Int), `word_count` (Int), `chunk_count` (Int), `status` (String), `error_message` (Text), `metadata` (JSONB), `created_by` (UUID), `processed_at` (Date), `created_at` (Date), `updated_at` (Date) | Tracks document ingestion states, processing logs, and extraction metrics. |
| `knowledge_search_history` | `KnowledgeSearchHistory` | `id` (UUID, PK), `tenant_id` (UUID), `user_id` (UUID), `query` (Text), `collection_id` (UUID), `document_ids` (JSONB), `results` (JSONB), `context` (Text), `metadata` (JSONB), `search_type` (String), `created_at` (Date), `updated_at` (Date) | Audit trails of search operations, RAG contexts, and LLM metadata logs. |

---

## 4. Vector Database Design & Partitioning
To ensure scalability and security across tenants:
1.  **Index Provisioning**: Pinecone indexes are lazily instantiated matching the vector dimension, using the template `{indexBaseName}-{dimension}`. If a matching dimension index exists (e.g. `qassure-knowledge-1536`), it is reused.
2.  **Namespace Partitioning**: Strict logical separation is enforced by scoping operations within the `{tenant_id}_{collection_id}` namespace. Multi-tenant searches do not leak cross-tenant boundaries because queries specify the client's current namespace context.
3.  **Metadata Payloads**: Chunks store the raw paragraph content under the `content` metadata key (limited to 3,600 characters to prevent Pinecone's 40KB metadata limit overflow) alongside reference document IDs and file names.
