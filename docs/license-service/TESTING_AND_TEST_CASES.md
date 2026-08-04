# QAssure License Service — Testing & Test Cases

---

## 1. Test Strategy Overview

The testing strategy for the License Service concentrates on confirming strict compliance boundaries:
1.  **Gating Logic**: Verifying that API endpoints correctly enforce access controls based on tenant license status.
2.  **Date Threshold Checks**: Mocking the database system clock to verify warning, grace, and suspension transition accuracy.
3.  **Boundary Gating**: Validating that resource requests (e.g. creating users beyond allocations) are blocked when the limit is breached.
4.  **Security Boundaries**: Validating that only Super Admins can write/revoke licenses, while Tenant Admins can activate them, and normal users are restricted to read-only views.

---

## 2. Test Case Matrix

| ID | Module | Target Case Description | Input Data / Params | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **LIC-TC-01** | CRUD | Create License Key | Tenant, application, professional tier | Key created matching pattern `QASSURE-{APP}-{TIER}-{HASH}-{DATE}-{RAND}`. Status: `pending`. |
| **LIC-TC-02** | Activation | Activate License Key | Valid key, instance details | Changes status to `active`, activation state to `activated`, records device fingerprint. |
| **LIC-TC-03** | Activation | Prevent Double Activation | Same key, different instance fingerprint | Activation fails with `400 Bad Request` — `LICENSE_ALREADY_ACTIVATED`. |
| **LIC-TC-04** | Feature | Check Feature Allowed | feature: "cer_generation" | Returns `allowed: true` based on tier feature mappings. |
| **LIC-TC-05** | Feature | Check Feature Denied | feature: "ai_unlimited" on starter tier | Returns `allowed: false`. |
| **LIC-TC-06** | Limits | Enforcement - Hard User Limit | Try creating 26th user on professional tier (limit 25) | API blocks operation with `400` — `LICENSE_LIMIT_EXCEEDED`. |
| **LIC-TC-07** | Expiry | Status update - Warning state | License expiring in 15 days | Enforcement status returns `warning`; dashboard alert triggered. |
| **LIC-TC-08** | Expiry | Status update - Grace period | License expired 5 days ago | Enforcement status returns `grace`; access remains open. |
| **LIC-TC-09** | Expiry | Status update - Suspension | License expired 45 days ago | Enforcement status returns `suspended`; writing operations blocked. |
| **LIC-TC-10** | Revoke | Revoke License | Revoke API call with reason | Key status changed to `revoked`, `revoked_at` populated; access blocked immediately. |
| **LIC-TC-11** | Security | Multi-tenant Isolation | Tenant B views Tenant A license usage | Request returns `403 Forbidden` or `404 Not Found`. |

---

## 3. Step-by-Step Test Scenarios

### Scenario A: License Generation & Tenant Activation
1.  **Action**: Log in as a Super Admin and call `POST /api/v1/licenses` to generate a trial license for Tenant A.
    *   *Check*: Confirm the license details show `status: "pending"` and `activation_state: "not_activated"`.
2.  **Action**: Log in as Tenant A Administrator.
3.  **Action**: Call `POST /api/v1/licenses/activate` supplying the generated license key and client device details.
    *   *Check*: Verify the response indicates success, sets `status` to `active`, and records the activation date.

### Scenario B: Limit Gating & Feature Checks
1.  **Action**: Check module access for `aice` module (`POST /api/v1/licenses/check-feature`).
    *   *Check*: Verify `allowed: true` for enabled features, and `allowed: false` for disabled ones.
2.  **Action**: Simulate current user count equal to `max_users` and attempt to add one more user.
    *   *Check*: Confirm that the controller blocks the request and returns a validation error.
