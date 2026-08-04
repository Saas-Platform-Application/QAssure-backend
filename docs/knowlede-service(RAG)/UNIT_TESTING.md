# Knowledge Service (RAG) - Unit Testing Document

---

## 1. Unit Testing Strategy
Unit tests focus on validating components in isolation:
1.  **File Extractors**: Verifying that document parsing utilities correctly process buffers and return plain text.
2.  **Paragraph Chunker**: Validating paragraph chunk splitting, character boundaries, and spacing.
3.  **Hybrid RRF Calculations**: Testing the Reciprocal Rank Fusion ranking function with mock dense and BM25 search outputs.
4.  **Multi-Index Selection**: Verifying that `vector-store.service.js` selects the correct index based on vector dimensions.

---

## 2. Validation & Key Components Test Suite

### 2.1 Paragraph Chunker Service (`chunker.service.js`)
*   **Target**: Split raw text blocks into paragraph segments.
*   **Test Cases**:
    *   *Case 1*: Split text separated by double newlines (`\n\n`) into distinct paragraphs.
    *   *Case 2*: Re-join single newlines to keep consecutive text lines together.
    *   *Case 3*: Handle long continuous strings by splitting at sentence endings near boundary limits.

### 2.2 Dynamic Dimension Resolver (`vector-store.service.js`)
*   **Target**: Resolve Pinecone index name based on dimension.
*   **Test Cases**:
    *   *Case 1*: Input dimension `1536` returns index name suffix `-1536`.
    *   *Case 2*: Input dimension `768` returns index name suffix `-768`.
    *   *Case 3*: Omitted dimension parameter falls back to legacy default index.

---

## 3. Mocking & Execution Details
To execute unit tests in isolation without connecting to external AI providers or vector databases:
1.  **AI Gateway Mock**: Mock `createCompletion` to return pre-defined responses.
2.  **Vector Store Mock**: Stub Pinecone connection client calls to simulate queries and upserts.
3.  **Document Processor Mock**: Use mock buffers to bypass filesystem dependencies.

```javascript
// Example Jest Unit Test for Chunker & Dimension Resolution
const { ChunkerService } = require('../../src/infrastructure/ai/chunker.service');
const { VectorStoreService } = require('../../src/infrastructure/ai/vector-store.service');

describe('Knowledge Infrastructure Unit Tests', () => {
  let chunker;

  beforeEach(() => {
    chunker = new ChunkerService();
  });

  it('should split text by paragraphs correctly', () => {
    const text = 'Paragraph 1 content.\n\nParagraph 2 content.';
    const chunks = chunker.chunkByParagraphs(text, { chunkSize: 512 });
    expect(chunks.length).toBe(2);
    expect(chunks[0].content).toBe('Paragraph 1 content.');
  });
});

describe('Vector Store Dynamic Index Naming', () => {
  let store;

  beforeEach(() => {
    store = new VectorStoreService();
  });

  it('should resolve index suffix based on embedding dimension', () => {
    const name1536 = store._getIndexNameForDimension(1536);
    expect(name1536).toBe('qassure-knowledge-1536');

    const name768 = store._getIndexNameForDimension(768);
    expect(name768).toBe('qassure-knowledge-768');
  });
});
```
