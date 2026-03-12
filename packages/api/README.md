# @stubrix/api

NestJS 11 control plane for the Stubrix mock server platform.

## Overview

Provides the REST API and WebSocket server that powers the Stubrix dashboard. Manages projects, mock mappings, traffic recording, real-time logs, engine control, and database snapshot operations.

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Framework | NestJS 11 + Express |
| WebSockets | Socket.IO (`/ws/logs`) |
| Validation | class-validator + class-transformer |
| Persistence | JSON files (mocks/projects), filesystem (snapshots) |
| Database ops | pg_dump/psql (PostgreSQL), driver pattern (MySQL/SQLite) |

## Module Structure

```
src/
├── projects/         Project CRUD — JSON persistence in data/projects.json
├── mocks/            Mock CRUD — reads/writes WireMock mappings/*.json
├── recording/        Start/stop/snapshot — calls WireMock /__admin/recording
├── logs/             REST + WebSocket — Socket.IO namespace /ws/logs
├── status/           Engine health + mock counts by project
├── engine/           WireMock reset + engine info
└── databases/        Engines, databases, snapshots, project DB configs
```

## API Reference

### Projects

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/projects` | List all projects |
| GET | `/api/projects/:id` | Get project by ID |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Mocks

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/projects/:id/mocks` | List mocks for project |
| GET | `/api/projects/:id/mocks/:mockId` | Get mock detail |
| POST | `/api/projects/:id/mocks` | Create mock mapping |
| PUT | `/api/projects/:id/mocks/:mockId` | Update mock mapping |
| DELETE | `/api/projects/:id/mocks/:mockId` | Delete mock mapping |

### Recording

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/projects/:id/recording/status` | Recording status |
| POST | `/api/projects/:id/recording/start` | Start recording |
| POST | `/api/projects/:id/recording/stop` | Stop and save mocks |
| POST | `/api/projects/:id/recording/snapshot` | Take snapshot |

### Status & Engine

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/status` | Engine status + mock counts by project |
| GET | `/api/engine` | Engine name, port, health |
| POST | `/api/engine/reset` | Reset WireMock state |

### Logs

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/logs` | Recent request logs |
| WS | `/ws/logs` | Real-time log stream (Socket.IO) |

### Databases

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/db/engines` | List available DB engines |
| GET | `/api/db/databases` | List databases for engine |
| GET | `/api/db/databases/:name` | Database info |
| GET | `/api/db/snapshots` | List snapshots |
| POST | `/api/db/snapshots` | Create snapshot |
| POST | `/api/db/snapshots/:name/restore` | Restore snapshot |
| DELETE | `/api/db/snapshots/:name` | Delete snapshot |
| GET | `/api/projects/:id/databases/configs` | Project DB configs |
| PUT | `/api/projects/:id/databases/configs` | Upsert project DB config |
| DELETE | `/api/projects/:id/databases/configs/:configId` | Delete DB config |

## Environment Variables

```dotenv
PORT=9090
MOCK_ENGINE=wiremock       # wiremock | mockoon
MOCK_PORT=8081
WIREMOCK_URL=http://localhost:8081
CORS_ORIGIN=*

# PostgreSQL
PG_HOST=localhost
PG_PORT=5442
PG_USER=postgres
PG_PASSWORD=postgres
PG_DATABASE=postgres

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3307
MYSQL_USER=stubrix
MYSQL_PASSWORD=stubrix
MYSQL_DATABASE=stubrix

# SQLite
SQLITE_DB_PATH=

# Snapshots
DUMPS_DIR=./dumps
```

## Development

```bash
# From monorepo root
npm run dev:api        # Watch mode on :9090
npm run build:api      # Production build (nest build)

# From packages/api
npm run start:dev      # Watch mode
npm run test           # Unit tests
npm run test:cov       # Coverage report
```

## Build Output

Production build goes to `dist/`. The UI build (`npm run build:ui`) copies the Vite output to `packages/api/public/` for single-container serving.

## Interactive Docs

Swagger UI available at `http://localhost:9090/api/docs` when running in development mode.
