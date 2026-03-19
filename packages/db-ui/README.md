# @stubrix/db-ui

Database management micro frontend for the Stubrix platform — React 19 + TailwindCSS.

## Overview

Standalone package containing all database UI: snapshot management, connection configs, and engine selection. Router-agnostic by design — consumed by `@stubrix/ui` as a single page component.

## Structure

```
src/
├── index.ts                  Public API — all exports
├── lib/
│   └── db-api.ts             Typed API client for /api/db endpoints
├── hooks/
│   └── useDbManager.ts       Central state hook
├── components/               Database widgets, forms, snapshot list
└── pages/
    └── DatabasesPage.tsx     Main entry page (exported)
```

## Public API

```typescript
import { DatabasesPage, useDbManager, dbApi } from '@stubrix/db-ui';
```

### DatabasesPage

Drop-in page component — no props required. Manages all internal state via `useDbManager`.

```tsx
// In @stubrix/ui App.tsx
<Route path="databases" element={<DatabasesPage />} />
```

### useDbManager

Central state hook for database operations.

```typescript
const {
  // State
  projects,
  selectedProjectId,
  setSelectedProjectId,
  engines,
  activeEngines,
  selectedEngine,
  setSelectedEngine,
  databases,
  loadingDatabases,
  snapshots,
  databaseInfo,
  loading,
  error,

  // Actions
  refreshAll,
  getDatabaseInfo,
  createSnapshot,
  restoreSnapshot,
  deleteSnapshot,
  saveProjectDatabaseConfig,
  deleteProjectDatabaseConfig,
} = useDbManager();
```

### dbApi

Typed API client for all `/api/db` endpoints.

```typescript
// Engines
await dbApi.getEngines()

// Databases
await dbApi.getDatabases(engine, projectId?, connectionId?)
await dbApi.getDatabaseInfo(name, engine, projectId?, connectionId?)

// Snapshots
await dbApi.getSnapshots(projectId?)
await dbApi.createSnapshot(engine, payload)
await dbApi.restoreSnapshot(engine, name, database, options)
await dbApi.deleteSnapshot(name)

// Project database configs
await dbApi.getProjectDatabaseConfigs(projectId)
await dbApi.upsertProjectDatabaseConfig(projectId, payload)
await dbApi.deleteProjectDatabaseConfig(projectId, id)
```

## API Endpoints Consumed

| Endpoint                                               | Description                  |
| ------------------------------------------------------ | ---------------------------- |
| `GET /api/db/engines`                                  | List available DB engines    |
| `GET /api/db/databases`                                | List databases for engine    |
| `GET /api/db/databases/:name`                          | Database info (tables, size) |
| `GET /api/db/snapshots`                                | List snapshots               |
| `POST /api/db/snapshots`                               | Create snapshot (pg_dump)    |
| `POST /api/db/snapshots/:name/restore`                 | Restore snapshot (psql)      |
| `DELETE /api/db/snapshots/:name`                       | Delete snapshot              |
| `GET /api/projects/:id/databases/configs`              | Project DB configs           |
| `PUT /api/projects/:id/databases/configs`              | Upsert project DB config     |
| `DELETE /api/projects/:id/databases/configs/:configId` | Delete DB config             |
| `GET /api/projects`                                    | List projects (for selector) |

## Development

```bash
# From monorepo root
npm run build:db-ui     # TypeScript compile
```

## Dependencies

- `@stubrix/shared` — shared TypeScript types
- `react` ^19, `react-dom` ^19 (peer)
- `lucide-react` — icons
- `tailwind-merge`, `clsx` — class utilities
