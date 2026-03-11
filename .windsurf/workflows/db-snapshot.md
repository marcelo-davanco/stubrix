---
description: Create, list, restore and manage database snapshots using the Stubrix API or CLI
---

# Database Snapshot Workflow

## Prerequisites
- PostgreSQL running: `make postgres-up`
- API running: `npm run dev:api`

## Via API (curl)

### List available engines
// turbo
```bash
curl -s http://localhost:9090/api/db/engines | jq .
```

### List databases for an engine
```bash
curl -s "http://localhost:9090/api/db/engines/postgres/databases?projectId={projectId}" | jq .
```

### Create a snapshot
```bash
curl -s -X POST http://localhost:9090/api/db/engines/postgres/snapshots \
  -H "Content-Type: application/json" \
  -d '{"database": "postgres", "name": "my-snapshot", "projectId": "{projectId}"}' | jq .
```

### List snapshots
```bash
curl -s "http://localhost:9090/api/db/snapshots?projectId={projectId}" | jq .
```

### Restore a snapshot
```bash
curl -s -X POST http://localhost:9090/api/db/snapshots/my-snapshot/restore \
  -H "Content-Type: application/json" \
  -d '{"database": "postgres"}' | jq .
```

### Delete a snapshot
```bash
curl -s -X DELETE http://localhost:9090/api/db/snapshots/my-snapshot | jq .
```

## Via Dashboard UI
1. Open `http://localhost:5173`
2. Select a project
3. Navigate to **Databases** page
4. Select engine and database
5. Click **Create Snapshot** / **Restore** / **Delete**

## Via PostgreSQL MCP (direct inspection)
```sql
-- List all tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check row counts
SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables;
```

## Snapshot Files
- PostgreSQL dumps: `dumps/postgres/{name}.sql`
- Metadata: `dumps/.snapshot-metadata.json`
- Project configs: `dumps/.project-databases.json`

## Troubleshooting
- **pg_dump not found**: Install PostgreSQL client tools (`brew install postgresql@17`)
- **Connection refused**: Check `PG_HOST`, `PG_PORT` in `.env` and that container is running
- **Permission denied**: Check `PG_USER`, `PG_PASSWORD` match docker-compose environment
