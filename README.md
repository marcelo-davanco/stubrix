# Stubrix

![Stubrix Logo](assets/logo.png)

## Advanced API Engineering, Mocking & Developer Productivity Platform

[![GitHub](https://img.shields.io/github/stars/marcelo-davanco/stubrix?style=social)](https://github.com/marcelo-davanco/stubrix)
[![Latest Release](https://img.shields.io/github/v/release/marcelo-davanco/stubrix)](https://github.com/marcelo-davanco/stubrix/releases)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Stubrix** is a unified hub for simulation, testing, and observability of APIs and microservices throughout the entire development lifecycle. From basic mocking to distributed tracing, contract testing, chaos engineering, event-driven simulation, and cloud service mocking — all in a single platform, running locally with Docker.

> **"Eliminates the 'works on my machine' problem"** — simulate AWS, Kafka, PostgreSQL, gRPC, GraphQL, Keycloak and any REST API locally with full fidelity.

---

## 🏆 What makes Stubrix different

Stubrix covers the full API development lifecycle in a single tool — no stitching together five different platforms:

| Capability                | What it does                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dual Mock Engine**      | WireMock (Java) or Mockoon (Node.js) — same mocks, zero lock-in, one command to switch                                                     |
| **Multi-Protocol**        | REST, GraphQL, gRPC, WebSockets, Kafka, RabbitMQ — all mockable in one place                                                               |
| **Contract Testing**      | Pact Broker integration — verify that producer and consumer contracts match before deploying                                               |
| **Chaos & Resilience**    | Fault injection (latency, errors, payload corruption) + Toxiproxy network-level chaos                                                      |
| **Cloud Simulation**      | LocalStack for AWS (S3, SQS, SNS, DynamoDB, Lambda) — zero cloud cost during development                                                   |
| **Object Storage**        | MinIO (S3-compatible) — store large mock bodies and database snapshot archives                                                             |
| **Distributed Tracing**   | Jaeger + OpenTelemetry — follow a request across services during local testing                                                             |
| **Prometheus Metrics**    | Built-in metrics exposition + Grafana dashboards — observe the mock server itself                                                          |
| **Performance Testing**   | k6 scripts (smoke, load, stress) with baseline regression CI gate                                                                          |
| **Identity & Access**     | Keycloak and Zitadel — real OAuth2/OIDC token flows locally                                                                                |
| **AI-Native (MCP)**       | 3 MCP servers with **100+ tools** — manage everything from your AI coding assistant                                                        |
| **Database Snapshots**    | PostgreSQL `pg_dump`/`psql`, MySQL `mysqldump`, SQLite, MongoDB `mongodump`/`mongorestore` — snapshot and restore DB state alongside mocks |
| **Service Control Panel** | Enable/disable 24 infrastructure services, configure, backup and restore all settings — no manual Docker commands                          |
| **Visual Control Panel**  | NestJS 11 API + React 19 Dashboard — no CLI-only workflows                                                                                 |

---

## Requirements

- **Node.js 24** + npm 10+
- **Docker** (required for mock engines, databases, and infrastructure services)
- `pg_dump` / `psql` (optional, for real PostgreSQL snapshot/restore)

---

## 🏗️ Architecture Overview

Stubrix is a **monorepo** (npm workspaces) built on three core layers:

```
┌─────────────────────────────────────────────────────────────────┐
│  Developer Interfaces                                           │
│  React 19 Dashboard │ CLI (@stubrix/cli) │ VS Code Extension   │
│  AI Assistants via MCP (Windsurf, Cursor, Claude)              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────▼──────────────────────────────────────┐
│  @stubrix/api — NestJS 11 Control Plane (port 9090)            │
│                                                                 │
│  Core: projects · mocks · recording · logs · databases         │
│  Quality: governance · coverage · contracts · chaos            │
│  Intelligence: AI/RAG · stateful mocks · time machine         │
│  Protocols: GraphQL · gRPC · webhooks · events (Kafka/MQ)     │
│  Enterprise: auth/RBAC · templates · multi-tenancy            │
│  Observability: metrics · tracing · performance testing       │
│  Cloud: LocalStack · MinIO · Keycloak · Zitadel               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Docker profiles
┌──────────────────────────▼──────────────────────────────────────┐
│  Infrastructure Layer (20+ Docker profiles)                    │
│                                                                 │
│  Mock Engines: WireMock · Mockoon                              │
│  Databases: PostgreSQL · MySQL · SQLite · MongoDB              │
│  Messaging: Kafka (Redpanda) · RabbitMQ                        │
│  Protocols: GripMock (gRPC)                                    │
│  Cloud: LocalStack · MinIO · Keycloak · Zitadel               │
│  Observability: Prometheus · Grafana · Jaeger                  │
│  Chaos: Toxiproxy                                              │
│  Contracts: Pact Broker                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Monorepo packages

| Package                     | Description                                                 |
| --------------------------- | ----------------------------------------------------------- |
| `@stubrix/api`              | NestJS 11 control plane — 28 modules, REST API + WebSockets |
| `@stubrix/ui`               | React 19 + Vite 7 dashboard host                            |
| `@stubrix/mock-ui`          | Mock server microfrontend                                   |
| `@stubrix/db-ui`            | Database management microfrontend                           |
| `@stubrix/shared`           | TypeScript types shared across all packages                 |
| `@stubrix/cli`              | Standalone CLI (`stubrix` binary)                           |
| `@stubrix/vscode-extension` | VS Code sidebar + commands                                  |
| `stubrix-mcp`               | MCP server — full Stubrix API (100+ tools)                  |
| `wiremock-mcp`              | MCP server — WireMock Admin API (16 tools)                  |
| `docker-mcp`                | MCP server — Docker Compose management (12 tools)           |

---

## 📂 Project Structure

```text
stubrix/
├── packages/
│   ├── shared/              @stubrix/shared — TypeScript types
│   ├── api/                 @stubrix/api — NestJS 11 (27 modules)
│   │   └── src/
│   │       ├── projects/      Project CRUD
│   │       ├── mocks/         Mock CRUD + WireMock integration
│   │       ├── recording/     Traffic recording (4 modes)
│   │       ├── logs/          REST + WebSocket (Socket.IO)
│   │       ├── databases/     Snapshot/restore + project DB configs
│   │       ├── stateful-mocks/ Stateful scenario machine
│   │       ├── import/        HAR, Postman, Insomnia, OpenAPI import
│   │       ├── governance/    Spectral OpenAPI linting
│   │       ├── coverage/      Mock hit/miss coverage analysis
│   │       ├── intelligence/  AI/RAG (ChromaDB + OpenAI)
│   │       ├── scenarios/     Time machine: capture & restore state
│   │       ├── contracts/     Pact Broker contract testing
│   │       ├── chaos/         Fault injection (latency, errors)
│   │       ├── chaos-network/ Toxiproxy network chaos
│   │       ├── webhooks/      Webhook receiver, replay, simulator
│   │       ├── events/        Kafka + RabbitMQ event publishing
│   │       ├── protocols/     GraphQL SDL + gRPC via GripMock
│   │       ├── auth/          API keys, RBAC, multi-tenancy
│   │       ├── templates/     Environment templates with variable substitution
│   │       ├── metrics/       Prometheus + app metrics
│   │       ├── performance/   k6 test runner + baselines
│   │       ├── tracing/       Jaeger + OpenTelemetry
│   │       ├── cloud/         LocalStack AWS integration
│   │       ├── storage/       MinIO object storage
│   │       ├── iam/           Keycloak + Zitadel IAM
│   │       └── settings/      Service control panel (F34)
│   ├── ui/                  @stubrix/ui — React 19 + Vite 7 host
│   ├── mock-ui/             @stubrix/mock-ui — Mock management microfrontend
│   ├── db-ui/               @stubrix/db-ui — Database management microfrontend
│   ├── cli/                 @stubrix/cli — Standalone CLI binary
│   ├── vscode-extension/    VS Code / Windsurf sidebar extension
│   └── mcp/
│       ├── stubrix-mcp/       MCP server — full Stubrix API
│       ├── wiremock-mcp/      MCP server — WireMock Admin API
│       └── docker-mcp/        MCP server — Docker Compose
├── mocks/
│   ├── mappings/            WireMock route definitions (JSON)
│   ├── __files/             Response body files
│   └── proto/               gRPC .proto files + stubs
├── scripts/                 Converter, entrypoint, recording helpers
├── config/                  Prometheus, Grafana configs
├── Dockerfile               Multi-engine Docker image (WireMock/Mockoon)
├── Dockerfile.api           NestJS API + React build
├── docker-compose.yml       20+ profiles
└── Makefile                 CLI shortcuts (60+ targets)
```

---

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone https://github.com/marcelo-davanco/stubrix.git
cd stubrix
npm install
```

### 2. Build shared packages

```bash
npm run build:shared
npm run build:db-ui
npm run build:mock-ui
```

### 3. Start services

```bash
# Option A: Docker (recommended for production-like setup)
make wiremock            # WireMock + PostgreSQL + Control Plane

# Option B: Local development
npm run dev -w @stubrix/api    # API on :9090
npm run dev -w @stubrix/ui     # UI on :5173
```

### 4. Open the dashboard

```
http://localhost:9090          # Production (Docker)
http://localhost:5173          # Development (Vite)
```

---

## 🐳 Docker Compose Profiles

### Mock Engines

| Profile           | Service             | Port  | Command                |
| ----------------- | ------------------- | ----- | ---------------------- |
| `wiremock`        | WireMock (serve)    | :8081 | `make wiremock`        |
| `wiremock-record` | WireMock (record)   | :8081 | `make wiremock-record` |
| `mockoon`         | Mockoon CLI (serve) | :8081 | `make mockoon`         |
| `mockoon-proxy`   | Mockoon (proxy)     | :8081 | `make mockoon-proxy`   |

### Databases

| Profile       | Service        | Port   | Command               |
| ------------- | -------------- | ------ | --------------------- |
| `postgres`    | PostgreSQL 17  | :5442  | `make postgres`       |
| `mysql`       | MySQL 8        | :3307  | `make mysql`          |
| `mongodb`     | MongoDB        | :27017 | `make mongodb`        |
| `adminer`     | Adminer UI     | :8084  | `make adminer-up`     |
| `cloudbeaver` | CloudBeaver UI | :8083  | `make cloudbeaver-up` |

### Messaging & Protocols

| Profile    | Service          | Port           | Command         |
| ---------- | ---------------- | -------------- | --------------- |
| `kafka`    | Redpanda (Kafka) | :9092 / :8082  | `make kafka`    |
| `rabbitmq` | RabbitMQ         | :5672 / :15672 | `make rabbitmq` |
| `gripmock` | GripMock (gRPC)  | :4770 / :4771  | `make gripmock` |

### Quality & Contracts

| Profile | Service     | Port  | Command     |
| ------- | ----------- | ----- | ----------- |
| `pact`  | Pact Broker | :9292 | `make pact` |

### Observability

| Profile      | Service    | Port           | Command        |
| ------------ | ---------- | -------------- | -------------- |
| `monitoring` | Prometheus | :9091          | `make prom`    |
| `monitoring` | Grafana    | :3000          | `make grafana` |
| `jaeger`     | Jaeger     | :16686 / :4318 | `make jaeger`  |

### Cloud & Infrastructure

| Profile      | Service    | Port          | Command           |
| ------------ | ---------- | ------------- | ----------------- |
| `localstack` | LocalStack | :4566         | `make localstack` |
| `minio`      | MinIO      | :9000 / :9001 | `make minio`      |
| `keycloak`   | Keycloak   | :8180         | `make keycloak`   |
| `zitadel`    | Zitadel    | :8085         | `make zitadel`    |
| `redis`      | Redis      | :6379         | `make redis`      |
| `toxiproxy`  | Toxiproxy  | :8474         | `make toxiproxy`  |
| `hoppscotch` | Hoppscotch | :3100         | `make hoppscotch` |

---

## 🧪 Testing

```bash
# Unit tests (API)
npm run test -w @stubrix/api

# Build all packages
npm run build

# Lint + format
npm run lint
npm run format
```

---

## 🔌 API Quick Reference

### Projects & Mocks

```bash
# List projects
curl http://localhost:9090/api/projects

# Create a mock
curl -X POST http://localhost:9090/api/projects/:id/mocks \
  -H 'Content-Type: application/json' \
  -d '{"request":{"method":"GET","url":"/api/hello"},"response":{"status":200,"body":"{\"msg\":\"hi\"}"}}'

# Start recording
curl -X POST http://localhost:9090/api/recording/start \
  -d '{"targetUrl":"https://pokeapi.co/api/v2","projectId":"..."}'
```

### Import (HAR, Postman, OpenAPI)

```bash
# Import HAR file
curl -X POST http://localhost:9090/api/import/har \
  -F 'file=@recording.har' -F 'projectId=...'

# Import Postman collection
curl -X POST http://localhost:9090/api/import/postman \
  -F 'file=@collection.json' -F 'projectId=...'
```

### Contracts (Pact)

```bash
make pact
# POST /api/contracts/publish   — publish pact file
# POST /api/contracts/verify    — verify consumer contract
# GET  /api/contracts/matrix    — compatibility matrix
```

### Chaos Engineering

```bash
# Fault injection (API-level)
curl -X POST http://localhost:9090/api/chaos/rules \
  -d '{"name":"slow-payments","pathPattern":"/api/payments/**","latencyMs":2000,"errorRate":0.3}'

# Network chaos (Toxiproxy)
make toxiproxy
# POST /api/chaos-network/proxies — create proxy
# POST /api/chaos-network/proxies/:name/toxics — add toxic (latency, timeout, etc.)
```

### Events (Kafka + RabbitMQ)

```bash
make kafka     # or: make rabbitmq
# POST /api/events/publish    — publish event to topic/queue
# GET  /api/events/health     — broker health status
```

### Cloud & Storage

```bash
make localstack
# POST /api/cloud/s3/buckets          — create S3 bucket
# POST /api/cloud/sqs/queues          — create SQS queue
# POST /api/cloud/sns/publish          — publish SNS message

make minio
# POST /api/storage/upload-mock-body   — upload file to MinIO
# POST /api/storage/archive-snapshot   — archive DB snapshot
```

### Identity & Access Management

```bash
make keycloak   # or: make zitadel
# POST /api/iam/token/password           — resource owner password grant
# POST /api/iam/token/client-credentials — service account token
# POST /api/iam/token/introspect         — validate token claims
```

### Database Snapshots (F3/F29)

Snapshot and restore database state alongside mocks:

```bash
make postgres
# POST /api/db/engines/postgres/snapshots       — create snapshot (pg_dump)
# POST /api/db/snapshots/:name/restore           — restore snapshot (psql)
# GET  /api/db/snapshots?projectId=...           — list project snapshots
```

### Service Control Panel (F34)

Enable, disable, configure and health-check any of the 24 Docker services from the dashboard or API — no manual `docker compose` commands:

```bash
# Via Settings dashboard: http://localhost:9090/settings

# Via API
curl -X POST http://localhost:9090/api/settings/services/postgres/enable
curl -X POST http://localhost:9090/api/settings/services/postgres/disable
curl http://localhost:9090/api/settings/services            # list all + health status
curl http://localhost:9090/api/settings/backups             # list config backups
curl -X POST http://localhost:9090/api/settings/backups     # create backup
```

All service configuration is stored in `data/stubrix-config.db` (SQLite) with AES-256-GCM encryption for sensitive values.

---

## 🤖 MCP Ecosystem

Stubrix ships **3 MCP servers** with **100+ tools**, enabling AI coding assistants (Windsurf, Cursor, Claude) to manage the entire platform from the IDE.

### Setup

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "stubrix-mcp": {
      "command": "node",
      "args": ["packages/mcp/stubrix-mcp/src/index.js"],
      "env": { "STUBRIX_API_URL": "http://localhost:9090" }
    },
    "wiremock-mcp": {
      "command": "node",
      "args": ["packages/mcp/wiremock-mcp/src/index.js"],
      "env": { "WIREMOCK_URL": "http://localhost:8081" }
    },
    "docker-mcp": {
      "command": "node",
      "args": ["packages/mcp/docker-mcp/src/index.js"],
      "env": { "COMPOSE_PROJECT_DIR": "/path/to/stubrix" }
    }
  }
}
```

### What your AI can do

```
"Record mocks from the staging API for /api/users and /api/orders"
→ docker_compose_up(["wiremock-record"]) + stubrix_start_recording(...)

"Take a PostgreSQL snapshot before running migrations"
→ stubrix_create_snapshot({ engine: "postgres", projectId: "..." })

"Check if Kafka and gRPC are healthy"
→ event_health() + protocol_grpc_health()

"Get a Keycloak token for user admin"
→ iam_get_token({ username: "admin", password: "..." })

"Run a load test and compare with last baseline"
→ perf_list_scripts() + perf_compare_baseline({ id: "..." })

"Lint the OpenAPI spec for violations"
→ lint_spec({ content: "..." })

"Inject 500ms latency into the payments service"
→ toxiproxy proxy + toxic setup via chaos_network_* tools
```

### Tool coverage by domain

| Domain             | Tools                                                                          |
| ------------------ | ------------------------------------------------------------------------------ |
| Projects & Mocks   | `stubrix_list_projects`, `stubrix_create_mock`, `stubrix_start_recording`, ... |
| Database Snapshots | `stubrix_create_snapshot`, `stubrix_restore_snapshot`, ...                     |
| Contracts          | `contract_publish`, `contract_verify`                                          |
| Chaos              | `chaos_list_rules`, `chaos_create_rule`, `chaos_network_*`                     |
| Events             | `event_publish`, `event_template_*`, `event_health`                            |
| Protocols          | `protocol_graphql_parse`, `protocol_grpc_mock`, ...                            |
| Auth               | `auth_create_user`, `auth_validate_key`, `auth_audit_log`                      |
| Metrics            | `metrics_health`, `metrics_summary`                                            |
| Performance        | `perf_list_scripts`, `perf_save_baseline`, `perf_compare_baseline`             |
| Tracing            | `tracing_list`, `tracing_health`, `tracing_config`                             |
| Cloud (AWS)        | `cloud_health`, `cloud_s3_*`, `cloud_sns_publish`                              |
| Storage (MinIO)    | `storage_health`, `storage_upload_mock_body`, `storage_archive_snapshot`       |
| IAM                | `iam_health`, `iam_get_token`, `iam_introspect_token`                          |
| Governance         | `lint_spec`                                                                    |
| Docker             | `docker_compose_up`, `docker_logs`, `docker_health`, ...                       |

---

## ⚙️ Environment Variables

See `.env.example` for the full reference. Key variables:

| Variable              | Default                 | Description                      |
| --------------------- | ----------------------- | -------------------------------- |
| `MOCK_PORT`           | `8081`                  | Mock server port                 |
| `PROXY_TARGET`        | —                       | Real API URL for recording/proxy |
| `MOCK_ENGINE`         | `wiremock`              | `wiremock` or `mockoon`          |
| `CONTROL_PORT`        | `9090`                  | NestJS API port                  |
| `PG_HOST` / `PG_PORT` | `localhost:5442`        | PostgreSQL connection            |
| `LOCALSTACK_URL`      | `http://localhost:4566` | LocalStack endpoint              |
| `MINIO_URL`           | `http://localhost:9000` | MinIO endpoint                   |
| `KEYCLOAK_URL`        | `http://localhost:8180` | Keycloak endpoint                |
| `PROMETHEUS_PORT`     | `9091`                  | Prometheus port                  |
| `JAEGER_UI_PORT`      | `16686`                 | Jaeger UI port                   |
| `OTEL_ENDPOINT`       | `http://localhost:4318` | OpenTelemetry HTTP endpoint      |

---

## 📖 API Documentation

The full OpenAPI spec is available at **`http://localhost:9090/api/docs`** (Swagger UI) when the API is running.

All 27 modules are documented with request/response schemas, organized by tag:

`projects` · `mocks` · `recording` · `import` · `databases` · `governance` · `coverage` · `stateful-mocks` · `intelligence` · `scenarios` · `contracts` · `chaos` · `chaos-network` · `webhooks` · `events` · `protocols` · `auth` · `templates` · `metrics` · `performance` · `tracing` · `cloud` · `storage` · `iam` · `status`

---

## 🗺️ Roadmap (Releases)

| Version    | Milestone             | Key Features                                                                       |
| ---------- | --------------------- | ---------------------------------------------------------------------------------- |
| v1.3.1     | Foundation            | WireMock/Mockoon dual engine, recording, dashboard, DB snapshots, MCP servers      |
| v1.4.0     | Stateful Mocking      | Stateful mock scenarios, Adminer/CloudBeaver DB viewers                            |
| v1.5.0     | API Clients           | HAR/Postman/OpenAPI import, Bruno tests, Hoppscotch                                |
| v1.6.0     | Governance            | Spectral OpenAPI linting, mock coverage analysis                                   |
| v1.7.0     | Intelligence          | AI/RAG mock generation (ChromaDB), Time Machine scenarios                          |
| v1.8.0     | Contracts & Chaos     | Pact Broker, fault injection, Toxiproxy network chaos                              |
| v1.9.0     | CLI & Automation      | `@stubrix/cli` standalone binary, Makefile automation                              |
| v2.0.0     | Multi-Protocol        | GraphQL/gRPC mocking, Kafka/RabbitMQ event simulation, webhooks                    |
| v2.1.0     | Enterprise            | Auth/RBAC/multi-tenancy, VS Code extension, environment templates                  |
| v2.2.0     | Observability         | Prometheus/Grafana metrics, k6 performance testing, Jaeger tracing                 |
| v2.3.0     | Cloud & Storage       | LocalStack AWS, MinIO object storage, Keycloak/Zitadel IAM                         |
| v2.4.0     | Micro Frontends       | `@stubrix/mock-ui` and `@stubrix/db-ui` extracted as standalone packages           |
| v2.5.0     | Service Control Panel | Enable/disable 24 services via dashboard, health monitoring, config backup         |
| **v2.6.0** | **Proto & Stubs**     | **gRPC proto file editor, live GripMock stub management, container runtime fixes** |

---

## 🧩 IDE Extension (VS Code / Windsurf)

The `stubrix-vscode` extension adds a sidebar with Mocks, Status, and Scenarios views, plus commands for engine control, scenario capture, and health check.

### One-time setup — add Windsurf CLI to PATH

The Windsurf CLI binary is **not** added to `PATH` automatically on macOS:

```bash
echo 'export PATH="$PATH:/Applications/Windsurf.app/Contents/Resources/app/bin"' >> ~/.zshrc
source ~/.zshrc
windsurf --version   # → 1.108.x
```

### Install

```bash
make windsurf-install   # package .vsix + install in Windsurf
make vscode-install     # package .vsix + install in VS Code
```

Or via UI: `Cmd+Shift+P → Extensions: Install from VSIX...` → select `packages/vscode-extension/stubrix-vscode-X.Y.Z.vsix`.

### Configuration

```json
{
  "stubrix.apiUrl": "http://localhost:9090"
}
```

> Full reference: [`packages/vscode-extension/README.md`](packages/vscode-extension/README.md)

---

## 📚 Guides

| Guide                                                                        | Description                                          |
| ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| [Recording with PokéAPI](docs/guide-pokeapi-recording.md)                    | Record PokéAPI mocks, serve offline, use via Postman |
| [`packages/api/API.md`](packages/api/API.md)                                 | Full NestJS API module reference                     |
| [`packages/vscode-extension/README.md`](packages/vscode-extension/README.md) | Extension install + Windsurf CLI PATH setup          |

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

**Stubrix** — made with ☕ by [Marcelo Davanço](https://github.com/marcelo-davanco)
