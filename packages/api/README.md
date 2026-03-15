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
| Service config | SQLite (`data/stubrix-config.db`) via better-sqlite3 |

## Module Structure

```
src/
├── projects/         Project CRUD
├── mocks/            Mock CRUD — WireMock mappings/*.json
├── recording/        Start/stop/snapshot (4 modes) + pattern filters
├── logs/             REST + WebSocket — Socket.IO namespace /ws/logs
├── status/           Engine health + mock counts
├── engine/           WireMock reset + engine info
├── databases/        Engines, databases, snapshots, project DB configs
├── import/           HAR, Postman, OpenAPI universal importer
├── governance/       Spectral OpenAPI linting
├── coverage/         Mock hit/miss analysis
├── intelligence/     AI/RAG (ChromaDB + OpenAI/Ollama)
├── stateful-mocks/   Stateful scenario machine (Handlebars)
├── scenarios/        Time machine: capture & restore state
├── contracts/        Pact Broker contract testing
├── chaos/            Fault injection (latency, errors, corruption)
├── chaos-network/    Toxiproxy network-level chaos
├── webhooks/         Webhook receiver, replay, simulator
├── events/           Kafka (Redpanda) + RabbitMQ publishing
├── protocols/        GraphQL SDL parse + gRPC via GripMock
├── auth/             API keys, RBAC, multi-tenancy, audit
├── templates/        Environment templates + variable substitution
├── metrics/          Prometheus exposition endpoint
├── performance/      k6 scripts + baseline regression gate
├── tracing/          Jaeger/OpenTelemetry distributed tracing
├── cloud/            LocalStack AWS mocking (S3, SQS, SNS, DynamoDB, Lambda)
├── storage/          MinIO object storage
├── iam/              Keycloak + Zitadel IAM integration
└── settings/
    ├── database/     SQLite config DB (better-sqlite3)
    ├── registry/     24-service registry + category definitions
    ├── lifecycle/    Enable/disable via Docker Compose + health monitoring
    ├── config/       Per-service CRUD config + AES-256-GCM encryption
    ├── backup/       Config backup + restore
    └── import-export/ JSON/YAML selective import/export
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

### Settings & Services

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/settings/services` | List all services with status + health |
| GET | `/api/settings/services/:id` | Get service details |
| POST | `/api/settings/services/:id/enable` | Enable service (starts container) |
| POST | `/api/settings/services/:id/disable` | Disable service (stops container) |
| PATCH | `/api/settings/services/:id` | Update service config (autoStart, etc.) |
| GET | `/api/settings/services/:id/config` | Get service configuration |
| PUT | `/api/settings/services/:id/config` | Save service configuration |
| GET | `/api/settings/backups` | List config backups |
| POST | `/api/settings/backups` | Create config backup |
| POST | `/api/settings/backups/:id/restore` | Restore config backup |
| DELETE | `/api/settings/backups/:id` | Delete backup |
| GET | `/api/settings/export` | Export all config (JSON/YAML) |
| POST | `/api/settings/import` | Import config from file |

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
CONTROL_PORT=9090          # API + UI port (env var read by main.ts)
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

See root `.env.example` for the full reference (LocalStack, MinIO, Kafka, Keycloak, etc.).

## Development

```bash
# From monorepo root
npm run dev:api        # Watch mode on :9090
npm run build:api      # Production build (nest build)

# Docker (production)
make stubrix-build     # Build Dockerfile.api image
make stubrix-up        # Run containerized API + UI
make stubrix-logs      # Tail logs
make stack-up          # Full stack: API + WireMock + PostgreSQL

# From packages/api
npm run start:dev      # Watch mode
npm run test           # Unit tests
npm run test:cov       # Coverage report
```

## Build Output

Production build goes to `dist/`. The UI build (`npm run build:ui`) copies the Vite output to `packages/api/public/` for single-container serving.

## Interactive Docs

Swagger UI available at `http://localhost:9090/api/docs` when running in development mode.
