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

| Capability | What it does |
|---|---|
| **Dual Mock Engine** | WireMock (Java) or Mockoon (Node.js) — same mocks, zero lock-in, one command to switch |
| **Multi-Protocol** | REST, GraphQL, gRPC, WebSockets, Kafka, RabbitMQ — all mockable in one place |
| **Contract Testing** | Pact Broker integration — verify that producer and consumer contracts match before deploying |
| **Chaos & Resilience** | Fault injection (latency, errors, payload corruption) + Toxiproxy network-level chaos |
| **Cloud Simulation** | LocalStack for AWS (S3, SQS, SNS, DynamoDB, Lambda) — zero cloud cost during development |
| **Object Storage** | MinIO (S3-compatible) — store large mock bodies and database snapshot archives |
| **Distributed Tracing** | Jaeger + OpenTelemetry — follow a request across services during local testing |
| **Prometheus Metrics** | Built-in metrics exposition + Grafana dashboards — observe the mock server itself |
| **Performance Testing** | k6 scripts (smoke, load, stress) with baseline regression CI gate |
| **Identity & Access** | Keycloak and Zitadel — real OAuth2/OIDC token flows locally |
| **AI-Native (MCP)** | 3 MCP servers with **100+ tools** — manage everything from your AI coding assistant |
| **Database Snapshots** | PostgreSQL `pg_dump`/`psql`, MySQL `mysqldump`, SQLite, MongoDB `mongodump`/`mongorestore` — snapshot and restore DB state alongside mocks |
| **Visual Control Panel** | NestJS 11 API + React 19 Dashboard — no CLI-only workflows |

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

| Package | Description |
|---------|-------------|
| `@stubrix/api` | NestJS 11 control plane — 27 modules, REST API + WebSockets |
| `@stubrix/ui` | React 19 + Vite 7 dashboard host |
| `@stubrix/mock-ui` | Mock server microfrontend |
| `@stubrix/db-ui` | Database management microfrontend |
| `@stubrix/shared` | TypeScript types shared across all packages |
| `@stubrix/cli` | Standalone CLI (`stubrix` binary) |
| `@stubrix/vscode-extension` | VS Code sidebar + commands |
| `stubrix-mcp` | MCP server — full Stubrix API (100+ tools) |
| `wiremock-mcp` | MCP server — WireMock Admin API (16 tools) |
| `docker-mcp` | MCP server — Docker Compose management (12 tools) |

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
│   │       ├── metrics/       Prometheus metrics exposition
│   │       ├── performance/   k6 scripts + baseline regression gate
│   │       ├── tracing/       Jaeger/OpenTelemetry distributed tracing
│   │       ├── cloud/         LocalStack AWS mocking (S3, SQS, SNS...)
│   │       ├── storage/       MinIO object storage
│   │       └── iam/           Keycloak + Zitadel IAM integration
│   ├── ui/                  @stubrix/ui — React 19 + Vite 7 dashboard
│   ├── mock-ui/             @stubrix/mock-ui — Mock server microfrontend
│   ├── db-ui/               @stubrix/db-ui — Database microfrontend
│   ├── cli/                 @stubrix/cli — Standalone CLI binary
│   ├── vscode-extension/    VS Code sidebar + commands
│   └── mcp/
│       ├── stubrix-mcp/     100+ MCP tools for full API control
│       ├── wiremock-mcp/    16 WireMock Admin API tools
│       └── docker-mcp/      12 Docker Compose management tools
│
├── mocks/
│   ├── mappings/            WireMock route definitions (JSON)
│   └── __files/             Response body files
├── config/
│   └── prometheus/          prometheus.yml scrape config
├── scripts/
│   ├── converter.js         WireMock <-> Mockoon converter
│   ├── entrypoint.sh        Smart Docker entrypoint
│   └── localstack/          LocalStack init scripts
├── dumps/                   Snapshot files + metadata
├── Dockerfile               Mock engine image (WireMock + Mockoon)
├── Dockerfile.api           Control plane image (NestJS API + React UI)
├── docker-compose.yml       20+ Docker profiles (incl. control-plane)
├── Makefile                 All CLI shortcuts
└── .env.example             Full environment reference
```

---

## 🚀 Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/marcelo-davanco/stubrix.git
cd stubrix
cp .env.example .env
npm install
```

### 2. Start the control plane

**Option A — Docker (recommended):**

```bash
make stubrix-build         # Build the control plane image (first time)
make stack-up              # Stubrix API + UI + WireMock + PostgreSQL
# Open http://localhost:9090
```

**Option B — Local development:**

```bash
npm run build
npm run dev                # API :9090 + UI :5173 (with HMR)
```

### 3. Start a mock engine (local dev only)

```bash
make wiremock     # WireMock on :8081
# or
make mockoon      # Mockoon on :8081
```

### 4. Record your first mock

```bash
make wiremock-record PROXY_TARGET=https://api.example.com
curl http://localhost:8081/api/users
make down
# Mocks saved in mocks/mappings/
```

> The full Swagger UI is available at `http://localhost:9090/api/docs`

---

## 🐳 Infrastructure Services

All services start via Docker Compose profiles. Use Makefile shortcuts or `docker compose --profile <name> up -d` directly.

### Control Plane

| Profile | Service | Port | Command |
|---------|---------|------|---------|
| `control-plane` | Stubrix API + React UI | :9090 | `make stubrix-up` |

```bash
make stubrix-build     # Build image (Dockerfile.api)
make stubrix-up        # Start detached
make stubrix-logs      # Tail logs
make stubrix-restart   # Rebuild + restart
make stack-up          # Full stack: Stubrix + WireMock + PostgreSQL
make stack-down        # Stop full stack
```

### Mock Engines

| Profile | Service | Port | Command |
|---------|---------|------|---------|
| `wiremock` | WireMock | :8081 | `make wiremock` |
| `mockoon` | Mockoon CLI | :8081 | `make mockoon` |
| `wiremock-record` | WireMock (record mode) | :8081 | `make wiremock-record PROXY_TARGET=<url>` |
| `mockoon-proxy` | Mockoon (hybrid proxy) | :8081 | `make mockoon-proxy PROXY_TARGET=<url>` |

### Databases

| Profile | Service | Port | Command |
|---------|---------|------|---------|
| `postgres` | PostgreSQL 17 | :5442 | `make postgres` |
| `mysql` | MySQL 8 | :3307 | `make mysql` |
| `adminer` | Adminer UI | :8082 | `make adminer-up` |
| `cloudbeaver` | CloudBeaver UI | :8083 | `make cloudbeaver-up` |

### Messaging & Protocols

| Profile | Service | Port | Command |
|---------|---------|------|---------|
| `kafka` | Redpanda (Kafka) | :9092 | `make kafka-up` |
| `rabbitmq` | RabbitMQ + UI | :5672 / :15672 | `make rabbitmq-up` |
| `gripmock` | GripMock (gRPC) | :4770 / :4771 | `make gripmock-up` |

### Observability

| Profile | Service | Port | Command |
|---------|---------|------|---------|
| `monitoring` | Prometheus | :9091 | `make monitoring-up` |
| `monitoring` | Grafana | :3000 | `make monitoring-up` |
| `jaeger` | Jaeger UI + OTLP | :16686 / :4318 | `make jaeger-up` |

### Cloud & IAM

| Profile | Service | Port | Command |
|---------|---------|------|---------|
| `localstack` | LocalStack (AWS) | :4566 | `make localstack-up` |
| `minio` | MinIO + Console | :9000 / :9001 | `make minio-up` |
| `keycloak` | Keycloak | :8180 | `make keycloak-up` |
| `zitadel` | Zitadel | :8085 | `make zitadel-up` |

### Testing & Chaos

| Profile | Service | Port | Command |
|---------|---------|------|---------|
| `pact` | Pact Broker | :9292 | `make pact-up` |
| `toxiproxy` | Toxiproxy | :8474 | `make toxiproxy-up` |
| `hoppscotch` | Hoppscotch | :3100 | `make hoppscotch` |

```bash
make stack-up    # Stubrix + WireMock + PostgreSQL
make stack-down  # Stop stack
make all-down    # Stop every service
```

---

## 🎯 Platform Capabilities

### API Mocking (Core)

Record from real traffic, edit in the dashboard, serve offline:

```bash
# Record from a real API
make wiremock-record PROXY_TARGET=https://api.github.com

# Serve mocks offline
make wiremock

# Import from HAR or Postman collection
curl -X POST http://localhost:9090/api/import/har \
  -F "file=@recording.har"
```

### Contract Testing (F13 — Pact)

Ensure producer/consumer contracts never break:

```bash
make pact-up
# POST /api/contracts/publish — publish consumer contracts
# POST /api/contracts/verify — verify against provider
```

### Chaos Engineering (F14/F26)

Inject faults without changing application code:

```bash
make toxiproxy-up
# POST /api/chaos/rules — add latency, error rate, payload corruption
# POST /api/chaos-network/proxies — manage Toxiproxy proxies
```

### Event-Driven Mocking (F16 — Kafka/RabbitMQ)

Simulate async event flows:

```bash
make kafka-up
# POST /api/events/publish — publish to Kafka topic or RabbitMQ exchange
# GET  /api/events/health  — check broker connectivity
```

### GraphQL & gRPC (F15)

Mock non-REST protocols:

```bash
make gripmock-up
# POST /api/protocols/graphql/parse   — parse SDL schema
# POST /api/protocols/grpc/mocks      — register gRPC mock stub
```

### LocalStack — AWS Simulation (F27)

Zero-cost cloud development:

```bash
make localstack-up
# GET  /api/cloud/health          — check which AWS services are up
# POST /api/cloud/s3/buckets      — create S3 bucket
# POST /api/cloud/sns/publish     — publish SNS message
# GET  /api/cloud/sqs/queues      — list SQS queues
```

### Distributed Tracing (F28 — Jaeger)

Trace requests across services locally:

```bash
make jaeger-up
# GET /api/tracing/traces   — list stored traces
# GET /api/tracing/health   — check OTEL connectivity
# Open http://localhost:16686 for Jaeger UI
```

### Prometheus Metrics (F21)

Observe the platform itself:

```bash
make monitoring-up
# GET /api/metrics/prometheus  — Prometheus scrape endpoint
# GET /api/metrics/health      — per-service latency check
# Open http://localhost:3000 for Grafana
```

### Performance Testing (F22 — k6)

Run load tests with CI regression gates:

```bash
# GET  /api/performance/scripts         — list k6 scripts (smoke, load, stress)
# POST /api/performance/baselines       — save a performance baseline
# POST /api/performance/baselines/:id/compare — detect >20% regression
```

### Identity & Access (F33 — Keycloak/Zitadel)

Real OAuth2/OIDC token flows locally:

```bash
make keycloak-up
# POST /api/iam/token                    — get token (password grant)
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

| Domain | Tools |
|--------|-------|
| Projects & Mocks | `stubrix_list_projects`, `stubrix_create_mock`, `stubrix_start_recording`, ... |
| Database Snapshots | `stubrix_create_snapshot`, `stubrix_restore_snapshot`, ... |
| Contracts | `contract_publish`, `contract_verify` |
| Chaos | `chaos_list_rules`, `chaos_create_rule`, `chaos_network_*` |
| Events | `event_publish`, `event_template_*`, `event_health` |
| Protocols | `protocol_graphql_parse`, `protocol_grpc_mock`, ... |
| Auth | `auth_create_user`, `auth_validate_key`, `auth_audit_log` |
| Metrics | `metrics_health`, `metrics_summary` |
| Performance | `perf_list_scripts`, `perf_save_baseline`, `perf_compare_baseline` |
| Tracing | `tracing_list`, `tracing_health`, `tracing_config` |
| Cloud (AWS) | `cloud_health`, `cloud_s3_*`, `cloud_sns_publish` |
| Storage (MinIO) | `storage_health`, `storage_upload_mock_body`, `storage_archive_snapshot` |
| IAM | `iam_health`, `iam_get_token`, `iam_introspect_token` |
| Governance | `lint_spec` |
| Docker | `docker_compose_up`, `docker_logs`, `docker_health`, ... |

---

## ⚙️ Environment Variables

See `.env.example` for the full reference. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `MOCK_PORT` | `8081` | Mock server port |
| `PROXY_TARGET` | — | Real API URL for recording/proxy |
| `MOCK_ENGINE` | `wiremock` | `wiremock` or `mockoon` |
| `CONTROL_PORT` | `9090` | NestJS API port |
| `PG_HOST` / `PG_PORT` | `localhost:5442` | PostgreSQL connection |
| `LOCALSTACK_URL` | `http://localhost:4566` | LocalStack endpoint |
| `MINIO_URL` | `http://localhost:9000` | MinIO endpoint |
| `KEYCLOAK_URL` | `http://localhost:8180` | Keycloak endpoint |
| `PROMETHEUS_PORT` | `9091` | Prometheus port |
| `JAEGER_UI_PORT` | `16686` | Jaeger UI port |
| `OTEL_ENDPOINT` | `http://localhost:4318` | OpenTelemetry HTTP endpoint |

---

## 📖 API Documentation

The full OpenAPI spec is available at **`http://localhost:9090/api/docs`** (Swagger UI) when the API is running.

All 27 modules are documented with request/response schemas, organized by tag:

`projects` · `mocks` · `recording` · `import` · `databases` · `governance` · `coverage` · `stateful-mocks` · `intelligence` · `scenarios` · `contracts` · `chaos` · `chaos-network` · `webhooks` · `events` · `protocols` · `auth` · `templates` · `metrics` · `performance` · `tracing` · `cloud` · `storage` · `iam` · `status`

---

## 🗺️ Roadmap (Releases)

| Version | Milestone | Key Features |
|---------|-----------|-------------|
| v1.3.1 | Foundation | WireMock/Mockoon dual engine, recording, dashboard, DB snapshots, MCP servers |
| v1.4.0 | Stateful Mocking | Stateful mock scenarios, Adminer/CloudBeaver DB viewers |
| v1.5.0 | API Clients | HAR/Postman/OpenAPI import, Bruno tests, Hoppscotch |
| v1.6.0 | Governance | Spectral OpenAPI linting, mock coverage analysis |
| v1.7.0 | Intelligence | AI/RAG mock generation (ChromaDB), Time Machine scenarios |
| v1.8.0 | Contracts & Chaos | Pact Broker, fault injection, Toxiproxy network chaos |
| v1.9.0 | CLI & Automation | `@stubrix/cli` standalone binary, Makefile automation |
| v2.0.0 | Multi-Protocol | GraphQL/gRPC mocking, Kafka/RabbitMQ event simulation, webhooks |
| v2.1.0 | Enterprise | Auth/RBAC/multi-tenancy, VS Code extension, environment templates |
| v2.2.0 | Observability | Prometheus/Grafana metrics, k6 performance testing, Jaeger tracing |
| **v2.3.0** | **Cloud & Storage** | **LocalStack AWS, MinIO object storage, Keycloak/Zitadel IAM** |

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

| Guide | Description |
|-------|-------------|
| [Recording with PokéAPI](docs/guide-pokeapi-recording.md) | Record PokéAPI mocks, serve offline, use via Postman |
| [`packages/api/API.md`](packages/api/API.md) | Full NestJS API module reference |
| [`packages/vscode-extension/README.md`](packages/vscode-extension/README.md) | Extension install + Windsurf CLI PATH setup |

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

**Stubrix** — made with ☕ by [Marcelo Davanço](https://github.com/marcelo-davanco)
