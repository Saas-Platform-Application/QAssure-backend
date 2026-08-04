# Server Management - Quick Commands

## 🚀 Start Server

```bash
cd /Users/yasha/Desktop/QAssure-Details/QAssure-Documents-Team/Latest-Code-Base/QAssure-Project
npm start
```

Or run in background:
```bash
npm start > /tmp/qassure-server.log 2>&1 &
```

## 🛑 Stop Server

### If running in foreground:
Press `Ctrl+C`

### If running in background:
```bash
# Find the process
lsof -ti:3000

# Kill it (replace PID with the number from above)
kill PID

# Or kill all node processes on port 3000
kill $(lsof -ti:3000)
```

## 🔍 Check if Server is Running

```bash
# Check if port 3000 is in use
lsof -ti:3000 && echo "Server is running" || echo "Server is not running"

# Or test the health endpoint
curl http://localhost:3000/health
```

## 🔄 Restart Server

```bash
# Kill existing server
kill $(lsof -ti:3000) 2>/dev/null

# Wait a moment
sleep 2

# Start server
npm start
```

## 📋 View Server Logs

### If running in foreground:
Logs appear in terminal

### If running in background:
```bash
# View logs
tail -f /tmp/qassure-server.log

# View last 50 lines
tail -50 /tmp/qassure-server.log
```

## ⚠️ Common Issues

### Issue: "Port 3000 is already in use"

**Solution:**
```bash
# Find what's using the port
lsof -ti:3000

# Kill it
kill $(lsof -ti:3000)

# Or use a different port (edit .env file)
# Change PORT=3000 to PORT=3001
```

### Issue: "Cannot find module"

**Solution:**
```bash
npm install
```

### Issue: "Database connection failed"

**Solution:**
```bash
# Check PostgreSQL is running
psql -h localhost -U postgres -c "SELECT 1;"

# Check .env file has correct DATABASE_URL
cat .env | grep DATABASE_URL
```

### Issue: "Redis connection failed"

**Solution:**
```bash
# Check Redis is running
redis-cli ping

# Should return: PONG

# If not running, start it:
# macOS:
brew services start redis

# Linux:
sudo systemctl start redis
```

## 🧪 Quick Test After Starting

```bash
# Test health endpoint
curl http://localhost:3000/health | python3 -m json.tool

# Should return:
# {
#   "status": "ok",
#   "timestamp": "...",
#   "uptime": ...,
#   "environment": "development"
# }
```

## 📝 Useful Commands Summary

```bash
# Start server
npm start

# Stop server
kill $(lsof -ti:3000)

# Check if running
curl http://localhost:3000/health

# View logs (if running in background)
tail -f /tmp/qassure-server.log

# Restart server
kill $(lsof -ti:3000) 2>/dev/null && sleep 2 && npm start
```

---

**Note:** The Kafka connection errors you see are normal if Kafka is not running. The server will continue to work without Kafka - it just won't publish events.

