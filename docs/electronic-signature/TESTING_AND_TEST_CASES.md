# Electronic Signature Service - Testing & Test Case Document

---

## 1. Test Strategy Overview
The electronic signature module must be tested rigorously for security constraints, input validations, error behavior, and database integrity. The key test scopes are:
1.  **Credential Authentication Challenges**: Verifying password/PIN mismatch handling.
2.  **State Mismatch Audits**: Validating that modifying signature hashes fails verification checks.
3.  **Role Gating**: Restricting `/statistics` to `audit_logs:read` and `/invalidate` to `super_admin`.

---

## 2. Test Case Matrix

| ID | Module / Feature | Target Case Description | Input Data | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **ES-TC-01** | Credentials | Setup or update user PIN | Password, PIN (e.g. `1234`) | PIN set successfully (200 OK) |
| **ES-TC-02** | Credentials | Update PIN with invalid password | Bad Password, PIN | Credentials fail (400 Bad Request) |
| **ES-TC-03** | Signing | Sign resource with valid Pass & PIN | valid credentials, resource context | Signature created & SHA-256 logged |
| **ES-TC-04** | Signing | Sign resource with incorrect PIN | Correct password, incorrect PIN | Blocked signature creation (400 Bad Request) |
| **ES-TC-05** | Verification | Verify pristine signature record | valid `signature_id` | Returns `tampered: false` |
| **ES-TC-06** | Invalidation | Invalidate signature as Super Admin | valid `signature_id`, justification reason | Invalidation success (200 OK), flags `is_valid=false` |
| **ES-TC-07** | Invalidation | Invalidate signature as Regular User | valid `signature_id`, justification reason | Access Forbidden (403 Forbidden) |
| **ES-TC-08** | Statistics | Access statistics as Audit Role | valid date range parameters | Returns total, signers, action distribution |
| **ES-TC-09** | Statistics | Access statistics without Audit Role | valid date range parameters | Access Forbidden (403 Forbidden) |

---

## 3. Step-by-Step Test Scenarios

### Scenario A: Configuring PIN and Authenticating First Signature
1.  **Action**: Call `POST /api/v1/electronic-signatures/pin` with valid current password and a new PIN `"4321"`.
    *   *Check*: Status code must be `200 OK`.
2.  **Action**: Call `POST /api/v1/electronic-signatures/sign` to sign resource `document:doc-101` with action `"APPROVE"`, valid password, and PIN `"4321"`.
    *   *Check*: Status code is `201 Created` with a new signature object and a hash signature string returned.
3.  **Action**: Attempt to sign again with PIN `"9999"`.
    *   *Check*: Verify the response status is `400 Bad Request` with an authentication failed message details block.
