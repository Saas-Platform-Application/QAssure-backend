# Security Routes Documentation

## Overview
The `/api/v1/security` endpoints provide comprehensive security management features for the QAssure platform, including password policies, access reviews, and security settings. These endpoints support FDA 21 CFR Part 11 compliance and other regulatory requirements.

**Base Path:** `/api/v1/security`

**Authentication:** All routes require authentication (JWT token)

---

## Table of Contents
1. [Password Policy Routes](#password-policy-routes)
2. [Access Review Routes](#access-review-routes)
3. [Security Settings Routes](#security-settings-routes)

---

## Password Policy Routes

### 1. Get Password Policy
**Endpoint:** `GET /api/v1/security/password-policy`

**Description:** Retrieves the current password policy configuration for the authenticated user's tenant.

**Access:** Authenticated users

**Use Case:**
- Display password requirements in the UI
- Show current policy settings to administrators
- Validate password rules before user registration/password change

**Response Example:**
```json
{
  "success": true,
  "data": {
    "min_length": 8,
    "require_uppercase": true,
    "require_lowercase": true,
    "require_numbers": true,
    "require_special_chars": true,
    "max_age_days": 90,
    "prevent_reuse_count": 5,
    "lockout_attempts": 5,
    "lockout_duration_minutes": 30
  }
}
```

---

### 2. Update Password Policy
**Endpoint:** `PUT /api/v1/security/password-policy`

**Description:** Updates the password policy configuration for the tenant. Only tenant admins or super admins can modify policies.

**Access:** Requires `security:write` permission (tenant_admin or super_admin)

**Use Case:**
- Configure password complexity requirements
- Set password expiration policies
- Configure account lockout settings
- Enforce compliance requirements (e.g., FDA Part 11)

**Request Body Example:**
```json
{
  "min_length": 12,
  "require_uppercase": true,
  "require_lowercase": true,
  "require_numbers": true,
  "require_special_chars": true,
  "max_age_days": 60,
  "prevent_reuse_count": 10,
  "lockout_attempts": 3,
  "lockout_duration_minutes": 60
}
```

---

### 3. Get Password Requirements
**Endpoint:** `GET /api/v1/security/password-policy/requirements`

**Description:** Returns a user-friendly list of password requirements formatted for UI display.

**Access:** Authenticated users

**Use Case:**
- Display password requirements checklist in registration form
- Show password rules in password change dialog
- Provide real-time validation feedback

**Response Example:**
```json
{
  "success": true,
  "data": {
    "requirements": [
      "At least 8 characters",
      "At least one uppercase letter",
      "At least one lowercase letter",
      "At least one number",
      "At least one special character"
    ]
  }
}
```

---

### 4. Validate Password
**Endpoint:** `POST /api/v1/security/password-policy/validate`

**Description:** Validates a password against the current policy without actually setting it. Useful for real-time UI feedback.

**Access:** Authenticated users

**Use Case:**
- Real-time password validation as user types
- Pre-validation before form submission
- Password strength indicator

**Request Body:**
```json
{
  "password": "MySecureP@ss123",
  "username": "optional_username_to_check_similarity"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "strength": "strong"
  }
}
```

---

### 5. Check Password Expiry
**Endpoint:** `GET /api/v1/security/password-expiry`

**Description:** Checks if the current user's password is expired or nearing expiration.

**Access:** Authenticated users

**Use Case:**
- Display password expiry warning to users
- Force password change when expired
- Show days until password expires

**Response Example:**
```json
{
  "success": true,
  "data": {
    "is_expired": false,
    "days_until_expiry": 15,
    "expires_at": "2026-02-15T00:00:00Z",
    "requires_change": false
  }
}
```

---

## Access Review Routes

Access reviews are periodic audits to verify that users still need their current access permissions. This is critical for compliance and security.

### 6. Get Decision Types
**Endpoint:** `GET /api/v1/security/decision-types`

**Description:** Returns available decision types for access reviews.

**Access:** Authenticated users

**Use Case:**
- Populate dropdown in access review UI
- Display decision options to reviewers

**Response Example:**
```json
{
  "success": true,
  "data": {
    "types": ["CERTIFY", "REVOKE", "MODIFY", "PENDING"],
    "descriptions": {
      "CERTIFY": "User still needs this access",
      "REVOKE": "Remove all access from user",
      "MODIFY": "Change user access level",
      "PENDING": "Decision not yet made"
    }
  }
}
```

---

### 7. Get Review Statuses
**Endpoint:** `GET /api/v1/security/review-statuses`

**Description:** Returns available status types for access reviews.

**Access:** Authenticated users

**Use Case:**
- Display review status in dashboard
- Filter reviews by status

**Response Example:**
```json
{
  "success": true,
  "data": {
    "statuses": ["pending", "in_progress", "completed", "overdue", "cancelled"],
    "descriptions": {
      "pending": "Review created but not started",
      "in_progress": "Review is being conducted",
      "completed": "All decisions made",
      "overdue": "Past due date with pending decisions",
      "cancelled": "Review was cancelled"
    }
  }
}
```

---

### 8. Create Access Review
**Endpoint:** `POST /api/v1/security/access-reviews`

**Description:** Creates a new access review campaign to audit user access permissions.

**Access:** Requires `security:write` permission

**Use Case:**
- Schedule periodic access audits
- Review access after role changes
- Compliance-driven access reviews (quarterly, annual)
- Review access for specific departments or roles

**Request Body:**
```json
{
  "name": "Q1 2026 Access Review",
  "description": "Quarterly access review for all users",
  "review_type": "user_access",
  "scope_type": "all_users",
  "scope_criteria": {},
  "frequency": "quarterly",
  "start_date": "2026-01-15T00:00:00Z",
  "due_date": "2026-02-15T00:00:00Z",
  "reviewer_id": "user-uuid",
  "reviewer_role": "security_admin",
  "auto_revoke_on_overdue": true,
  "auto_revoke_after_days": 7
}
```

**Response:** Returns created review object with ID

---

### 9. List Access Reviews
**Endpoint:** `GET /api/v1/security/access-reviews`

**Description:** Lists all access reviews for the tenant with pagination support.

**Access:** Requires `security:read` permission

**Query Parameters:**
- `status` (optional): Filter by status (pending, in_progress, completed, overdue, cancelled)
- `limit` (optional): Number of results per page (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Use Case:**
- Display review dashboard
- Track review progress
- Monitor overdue reviews

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": "review-uuid",
      "name": "Q1 2026 Access Review",
      "status": "in_progress",
      "start_date": "2026-01-15T00:00:00Z",
      "due_date": "2026-02-15T00:00:00Z",
      "total_items": 150,
      "decided_items": 75
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 10. Get Access Review Details
**Endpoint:** `GET /api/v1/security/access-reviews/:id`

**Description:** Retrieves detailed information about a specific access review.

**Access:** Requires `security:read` permission

**Use Case:**
- View review configuration
- Check review progress
- Display review details page

**Response:** Returns complete review object with statistics

---

### 11. Get Access Review Items
**Endpoint:** `GET /api/v1/security/access-reviews/:id/items`

**Description:** Retrieves the list of users/items that need to be reviewed in an access review.

**Access:** Requires `security:read` permission

**Query Parameters:**
- `decision` (optional): Filter by decision status (CERTIFY, REVOKE, MODIFY, PENDING)
- `limit` (optional): Number of results per page (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Use Case:**
- Display users to review
- Show review progress
- Filter pending vs. decided items

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": "item-uuid",
      "user_id": "user-uuid",
      "user_email": "user@example.com",
      "current_roles": ["user", "analyst"],
      "decision": "PENDING",
      "decision_reason": null,
      "decided_at": null,
      "decided_by": null
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

---

### 12. Start Access Review
**Endpoint:** `POST /api/v1/security/access-reviews/:id/start`

**Description:** Starts an access review that was previously created but not yet started.

**Access:** Requires `security:write` permission

**Use Case:**
- Activate a scheduled review
- Begin review process after creation
- Change status from "pending" to "in_progress"

**Response:** Returns updated review object with status "in_progress"

---

### 13. Make Access Decision
**Endpoint:** `POST /api/v1/security/access-reviews/:id/items/:itemId/decide`

**Description:** Makes a decision on a specific user's access during a review.

**Access:** Requires `security:write` permission

**Use Case:**
- Reviewer certifies that user still needs access
- Reviewer decides to revoke access
- Reviewer modifies user's access level

**Request Body:**
```json
{
  "decision": "CERTIFY",
  "reason": "User still requires access for their role",
  "new_roles": ["user", "analyst"]
}
```

**Note:** `new_roles` is required if `decision` is "MODIFY"

**Response:** Returns updated review item

---

### 14. Bulk Certify
**Endpoint:** `POST /api/v1/security/access-reviews/:id/bulk-certify`

**Description:** Certifies all pending users in a review at once (approves all access).

**Access:** Requires `security:write` permission

**Use Case:**
- Quickly approve all users when no changes needed
- Certify users after initial screening
- Batch approval for efficiency

**Request Body (optional):**
```json
{
  "reason": "All users verified during initial screening"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "message": "150 users certified",
    "updated": 150
  }
}
```

---

### 15. Execute Access Review
**Endpoint:** `POST /api/v1/security/access-reviews/:id/execute`

**Description:** Executes the decisions made during a review. This actually revokes or modifies user access based on decisions.

**Access:** Requires `*:*` permission (super_admin only)

**Use Case:**
- Apply review decisions after review completion
- Automatically revoke/modify access based on decisions
- Finalize access changes

**Response Example:**
```json
{
  "success": true,
  "data": {
    "message": "Access review decisions executed",
    "revoked": 5,
    "modified": 10,
    "errors": []
  }
}
```

**Warning:** This endpoint actually modifies user access. Use with caution.

---

### 16. Cancel Access Review
**Endpoint:** `POST /api/v1/security/access-reviews/:id/cancel`

**Description:** Cancels an access review that is in progress.

**Access:** Requires `security:write` permission

**Use Case:**
- Cancel reviews that are no longer needed
- Stop reviews with incorrect scope
- Handle review errors

**Request Body (optional):**
```json
{
  "reason": "Review scope was incorrect"
}
```

**Response:** Returns cancelled review object

---

### 17. Get Access Review Compliance Report
**Endpoint:** `GET /api/v1/security/access-reviews/compliance-report`

**Description:** Generates a compliance report showing access review history and statistics.

**Access:** Requires `audit:read` permission

**Query Parameters:**
- `year` (optional): Filter by year (default: current year)

**Use Case:**
- Generate compliance reports for auditors
- Track review completion rates
- Monitor access review compliance metrics
- Export for regulatory submissions

**Response Example:**
```json
{
  "success": true,
  "data": {
    "year": 2026,
    "total_reviews": 4,
    "completed_reviews": 3,
    "overdue_reviews": 1,
    "completion_rate": 75,
    "reviews": [
      {
        "id": "review-uuid",
        "name": "Q1 2026 Access Review",
        "status": "completed",
        "completed_at": "2026-02-10T00:00:00Z"
      }
    ]
  }
}
```

---

## Security Settings Routes

### 18. Get Security Settings
**Endpoint:** `GET /api/v1/security/settings`

**Description:** Retrieves all security settings for the current tenant.

**Access:** Requires `security:read` permission

**Use Case:**
- Display security configuration in admin panel
- Show current compliance settings
- Review security posture

**Response:** Returns comprehensive security settings object including:
- Session management settings
- MFA requirements
- Audit logging configuration
- Compliance mode settings
- Encryption settings

---

### 19. Update Security Settings
**Endpoint:** `PUT /api/v1/security/settings`

**Description:** Updates security settings for the tenant.

**Access:** Requires `security:write` permission

**Use Case:**
- Configure session timeout
- Enable/disable MFA
- Set audit logging preferences
- Configure encryption settings
- Adjust security thresholds

**Request Body:** Partial update of security settings

**Response:** Returns updated settings

---

### 20. Apply Compliance Mode
**Endpoint:** `POST /api/v1/security/settings/compliance-mode`

**Description:** Applies a predefined compliance mode preset (FDA Part 11, HIPAA, ISO 13485, etc.).

**Access:** Requires `*:*` permission (super_admin only)

**Use Case:**
- Quickly configure settings for FDA Part 11 compliance
- Apply HIPAA-compliant settings
- Set up ISO 13485 requirements
- Standardize compliance across tenants

**Request Body:**
```json
{
  "mode": "fda_part11"
}
```

**Available Modes:**
- `fda_part11`: FDA 21 CFR Part 11 - US pharmaceutical regulations
- `eu_annex11`: EU Annex 11 - European pharmaceutical regulations
- `hipaa`: HIPAA - US healthcare data privacy
- `iso_13485`: ISO 13485 - Medical devices quality management
- `custom`: Custom settings (no preset applied)

**Response:** Returns updated settings with compliance mode applied

---

### 21. Get Compliance Modes
**Endpoint:** `GET /api/v1/security/settings/compliance-modes`

**Description:** Returns available compliance mode presets and their descriptions.

**Access:** Authenticated users

**Use Case:**
- Display available compliance modes in UI
- Show compliance mode descriptions
- Help users select appropriate compliance preset

**Response Example:**
```json
{
  "success": true,
  "data": {
    "modes": {
      "FDA_PART11": "fda_part11",
      "EU_ANNEX11": "eu_annex11",
      "HIPAA": "hipaa",
      "ISO_13485": "iso_13485",
      "CUSTOM": "custom"
    },
    "descriptions": {
      "fda_part11": "FDA 21 CFR Part 11 - US pharmaceutical regulations",
      "eu_annex11": "EU Annex 11 - European pharmaceutical regulations",
      "hipaa": "HIPAA - US healthcare data privacy",
      "iso_13485": "ISO 13485 - Medical devices quality management",
      "custom": "Custom settings (no preset applied)"
    }
  }
}
```

---

### 22. Get Compliance Summary
**Endpoint:** `GET /api/v1/security/settings/compliance-summary`

**Description:** Generates a compliance summary with recommendations and current compliance status.

**Access:** Requires `security:read` permission

**Use Case:**
- Display compliance dashboard
- Show compliance gaps
- Provide recommendations for improvement
- Track compliance score

**Response Example:**
```json
{
  "success": true,
  "data": {
    "compliance_mode": "fda_part11",
    "compliance_score": 85,
    "requirements_met": 17,
    "requirements_total": 20,
    "recommendations": [
      "Enable MFA for all users",
      "Reduce password max age to 60 days"
    ],
    "gaps": [
      {
        "requirement": "MFA Required",
        "status": "not_met",
        "severity": "high"
      }
    ]
  }
}
```

---

### 23. Export Security Settings
**Endpoint:** `GET /api/v1/security/settings/export`

**Description:** Exports security settings for backup or audit purposes.

**Access:** Requires `*:*` permission (super_admin only)

**Use Case:**
- Backup security configuration
- Export for audit documentation
- Version control of security settings
- Disaster recovery preparation

**Response:** Returns JSON export of all security settings

---

## Permission Requirements Summary

| Permission | Endpoints |
|------------|-----------|
| `authenticated` | All password policy read endpoints, decision-types, review-statuses, compliance-modes |
| `security:read` | Get settings, list reviews, get review details, compliance summary |
| `security:write` | Update password policy, create/start/cancel reviews, make decisions, bulk certify, update settings |
| `audit:read` | Access review compliance report |
| `*:*` (super_admin) | Execute access review, apply compliance mode, export settings |

---

## Common Use Cases

### Use Case 1: Setting Up Password Policy for FDA Part 11 Compliance
1. Get current policy: `GET /security/password-policy`
2. Update policy with strict requirements: `PUT /security/password-policy`
3. Apply FDA Part 11 compliance mode: `POST /security/settings/compliance-mode`
4. Verify compliance: `GET /security/settings/compliance-summary`

### Use Case 2: Conducting Quarterly Access Review
1. Create review: `POST /security/access-reviews`
2. Start review: `POST /security/access-reviews/:id/start`
3. Get items to review: `GET /security/access-reviews/:id/items`
4. Make decisions: `POST /security/access-reviews/:id/items/:itemId/decide`
5. Execute decisions: `POST /security/access-reviews/:id/execute`
6. Generate report: `GET /security/access-reviews/compliance-report`

### Use Case 3: User Password Change Flow
1. Check expiry: `GET /security/password-expiry`
2. Get requirements: `GET /security/password-policy/requirements`
3. Validate password: `POST /security/password-policy/validate`
4. Change password (via auth endpoint)

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR`: Invalid input data
- `NOT_FOUND`: Resource not found
- `FETCH_ERROR`: Error retrieving data
- `UPDATE_ERROR`: Error updating data
- `CREATE_ERROR`: Error creating resource
- `PERMISSION_DENIED`: Insufficient permissions

---

## Notes

- All endpoints require JWT authentication via `Authorization: Bearer <token>` header
- All timestamps are in ISO 8601 format (UTC)
- All UUIDs are in standard UUID v4 format
- Pagination uses limit/offset pattern
- All routes are tenant-scoped (automatically filtered by user's tenant)


