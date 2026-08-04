# Electronic Signature Service - Codebase & API Documentation

---

## 1. Codebase Layout & File Mapping
*   **Routes**: `src/routes/electronic-signature.routes.js`
    *   Registers express router paths, applies JWT authenticate/authorize middlewares, and validation schemas.
*   **Controller**: `src/controllers/electronic-signature.controller.js`
    *   Unpacks request parameters, passes execution context to the service, and format JSON responses.
*   **Service**: `src/services/electronic-signature.service.js`
    *   Performs database reads/writes, calculates digital fingerprints, handles credential password/PIN verification.
*   **Validation Schema**: `src/validation/electronic-signature.schema.js`
    *   Zod validation definitions gating API payloads.

---

## 2. API Endpoint Reference

### 2.1 Sign Resource
*   **Endpoint**: `POST /api/v1/electronic-signatures/sign`
*   **Headers**: `Authorization: Bearer <JWT>`
*   **Request Body**:
    ```json
    {
      "resource_type": "document",
      "resource_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
      "resource_name": "SOP-001 Quality Policy",
      "action": "APPROVE",
      "meaning": "I approve the release and content of this standard operating procedure.",
      "password": "UserSecurePassword123!",
      "pin": "1234",
      "auth_method": "password_pin"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "data": {
        "id": "7f8g9h0i-1j2k-3l4m-5n6o-7p8q9r0s1t2u",
        "signer_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "action": "APPROVE",
        "meaning": "I approve the release and content of this standard operating procedure.",
        "signed_at": "2026-06-17T12:00:00Z",
        "signature_hash": "a89c938b827e466b8d960927c9172828b8a36f6d6c827b5e40e6cbb96cd1829e",
        "is_valid": true
      }
    }
    ```

### 2.2 Verify Signature Integrity
*   **Endpoint**: `POST /api/v1/electronic-signatures/verify`
*   **Request Body**:
    ```json
    {
      "signature_id": "7f8g9h0i-1j2k-3l4m-5n6o-7p8q9r0s1t2u"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "is_valid": true,
        "tampered": false,
        "signature": {
          "id": "7f8g9h0i-1j2k-3l4m-5n6o-7p8q9r0s1t2u",
          "signed_at": "2026-06-17T12:00:00Z"
        }
      }
    }
    ```

### 2.3 Set or Update PIN
*   **Endpoint**: `POST /api/v1/electronic-signatures/pin`
*   **Request Body**:
    ```json
    {
      "password": "UserSecurePassword123!",
      "pin": "5678"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Signature PIN updated successfully"
    }
    ```

### 2.4 Get History logs
*   **Endpoint**: `GET /api/v1/electronic-signatures/history?limit=10&offset=0`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "signatures": [
          {
            "id": "7f8g9h0i-1j2k-3l4m-5n6o-7p8q9r0s1t2u",
            "action": "APPROVE",
            "meaning": "I approve the release and content of this standard operating procedure.",
            "signed_at": "2026-06-17T12:00:00Z",
            "is_valid": true,
            "resource": {
              "type": "document",
              "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
              "name": "SOP-001 Quality Policy"
            }
          }
        ],
        "total": 1
      }
    }
    ```

### 2.5 Get Compliance Statistics (Gated: `audit_logs:read`)
*   **Endpoint**: `GET /api/v1/electronic-signatures/statistics?start_date=2026-01-01&end_date=2026-12-31`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "total_signatures": 42,
        "unique_signers": 8,
        "unique_resources": 15,
        "by_action": {
          "APPROVE": 25,
          "REVIEW": 10,
          "REJECT": 7
        }
      }
    }
    ```

### 2.6 Invalidate Signature (Gated: `super_admin`)
*   **Endpoint**: `POST /api/v1/electronic-signatures/:id/invalidate`
*   **Request Body**:
    ```json
    {
      "reason": "Document content was retroactively found to contain typographical formatting errors."
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Signature invalidated successfully"
    }
    ```
