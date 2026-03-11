---
description: Inspect and query databases directly using PostgreSQL MCP or API endpoints
---

# Database Inspection Workflow

## Via PostgreSQL MCP (direct SQL)

### Check connection
Use `mcp6_query` tool:
```sql
SELECT version();
```

### List all databases
```sql
SELECT datname FROM pg_database WHERE datistemplate = false;
```

### List tables in current database
```sql
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Get table structure
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = '{table_name}'
ORDER BY ordinal_position;
```

### Row counts for all tables
```sql
SELECT schemaname, relname, n_live_tup 
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC;
```

### Check active connections
```sql
SELECT pid, usename, datname, state, query_start, query 
FROM pg_stat_activity 
WHERE state = 'active';
```

### Database size
```sql
SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) 
FROM pg_database 
ORDER BY pg_database_size(pg_database.datname) DESC;
```

## Via Stubrix API

### List engines
```bash
curl -s http://localhost:9090/api/db/engines | jq .
```

### List databases (project-scoped)
```bash
curl -s "http://localhost:9090/api/db/databases?projectId={id}" | jq .
```

### Get database info
```bash
curl -s "http://localhost:9090/api/db/databases/{name}/info?projectId={id}" | jq .
```

### List snapshots
```bash
curl -s "http://localhost:9090/api/db/snapshots?projectId={id}" | jq .
```

## Via Docker

### Enter PostgreSQL shell
```bash
make postgres-psql
```

### Enter MySQL shell
```bash
make mysql-shell
```

### Check container logs
```bash
docker compose logs db-postgres --tail 50
docker compose logs db-mysql --tail 50
```
