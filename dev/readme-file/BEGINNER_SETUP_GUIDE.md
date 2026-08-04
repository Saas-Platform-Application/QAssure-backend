# QAssure API - Beginner Setup Guide

This guide will help you set up and run the QAssure backend API step by step. Follow each step carefully.

## ✅ Prerequisites Check

Before starting, make sure you have these installed:

### 1. Check Node.js (Required)
```bash
node --version
```
**Expected:** v18.x.x or higher  
**If not installed:** Download from [nodejs.org](https://nodejs.org/)

### 2. Check PostgreSQL (Required)
```bash
psql --version
```
**Expected:** psql (PostgreSQL) 14.x or higher  
**If not installed:** 
- **macOS:** `brew install postgresql@14`
- **Linux:** `sudo apt-get install postgresql`
- **Windows:** Download from [postgresql.org](https://www.postgresql.org/download/)

### 3. Check Redis (Required)
```bash
redis-cli ping
```
**Expected:** PONG  
**If not installed:**
- **macOS:** `brew install redis` then `brew services start redis`
- **Linux:** `sudo apt-get install redis-server` then `sudo systemctl start redis`
- **Windows:** Download from [redis.io](https://redis.io/download/)

---

## 📋 Step-by-Step Setup

### Step 1: Navigate to Project Directory

Open your terminal and go to the project folder:

```bash
cd /Users/yasha/Desktop/QAssure-Details/QAssure-Documents-Team/Latest-Code-Base/QAssure-Project
```

### Step 2: Install Dependencies

Install all required Node.js packages:

```bash
npm install
```

**What this does:** Downloads all the code libraries the project needs (like Express, PostgreSQL client, etc.)

**Expected output:** You'll see a list of packages being installed. Wait until it finishes (may take 1-2 minutes).

### Step 3: Create Environment File (.env)

The `.env` file stores configuration settings. Create it:

```bash
cat > .env << 'EOF'
# ===========================================
# QAssure Platform Configuration
# ===========================================

# ─────────────────────────────────────────
# APPLICATION SETTINGS
# ─────────────────────────────────────────
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
API_PREFIX=/api/v1

# ─────────────────────────────────────────
# DATABASE (PostgreSQL)
# ─────────────────────────────────────────
DATABASE_URL=postgresql://postgres@localhost:5432/qassure_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qassure_dev
DB_USER=postgres
DB_PASSWORD=

# ─────────────────────────────────────────
# REDIS
# ─────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─────────────────────────────────────────
# JWT AUTHENTICATION (IMPORTANT!)
# ─────────────────────────────────────────
JWT_SECRET=your-super-secret-key-change-in-production-use-256-bit-key-minimum-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-use-256-bit-key-minimum-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ─────────────────────────────────────────
# EMAIL (Optional - uses console in development)
# ─────────────────────────────────────────
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@qassure.ai

# ─────────────────────────────────────────
# RATE LIMITING
# ─────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# ─────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────
LOG_LEVEL=debug
LOG_REQUESTS=true

# ─────────────────────────────────────────
# KAFKA (Optional - can be disabled)
# ─────────────────────────────────────────
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_CLIENT_ID=qassure-platform
KAFKA_GROUP_ID=qassure-consumer-group
KAFKA_SSL=false
EOF
```

**Important Notes:**
- If your PostgreSQL has a password, update `DB_PASSWORD=` with your password
- If your PostgreSQL user is not `postgres`, update `DB_USER=` and `DATABASE_URL=`

### Step 4: Verify Database Exists

Check if the database `qassure_dev` exists:

```bash
psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw qassure_dev && echo "✅ Database exists" || echo "❌ Database does not exist - create it with: createdb qassure_dev"
```

**If database doesn't exist, create it:**
```bash
createdb -h localhost -U postgres qassure_dev
```

### Step 5: Start PostgreSQL (if not running)

**macOS:**
```bash
brew services start postgresql@14
```

**Linux:**
```bash
sudo systemctl start postgresql
```

**Verify it's running:**
```bash
psql -h localhost -U postgres -c "SELECT 1;" 
```
Should return: `?column?` and `1`

### Step 6: Start Redis (if not running)

**macOS:**
```bash
brew services start redis
```

**Linux:**
```bash
sudo systemctl start redis
```

**Verify it's running:**
```bash
redis-cli ping
```
Should return: `PONG`

### Step 7: Start the Server

Now start the API server:

```bash
npm start
```

**Expected output:**
```
✅ Database connected: [timestamp]
[Redis] ✅ Connected successfully
[Redis] ✅ Ready to accept commands
✅ Redis connected successfully
[PermissionService] Redis caching enabled
[AuthService] Redis session caching enabled
🚀 Server is running on 0.0.0.0:3000
📍 Environment: development
🌐 API prefix: /api/v1
```

**⚠️ If you see errors:**
- **"DATABASE_URL not set"** → Check Step 3, make sure `.env` file exists
- **"ECONNREFUSED" for PostgreSQL** → Check Step 5, make sure PostgreSQL is running
- **"ECONNREFUSED" for Redis** → Check Step 6, make sure Redis is running
- **"JWT_SECRET must be at least 32 characters"** → Check Step 3, make sure JWT_SECRET is set in `.env`

### Step 8: Test the API

Open a **NEW terminal window** (keep the server running in the first one) and test:

#### Test 1: Health Check
```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"...","uptime":...,"environment":"development"}
```

#### Test 2: API Info
```bash
curl http://localhost:3000/api/v1/
```

**Expected response:** JSON with API information

#### Test 3: Detailed Health Check
```bash
curl http://localhost:3000/api/v1/health/detailed | python3 -m json.tool
```

**Expected response:** JSON showing database and Redis status

---

## 🧪 Testing Authentication Flows

### Test 1: User Registration

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Test123456",
    "first_name": "John",
    "last_name": "Doe"
  }' | python3 -m json.tool
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "newuser@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "status": "pending_verification"
    },
    "message": "Registration successful. Please check your email to verify your account."
  }
}
```

**Note:** In development mode, the verification email will be printed in the server console (not actually sent).

### Test 2: Get Verification Token

The verification token is stored in Redis. To get it:

```bash
# Get the verification token key
VERIFY_KEY=$(redis-cli KEYS "verify:*" | head -1)

# Get the token value (the actual token is in the key name)
echo $VERIFY_KEY | cut -d: -f2
```

Or check the server console logs - the email will show the verification link with the token.

### Test 3: Verify Email

```bash
# Replace YOUR_TOKEN_HERE with the actual token from Step 2
curl -X POST http://localhost:3000/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN_HERE"
  }' | python3 -m json.tool
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Email verified successfully"
  }
}
```

### Test 4: Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Test123456"
  }' | python3 -m json.tool
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "newuser@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "tenant_id": "...",
    "roles": ["viewer"],
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "token_type": "Bearer",
    "expires_in": 86400,
    "expires_at": "2025-12-31T..."
  }
}
```

**⚠️ Important:** Save the `access_token` - you'll need it for authenticated requests!

### Test 5: Get Current User (Authenticated Request)

```bash
# Replace YOUR_ACCESS_TOKEN with the token from Test 4
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" | python3 -m json.tool
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "newuser@example.com",
      "tenant_id": "...",
      "roles": ["viewer"],
      "permissions": [...]
    },
    "session": {
      "id": "..."
    }
  }
}
```

### Test 6: Refresh Token

```bash
# Replace YOUR_REFRESH_TOKEN with the refresh_token from Test 4
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }' | python3 -m json.tool
```

**Expected response:** New access and refresh tokens

### Test 7: Logout

```bash
# Replace YOUR_ACCESS_TOKEN with a valid access token
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" | python3 -m json.tool
```

**Expected response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 🛠️ Common Issues & Solutions

### Issue 1: "Cannot find module" errors
**Solution:** Run `npm install` again

### Issue 2: Port 3000 already in use
**Solution:** 
```bash
# Find what's using port 3000
lsof -ti:3000

# Kill it (replace PID with the number from above)
kill -9 PID

# Or change PORT in .env file to 3001
```

### Issue 3: Database connection failed
**Solution:**
1. Check PostgreSQL is running: `psql -h localhost -U postgres -c "SELECT 1;"`
2. Check `.env` file has correct `DATABASE_URL`
3. Check database exists: `psql -h localhost -U postgres -lqt | grep qassure_dev`

### Issue 4: Redis connection failed
**Solution:**
1. Check Redis is running: `redis-cli ping`
2. Check `.env` file has `REDIS_URL=redis://localhost:6379`
3. Start Redis: `brew services start redis` (macOS) or `sudo systemctl start redis` (Linux)

### Issue 5: "JWT_SECRET must have a value"
**Solution:** Make sure `.env` file has both:
- `JWT_SECRET=...` (at least 32 characters)
- `JWT_REFRESH_SECRET=...` (at least 32 characters)

### Issue 6: "tokens is not defined" error
**Solution:** This has been fixed! Make sure you have the latest code. If you still see this, restart the server.

---

## 📝 Quick Reference Commands

### Start Server
```bash
npm start
```

### Start Server with Auto-Reload (Development)
```bash
npm run dev
```

### Check Server Status
```bash
curl http://localhost:3000/health
```

### Stop Server
Press `Ctrl+C` in the terminal where the server is running

### View Server Logs
If running in background, logs are in `/tmp/qassure-server.log`:
```bash
tail -f /tmp/qassure-server.log
```

---

## 🎯 Next Steps

Once the API is running successfully:

1. **Test all endpoints** using the Postman collection: `QAssure_API_Collection.postman_collection.json`
2. **Read the API documentation:** `QASSURE_API_ENDPOINTS_SPECIFICATION.md`
3. **Explore the codebase:** Start with `src/routes/index.js` to see all available endpoints

---

## 📞 Need Help?

If you encounter issues not covered in this guide:

1. Check the server logs for error messages
2. Verify all prerequisites are installed and running
3. Make sure the `.env` file is correctly configured
4. Check that PostgreSQL and Redis are running

---

**Last Updated:** December 30, 2025  
**Status:** ✅ All authentication flows tested and working

