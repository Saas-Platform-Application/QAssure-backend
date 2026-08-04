# How to View PostgreSQL Tables in Docker

Based on your `docker-compose.yml`, here are several ways to access your PostgreSQL database:

## Database Connection Details
- **Container Name**: `qassure-postgres`
- **Database**: `qassure_dev`
- **User**: `postgres`
- **Password**: `postgres123`
- **Port**: Not exposed to host (access via Docker exec or pgAdmin)
- **Note**: You have an existing PostgreSQL running on port 5432, so Docker PostgreSQL is only accessible from within Docker network

---

## Method 1: Using psql inside the Docker Container (Recommended)

### Connect to PostgreSQL interactive shell:
```bash
docker exec -it qassure-postgres psql -U postgres -d qassure_dev
```

### Once connected, useful commands:
```sql
-- List all tables
\dt

-- List all tables with details
\dt+

-- List all schemas
\dn

-- Describe a specific table structure
\d table_name

-- Describe a specific table with more details
\d+ table_name

-- List all databases
\l

-- Show current database
SELECT current_database();

-- Count rows in a table
SELECT COUNT(*) FROM table_name;

-- Exit psql
\q
```

### Example: View all tables and their row counts
```sql
SELECT 
    schemaname,
    tablename,
    (SELECT COUNT(*) FROM information_schema.tables t2 
     WHERE t2.table_schema = t1.schemaname 
     AND t2.table_name = t1.tablename) as row_count
FROM pg_tables t1
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## Method 2: Run SQL Commands Directly (One-liners)

### List all tables:
```bash
docker exec -it qassure-postgres psql -U postgres -d qassure_dev -c "\dt"
```

### Get table structure:
```bash
docker exec -it qassure-postgres psql -U postgres -d qassure_dev -c "\d table_name"
```

### Run a custom query:
```bash
docker exec -it qassure-postgres psql -U postgres -d qassure_dev -c "SELECT * FROM users LIMIT 5;"
```

### List all tables with row counts:
```bash
docker exec -it qassure-postgres psql -U postgres -d qassure_dev -c "
SELECT 
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;"
```

---

## Method 3: Using pgAdmin (Web UI - Easiest)

### Start pgAdmin with debug profile:
```bash
docker-compose --profile debug up -d pgadmin
```

### Access pgAdmin:
- **URL**: http://localhost:5050
- **Email**: admin@qassure.ai
- **Password**: admin123

### Connect to PostgreSQL in pgAdmin:
1. Right-click "Servers" → "Create" → "Server"
2. **General Tab**:
   - Name: `QAssure PostgreSQL`
3. **Connection Tab**:
   - Host name/address: `postgres` (container name, not localhost!)
   - Port: `5432`
   - Maintenance database: `qassure_dev`
   - Username: `postgres`
   - Password: `postgres123`
   - Check "Save password"
4. Click "Save"

Now you can browse all tables, run queries, and view data visually!

---

## Method 4: Using Local psql Client (if installed)

**Note**: Since the Docker PostgreSQL port is not exposed, you cannot connect directly from the host. Use Method 1 (docker exec) or Method 3 (pgAdmin) instead.

If you need to connect from host, you would need to expose the port in docker-compose.yml, but this would conflict with your existing PostgreSQL on port 5432.

---

## Method 5: Export Table Schema

### Export all table structures:
```bash
docker exec -it qassure-postgres pg_dump -U postgres -d qassure_dev --schema-only > schema.sql
```

### Export specific table:
```bash
docker exec -it qassure-postgres pg_dump -U postgres -d qassure_dev -t table_name --schema-only > table_schema.sql
```

---

## Quick Reference: Common Queries

### List all tables:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Get table columns:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'your_table_name'
ORDER BY ordinal_position;
```

### Find tables with specific column:
```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name LIKE '%tenant_id%'
ORDER BY table_name;
```

### View foreign key relationships:
```sql
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

---

## Troubleshooting

### If container is not running:
```bash
docker ps -a | grep postgres
docker start qassure-postgres
```

### Check container logs:
```bash
docker logs qassure-postgres
```

### Test connection:
```bash
docker exec -it qassure-postgres pg_isready -U postgres
```
