# Knowledge Service (RAG) - Functional & Module-Level Documentation

---

## 1. Functional Scope & Goals
The Knowledge Service serves as the platform's intelligent reference retrieval system. It indexes unstructured corporate files (SOPs, CAPA records, checklists) and generates answers to user questions, reducing compliance search time and ensuring answers are strictly grounded in verified documentation.

---

## 2. Key Modules & Features

### 2.1 Multi-Tenant Ingestion Modes
During document upload, users designate the collection and the processing mode:
-   **Standard Text Ingestion (`text` Mode)**:
    -   Processes text files, markdown, JSON, PDF (raw text), and Word documents.
    -   Excel files (`.xlsx`, `.xls`) are parsed using `exceljs` and structured as CSV text representations to preserve table row-and-column alignments.
-   **Multimodal Ingestion (`multimodal` Mode)**:
    -   Mainly targets complex visual documents or diagram-heavy PDFs.
    -   Rasterizes PDF pages to PNGs via `pdf2pic` at 200 DPI.
    -   Detects table, text, and graphic boundaries using a YOLO client.
    -   Feeds images and crop-metadata into a LLaVA vision model to transcribe pages and describe charts.
    -   Falls back to standard text extraction if multimodal model servers are offline or unconfigured.

### 2.2 Paragraph Chunking & Batch Embeddings
-   To maintain context, text is chunked into logical units based on paragraph structure, with a target size of 512 characters.
-   To avoid rate limits and save network round-trips, embeddings are generated in batches of 100 before upserting them to the vector store.

### 2.3 Hybrid Retrieval Fusion (Dense + Sparse)
Dense embeddings alone can miss exact nomenclature (e.g. system IDs like "PR-2026", product codes like "INS-4", or compliance tags).
-   The system runs standard semantic vector similarity search to pull 30 dense candidates.
-   It tokenizes candidate snippets and scores them using the BM25 algorithm for query term frequency.
-   Ranks are combined using Reciprocal Rank Fusion (RRF, with constant $k=60$).
-   The top-K results are returned as context.

### 2.4 History-Aware RAG Conversation
-   **History Prepending**: If prior messages exist, user prompts in the conversation history are concatenated with the current query to resolve coreferences (e.g. "What is insulin?" followed by "How to ship it?" is enhanced to include context from the previous turn).
-   **Intent Classification**: Detects summarization intentions (e.g., "summarise this doc", "overview of cold chain") using keyword patterns. If matched, it bypasses the similarity floor (`minScore=0`) and fetches a broad set of up to 50 chunks.
-   **Grounding Assessment**: Compiles context sources, invokes Mistral 7B to generate the response, and uses Qwen 7B to evaluate the response against the sources, returning a confidence score.

---

## 3. Workflow States & Rules

```
                      [Document Ingested]
                               │
                               ▼
                    [State: 'processing']
                               │
                ┌──────────────┴──────────────┐
       [Multimodal Mode]               [Text Mode]
                │                             │
       (YOLO & LLaVA Ingestion)        (Standard Extractors)
                └──────────────┬──────────────┘
                               │
                               ▼
                       [Chunk & Embed]
                               │
                               ▼
                     [State: 'completed']
                 (Increments Collection Count)
```

### 3.1 Integrity and Verification Rules
-   **Strict Deletions**: Deleting a document calls `vectorStore.delete` to remove its chunks from Pinecone before deleting the SQL database records.
-   **Collection Deletions**: Deleting a collection deletes its search logs, SQL document references, and executes `deleteAll` to remove all vectors in the collection's Pinecone namespace.
