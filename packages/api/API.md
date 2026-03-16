# Stubrix API Reference

## Overview

The Stubrix API is the NestJS 11 control plane for the entire platform. It exposes **27 modules** across REST and WebSocket, covering everything from basic mock management to distributed tracing, cloud simulation, and IAM.

- **Swagger UI**: `http://localhost:9090/api/docs`
- **OpenAPI JSON**: `http://localhost:9090/api/docs-json`
- **Base URL (dev)**: `http://localhost:9090/api`
- **Base URL (prod)**: `https://api.stubrix.com/api`

---

## Module Index

| Tag              | Module                          | Base path                                |
| ---------------- | ------------------------------- | ---------------------------------------- |
| `projects`       | Project CRUD                    | `/api/projects`                          |
| `mocks`          | Mock definitions                | `/api/projects/:id/mocks`                |
| `recording`      | Traffic recording               | `/api/projects/:id/recording`            |
| `import`         | HAR / Postman / OpenAPI import  | `/api/import`                            |
| `databases`      | DB snapshots + configs          | `/api/db`, `/api/projects/:id/databases` |
| `stateful-mocks` | Stateful scenario machine       | `/api/stateful-mocks`                    |
| `governance`     | Spectral OpenAPI linting        | `/api/governance`                        |
| `coverage`       | Mock hit/miss analysis          | `/api/coverage`                          |
| `intelligence`   | AI/RAG mock generation          | `/api/intelligence`                      |
| `scenarios`      | Time machine: capture & restore | `/api/scenarios`                         |
| `contracts`      | Pact Broker contract testing    | `/api/contracts`                         |
| `chaos`          | Fault injection                 | `/api/chaos`                             |
| `chaos-network`  | Toxiproxy network chaos         | `/api/chaos-network`                     |
| `webhooks`       | Webhook receiver + replay       | `/api/webhooks`                          |
| `events`         | Kafka + RabbitMQ publishing     | `/api/events`                            |
| `protocols`      | GraphQL + gRPC mocking          | `/api/protocols`                         |
| `auth`           | API keys, RBAC, multi-tenancy   | `/api/auth`                              |
| `templates`      | Environment templates           | `/api/templates`                         |
| `metrics`        | Prometheus metrics              | `/api/metrics`                           |
| `performance`    | k6 scripts + baselines          | `/api/performance`                       |
| `tracing`        | Jaeger/OpenTelemetry tracing    | `/api/tracing`                           |
| `cloud`          | LocalStack AWS mocking          | `/api/cloud`                             |
| `storage`        | MinIO object storage            | `/api/storage`                           |
| `iam`            | Keycloak + Zitadel IAM          | `/api/iam`                               |
| `status`         | Engine health                   | `/api/status`                            |
| `logs`           | Real-time logs                  | `/api/logs`, `/ws/logs`                  |
| `engine`         | WireMock reset                  | `/api/engine`                            |

---

## Core Modules

### Projects

```bash
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
```

### Mocks

```bash
GET    /api/projects/:projectId/mocks
POST   /api/projects/:projectId/mocks
GET    /api/projects/:projectId/mocks/:id
PUT    /api/projects/:projectId/mocks/:id
DELETE /api/projects/:projectId/mocks/:id
```

### Recording

```bash
GET  /api/projects/:projectId/recording/status
POST /api/projects/:projectId/recording/start   { proxyTarget }
POST /api/projects/:projectId/recording/stop
POST /api/projects/:projectId/recording/snapshot
```

### Import

```bash
POST /api/import/har        multipart/form-data: file
POST /api/import/postman    multipart/form-data: file
POST /api/import/insomnia   multipart/form-data: file
POST /api/import/openapi    multipart/form-data: file
```

### Databases

```bash
GET  /api/db/engines
GET  /api/db/snapshots?projectId=...
POST /api/db/snapshots
POST /api/db/engines/:engine/snapshots
POST /api/db/snapshots/:name/restore
POST /api/db/engines/:engine/snapshots/:name/restore
PATCH  /api/db/snapshots/:name
DELETE /api/db/snapshots/:name

GET    /api/projects/:projectId/databases/configs
POST   /api/projects/:projectId/databases/configs
DELETE /api/projects/:projectId/databases/configs/:id
```

---

## Quality & Testing Modules

### Governance (Spectral)

```bash
POST /api/governance/lint   { content: "<OpenAPI spec string>" }
GET  /api/governance/rules
```

### Coverage

```bash
GET  /api/coverage/report?projectId=...
POST /api/coverage/reset
```

### Contracts (Pact)

```bash
POST /api/contracts/publish  { contract, provider, consumer }
POST /api/contracts/verify   { provider }
GET  /api/contracts/health
```

### Chaos Engineering

```bash
GET    /api/chaos/rules
POST   /api/chaos/rules      { type, target, latencyMs?, errorRate?, ... }
DELETE /api/chaos/rules/:id
POST   /api/chaos/rules/:id/enable
POST   /api/chaos/rules/:id/disable
```

### Chaos Network (Toxiproxy)

```bash
GET    /api/chaos-network/proxies
POST   /api/chaos-network/proxies   { name, listen, upstream }
DELETE /api/chaos-network/proxies/:name
POST   /api/chaos-network/proxies/:name/toxics   { type, latency?, ... }
GET    /api/chaos-network/health
```

### Performance (k6)

```bash
GET    /api/performance/scripts
POST   /api/performance/scripts        { name, script }
GET    /api/performance/scripts/:id/export
DELETE /api/performance/scripts/:id

GET    /api/performance/baselines
POST   /api/performance/baselines      { scriptId, results }
POST   /api/performance/baselines/:id/compare   { results }
DELETE /api/performance/baselines/:id
```

---

## Intelligence & Automation

### Stateful Mocks

```bash
GET    /api/stateful-mocks
POST   /api/stateful-mocks             { name, states, transitions }
POST   /api/stateful-mocks/:id/transition   { event }
POST   /api/stateful-mocks/:id/reset
DELETE /api/stateful-mocks/:id
```

### Scenarios (Time Machine)

```bash
GET  /api/scenarios
POST /api/scenarios/capture   { name, projectId }
POST /api/scenarios/:id/restore
DELETE /api/scenarios/:id
```

### Intelligence (AI/RAG)

```bash
POST /api/intelligence/generate  { prompt, context? }
POST /api/intelligence/query     { query }
GET  /api/intelligence/health
```

### Templates

```bash
GET    /api/templates
GET    /api/templates/:id
POST   /api/templates              { name, variables, mocks }
POST   /api/templates/:id/apply    { variables }
DELETE /api/templates/:id
```

---

## Multi-Protocol

### Webhooks

```bash
POST /api/webhooks/receive      { payload, headers }
GET  /api/webhooks
GET  /api/webhooks/:id
POST /api/webhooks/:id/replay
POST /api/webhooks/simulate     { url, payload, method? }
DELETE /api/webhooks/:id
```

### Events (Kafka / RabbitMQ)

```bash
POST /api/events/publish         { broker, topic, message }
GET  /api/events/templates
POST /api/events/templates       { name, broker, topic, payload }
DELETE /api/events/templates/:id
GET  /api/events/health
```

### Protocols (GraphQL / gRPC)

```bash
POST /api/protocols/graphql/parse    { schema }
GET  /api/protocols/graphql/mocks
POST /api/protocols/graphql/mocks    { schema, resolver }
DELETE /api/protocols/graphql/mocks/:id

GET    /api/protocols/grpc/mocks
POST   /api/protocols/grpc/mocks     { service, method, response }
DELETE /api/protocols/grpc/mocks/:id
GET    /api/protocols/grpc/health
```

---

## Enterprise & Observability

### Auth (RBAC / Multi-Tenancy)

```bash
GET    /api/auth/users
POST   /api/auth/users        { username, role, workspace? }
DELETE /api/auth/users/:id
POST   /api/auth/users/:id/rotate-key
POST   /api/auth/validate-key   { apiKey }
GET    /api/auth/workspaces
GET    /api/auth/audit-log?userId=&limit=
```

### Metrics (Prometheus)

```bash
GET /api/metrics/prometheus   # Prometheus text format scrape endpoint
GET /api/metrics/summary      # JSON summary of counters and histograms
GET /api/metrics/health       # Per-service latency health check
```

### Tracing (Jaeger / OpenTelemetry)

```bash
GET /api/tracing/traces        # List stored traces
GET /api/tracing/traces/:id    # Get trace detail
GET /api/tracing/health        # OTEL endpoint connectivity
GET /api/tracing/config        # Current OTEL configuration
```

---

## Cloud & Storage

### Cloud (LocalStack / AWS)

```bash
GET  /api/cloud/health           # LocalStack health + running services
GET  /api/cloud/config
GET  /api/cloud/s3/buckets
POST /api/cloud/s3/buckets       { bucket }
GET  /api/cloud/sqs/queues
POST /api/cloud/sns/publish      { topic, message, subject? }
```

### Storage (MinIO)

```bash
GET  /api/storage/health
GET  /api/storage/config
POST /api/storage/mock-bodies          { filename, content }
POST /api/storage/snapshots/archive    { snapshotPath, projectId }
GET  /api/storage/url/:bucket/:key
```

### IAM (Keycloak / Zitadel)

```bash
GET  /api/iam/health
GET  /api/iam/config
POST /api/iam/token                    { username, password }
POST /api/iam/token/client-credentials
POST /api/iam/token/introspect         { token }
```

---

## WebSocket

Real-time log streaming via Socket.IO:

```
ws://localhost:9090/ws/logs
```

Events emitted: `log` with `{ timestamp, level, message, projectId? }`

---

## Error Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

## HTTP Status Codes

| Code | Meaning                  |
| ---- | ------------------------ |
| 200  | OK                       |
| 201  | Created                  |
| 204  | No Content               |
| 400  | Bad Request (validation) |
| 404  | Not Found                |
| 500  | Internal Server Error    |

---

## Running the API

```bash
# From monorepo root
npm run dev:api        # Development (port 9090)
npm run build:api      # Production build
npm run test -w @stubrix/api   # Unit tests
```
