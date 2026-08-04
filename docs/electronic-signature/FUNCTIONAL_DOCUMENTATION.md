# Electronic Signature Service - Functional & Module-Level Documentation

---

## 1. Functional Scope
The Electronic Signature module provides identity validation functionality to assure that compliance actions (approvals, reviews, releases, and withdrawals) are digitally authenticated. This replaces handwritten signatures on paper, aligning with digital document management initiatives.

---

## 2. Key Modules & Features

### 2.1 Double-Factor Identity Verification
All actions classified as "Signing" require:
*   **Primary Factor**: Account password associated with the authenticated session context.
*   **Secondary Factor**: Set numeric PIN (4 to 6 digits) unique to the user's signature profile.
*   The API automatically challenges both credentials against the database on each signing operation to prevent unauthorized actions via active sessions.

### 2.2 Signature Meanings (FDA 21 CFR Part 11)
A signature is invalid without an associated reason context. Users must supply a "meaning" text descriptor during signing. Standardized actions include:
*   `APPROVE` / `REJECT`: Accept or reject changes.
*   `REVIEW`: Verify contents without marking final decision.
*   `AUTHOR`: Document creator authentication.
*   `VERIFY`: Verify metadata correctness.
*   `RELEASE`: Authorized release of the target item.
*   `ACKNOWLEDGE`: Acknowledge viewing/receipt.
*   `WITHDRAW`: Withdraw approval or record.

---

## 3. Workflow States & Rules
```
                [Sign request initiated]
                         │
                         ▼
             [Verify Pass & PIN match?]
               /                  \
             No                    Yes
             /                      \
      [Reject 400 Bad]         [Compute SHA-256]
                                     │
                                     ▼
                            [Save Signature Record]
                            (is_valid: true)
                                     │
                                     ▼
                        [Check Workflow Criteria]
```

### 3.1 Non-Repudiation & Audit Policy
*   **No Deletes**: The API does not expose any `DELETE` endpoint for signature records.
*   **Invalidations**: If a document is discovered to have structural inaccuracies, a Super Admin can call `POST /:id/invalidate`. This flags `is_valid = false` and writes an explanatory record reasons block to the audit log trail, keeping the original signature record intact.
*   **Search & Visibility Filtering**:
    *   Regular users can retrieve only their personal signatures on the UI.
    *   Compliance personnel and administrators with the `audit_logs:read` permission can view organization-wide signature activity, date range queries, and breakdown distributions.
