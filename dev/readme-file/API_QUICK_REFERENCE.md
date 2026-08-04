# QAssure API - Quick Reference Card

## 🔑 Authentication

### Login & Get Token
```bash
export BASE_URL="http://localhost:3000/api/v1"
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser2@example.com","password":"Test123456"}')
export ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")
```

---

## 📋 Most Common Endpoints

### Health Check
```bash
curl ${BASE_URL}/health
```

### Get Current User
```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" ${BASE_URL}/auth/me
```

### List Users
```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" ${BASE_URL}/users
```

### List Modules
```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" ${BASE_URL}/modules
```

### List Roles
```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" ${BASE_URL}/roles
```

---

## 🚀 Quick Test All Endpoints

```bash
./test_all_endpoints.sh
```

---

## 📝 Postman Setup

1. **Import:** `QAssure_API_Collection.postman_collection.json`
2. **Set Variables:**
   - `base_url`: `http://localhost:3000/api/v1`
3. **Run Login First** to auto-set tokens

---

## 🔍 Common HTTP Status Codes

- **200** ✅ Success
- **201** ✅ Created
- **400** ❌ Bad Request (validation error)
- **401** ❌ Unauthorized (missing/invalid token)
- **403** ❌ Forbidden (no permission)
- **404** ❌ Not Found
- **500** ❌ Server Error

---

## 🛠️ Troubleshooting

**Token expired?** → Re-login  
**403 Forbidden?** → Check user permissions  
**500 Error?** → Check server logs

---

For complete documentation, see `API_TESTING_GUIDE.md`

