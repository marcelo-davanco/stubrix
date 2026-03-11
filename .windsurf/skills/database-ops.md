---
description: Expert guidance for database operations including snapshots, restores, multi-engine management and SQL queries in Stubrix
---

# Database Operations — Stubrix

## When to use
- Creating or restoring database snapshots
- Inspecting database state, schemas, or data
- Adding new database engine drivers
- Managing project-scoped database configurations
- Debugging database connectivity or snapshot failures

## Multi-Engine Architecture

### Driver Interface
Each database engine implements a common driver interface:
- `listDatabases(projectId?)` — list available databases
- `getDatabaseInfo(name, projectId?)` — schema/table info
- `createSnapshot(database, name, projectId?)` — dump database
- `restoreSnapshot(name, database, projectId?)` — restore from dump

### Engine Status
| Engine | List/Info | Snapshot | Restore |
|--------|-----------|----------|---------|
| PostgreSQL | Real | Real (pg_dump) | Real (psql) |
| MySQL | Real | Placeholder | Placeholder |
| SQLite | Real | Placeholder | Placeholder |

## API Routes

### Engine Discovery
```
GET /api/db/engines                              → list all engines
GET /api/db/databases?projectId=...              → list databases (all engines)
GET /api/db/engines/:engine/databases?projectId=... → list by engine
GET /api/db/databases/:name/info?projectId=...   → database details
```

### Snapshot Management
```
GET  /api/db/snapshots?projectId=...             → list snapshots
POST /api/db/snapshots                           → create snapshot
POST /api/db/engines/:engine/snapshots           → create for engine
POST /api/db/snapshots/:name/restore             → restore snapshot
DELETE /api/db/snapshots/:name                   → delete snapshot
PATCH /api/db/snapshots/:name                    → update metadata
```

### Project Database Configs
```
GET    /api/projects/:projectId/databases/configs      → list configs
GET    /api/projects/:projectId/databases/configs/:id  → get config
POST   /api/projects/:projectId/databases/configs      → create config
DELETE /api/projects/:projectId/databases/configs/:id  → delete config
```

## Persistence Files
- `dumps/.snapshot-metadata.json` — snapshot metadata (name, engine, projectId, timestamp)
- `dumps/.project-databases.json` — project-scoped database configurations
- `dumps/postgres/*.sql` — PostgreSQL dump files
- `dumps/mysql/*.sql` — MySQL dump files  
- `dumps/sqlite/*.db` — SQLite database copies

## PostgreSQL Operations

### Snapshot (pg_dump)
```bash
pg_dump --clean --if-exists --file dumps/postgres/{name}.sql {database}
```
Environment: `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`

### Restore (psql)
```bash
psql --file dumps/postgres/{name}.sql {database}
```

### Direct Query (via MCP)
Use the PostgreSQL MCP server for direct queries:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

## Docker Setup
- PostgreSQL: `make postgres-up` (port 5442 by default)
- MySQL: `make mysql-up` (port 3307 by default)
- SQLite: file-based, no container needed
- Both: `make all-up`

## Adding a New Engine Driver
1. Create driver file: `src/databases/drivers/{engine}.driver.ts`
2. Implement the driver interface methods
3. Register in the driver factory
4. Add Docker Compose service with profile
5. Add Makefile targets
6. Update `.env.example` with connection vars
7. Add engine to db-ui engine selector

## MCP Tools to Use
- **PostgreSQL MCP**: `query()` for direct SQL against running PostgreSQL
- **Sequential Thinking**: for planning multi-engine operations
- **Memory MCP**: track snapshot state and database configurations
