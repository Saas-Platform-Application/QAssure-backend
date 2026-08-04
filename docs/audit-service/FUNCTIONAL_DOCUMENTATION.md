# Audit Log Service - Functional Documentation

---

## 1. Functional Overview
The Audit Log Service provides platform-wide event capture, persistence, and audit query capabilities. It operates behind the scenes to track actions, security events, configurations, and core mutations to verify system integrity and ensure compliance with **FDA 21 CFR Part 11**.

---

## 2. Core Features & Business Capabilities

### 2.1 Automated Logging Middleware
The service intercepts all API calls matching registered application routes (except for public assets, `/health`, `/metrics`, or direct audit log insertions). It extracts:
*   **Actor Context**: User ID, Tenant ID, Roles, and Authentication Mode (JWT vs. API Key).
*   **Action Resolution**: Detects intent from HTTP methods (`GET` -> `READ`, `POST` -> `CREATE`, `PUT`/`PATCH` -> `UPDATE`, `DELETE` -> `DELETE`) or path patterns (e.g. `/auth/login` -> `LOGIN`, `/approve` -> `APPROVE`).
*   **Target Identifier**: Automatically extracts resource IDs (e.g. `documentId`, `userId`, `moduleId`) from request parameters.

### 2.2 Immutable Storage & Retention Gate
*   **Immutable Logs**: Logs cannot be modified or updated after creation by normal users or administrators.
*   **7-Year Gatekeeper**: The service enforces a hard block on log deletion. Any delete request invokes validation that checks the creation timestamp against a 7-year retention duration:
    ```
    currentTime - createdTime < 220,752,000,000 ms (7 Years) => Throw Error
    ```

### 2.3 Context-Aware Dropdown Filters
The service populates filter dropdowns for search interfaces depending on the active user’s scope:
1.  **Strict Module Mode (API Key Auth)**: Restricts results and filters to resource types associated with the caller's specific module ID.
2.  **Super Admin Mode**: Returns all registered platform and module-specific resource types.
3.  **Tenant Admin Mode**: Exposes platform types and types associated with modules that are currently active/accessible to that tenant.

### 2.4 Payload Sanitization
To protect user privacy and prevent security vulnerabilities, request and response bodies are recursively sanitized. All values for keys matching sensitive terms are replaced with `[REDACTED]`:
*   `password`, `password_hash`
*   `token`, `secret`
*   `api_key`, `key`

---

## 3. Operations & User Roles Matrix

| Feature / Action | Regular User | Tenant Admin | Super Admin | System / API Key |
| :--- | :---: | :---: | :---: | :---: |
| **Write Log Event** | Yes (Self-triggered) | Yes (Self-triggered) | Yes (Any context) | Yes (Module-scoped) |
| **Read Own Logs (`/my-logs`)** | Yes | Yes | Yes | No |
| **Read Tenant Logs** | No | Yes (Tenant-scoped) | Yes (Cross-tenant) | No |
| **Delete Log Event** | No | No | Yes (Only if > 7 years old) | No |
| **Manage Resource Types** | No | No | Yes | No |
| **Read Audit Stats** | No | Yes (Tenant-scoped) | Yes (Cross-tenant) | No |
