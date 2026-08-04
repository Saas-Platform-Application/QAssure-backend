# Security Routes - Quick Reference

## Base Path: `/api/v1/security`

All routes require **JWT Authentication**. Additional permissions required as noted.

---

## 📋 Password Policy (5 endpoints)

| Method | Endpoint | Permission | Use Case |
|--------|----------|------------|----------|
| `GET` | `/password-policy` | authenticated | View current password policy |
| `PUT` | `/password-policy` | `security:write` | Update password policy settings |
| `GET` | `/password-policy/requirements` | authenticated | Get user-friendly requirements list |
| `POST` | `/password-policy/validate` | authenticated | Validate password before setting |
| `GET` | `/password-expiry` | authenticated | Check if password is expired |

---

## 🔍 Access Reviews (12 endpoints)

| Method | Endpoint | Permission | Use Case |
|--------|----------|------------|----------|
| `GET` | `/decision-types` | authenticated | Get available decision types |
| `GET` | `/review-statuses` | authenticated | Get review status options |
| `POST` | `/access-reviews` | `security:write` | Create new access review campaign |
| `GET` | `/access-reviews` | `security:read` | List all access reviews |
| `GET` | `/access-reviews/:id` | `security:read` | Get review details |
| `GET` | `/access-reviews/:id/items` | `security:read` | Get users to review |
| `POST` | `/access-reviews/:id/start` | `security:write` | Start a review |
| `POST` | `/access-reviews/:id/items/:itemId/decide` | `security:write` | Make decision on user access |
| `POST` | `/access-reviews/:id/bulk-certify` | `security:write` | Approve all pending users |
| `POST` | `/access-reviews/:id/execute` | `*:*` (super_admin) | Execute decisions (revoke/modify access) |
| `POST` | `/access-reviews/:id/cancel` | `security:write` | Cancel a review |
| `GET` | `/access-reviews/compliance-report` | `audit:read` | Generate compliance report |

---

## ⚙️ Security Settings (6 endpoints)

| Method | Endpoint | Permission | Use Case |
|--------|----------|------------|----------|
| `GET` | `/settings` | `security:read` | Get security settings |
| `PUT` | `/settings` | `security:write` | Update security settings |
| `POST` | `/settings/compliance-mode` | `*:*` (super_admin) | Apply compliance preset (FDA Part 11, HIPAA, etc.) |
| `GET` | `/settings/compliance-modes` | authenticated | Get available compliance modes |
| `GET` | `/settings/compliance-summary` | `security:read` | Get compliance status & recommendations |
| `GET` | `/settings/export` | `*:*` (super_admin) | Export settings for backup/audit |

---

## 🎯 Common Workflows

### Password Policy Setup
```
GET /password-policy → PUT /password-policy → POST /settings/compliance-mode
```

### Access Review Process
```
POST /access-reviews → POST /access-reviews/:id/start → 
GET /access-reviews/:id/items → POST /access-reviews/:id/items/:itemId/decide → 
POST /access-reviews/:id/execute
```

### Compliance Check
```
GET /settings/compliance-summary → GET /settings/compliance-modes → 
POST /settings/compliance-mode
```

---

## 🔐 Permission Levels

- **authenticated**: Any logged-in user
- **security:read**: Read security settings and reviews
- **security:write**: Create/update reviews and settings
- **audit:read**: Access audit reports
- **\*:\*** (super_admin): Execute reviews, apply compliance modes, export settings

---

## 📊 Total Endpoints: 23

- Password Policy: 5
- Access Reviews: 12
- Security Settings: 6

---

For detailed documentation, see `SECURITY_ROUTES_DOCUMENTATION.md`


