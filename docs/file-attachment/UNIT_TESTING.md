# File Attachment Service - Unit Testing Document

---

## 1. Unit Testing Strategy
Unit tests validate the core logic of the File Attachment module in isolation, mocking all external dependencies (such as PostgreSQL transactions, Redis caching instances, and Azure Storage Clients).

Key components tested in isolation include:
1.  **Checksum Calculator**: Validating that identical buffers produce matching SHA-256 signatures, and verifying character formatting.
2.  **File Size Formatter**: Confirming conversion metrics across bytes, kilobytes (KB), megabytes (MB), and gigabytes (GB).
3.  **Local Storage Path Generator**: Confirming that tenant directories are correctly structured.
4.  **Quota Constraints Validator**: Testing extension blocklist filters and remaining storage calculations under mock conditions.

---

## 2. Validation & Key Components Test Suite

### 2.1 File Size Formatter (`_formatFileSize`)
*   **Target**: Converts raw byte integers into human-readable size labels.
*   **Test Cases**:
    *   *Case 1*: Input `0` returns `"0 Bytes"`.
    *   *Case 2*: Input `1024` returns `"1.00 KB"`.
    *   *Case 3*: Input `1048576` returns `"1.00 MB"`.
    *   *Case 4*: Input `1073741824` returns `"1.00 GB"`.

### 2.2 Checksum Signature Utility (`_calculateChecksum`)
*   **Target**: Computes the SHA-256 hash value of a binary file.
*   **Test Cases**:
    *   *Case 1*: Verifies that a plain text buffer returns a 64-character hexadecimal string.
    *   *Case 2*: Confirms that identical file buffers return the exact same hash.
    *   *Case 3*: Verifies that changing a single character in the buffer alters the generated checksum value.

### 2.3 Upload Guardrail Validator
*   **Target**: Enforces extension blocklists and storage boundaries.
*   **Test Cases**:
    *   *Case 1*: Rejects files with executable extensions (e.g., `.exe`, `.bat`).
    *   *Case 2*: Permits standard extensions (e.g., `.pdf`, `.docx`, `.png`).
    *   *Case 3*: Rejects file uploads if the size exceeds the remaining tenant storage capacity.

---

## 3. Mocking & Execution Details

To run unit tests without database or cloud storage dependencies, mock the following services:
1.  **Database Connection Pool**: Mock `pg.Pool` to return stubbed database query outputs.
2.  **Redis Client**: Mock Redis `get`, `set`, and `del` methods.
3.  **Azure Blob Service**: Stub container client methods (such as upload, delete, and URL generator).

### Example Jest Unit Test Suite

```javascript
const { FileAttachmentService } = require('../../src/services/file-attachment.service');
const crypto = require('crypto');

describe('File Attachment Unit Tests', () => {
  let service;
  let mockPool;

  beforeEach(() => {
    mockPool = {
      connect: jest.fn(),
      query: jest.fn()
    };
    service = new FileAttachmentService(mockPool);
  });

  describe('File Size Formatter Utility', () => {
    it('should format bytes to human-readable strings correctly', () => {
      expect(service._formatFileSize(0)).toBe('0 Bytes');
      expect(service._formatFileSize(512)).toBe('512 Bytes');
      expect(service._formatFileSize(1024)).toBe('1 KB');
      expect(service._formatFileSize(1546188)).toBe('1.47 MB');
      expect(service._formatFileSize(10737418240)).toBe('10 GB');
    });
  });

  describe('Checksum Signature Calculation', () => {
    it('should calculate matching SHA-256 hashes for identical files', () => {
      const buffer = Buffer.from('QAssure Compliance Protocol');
      const hash1 = service._calculateChecksum(buffer);
      const hash2 = service._calculateChecksum(buffer);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should generate distinct hashes for different file contents', () => {
      const hashA = service._calculateChecksum(Buffer.from('File A Content'));
      const hashB = service._calculateChecksum(Buffer.from('File B Content'));

      expect(hashA).not.toBe(hashB);
    });
  });
});
```
