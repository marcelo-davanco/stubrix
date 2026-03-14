# Hoppscotch Self-Hosted — Stubrix Integration (F8)

[Hoppscotch](https://hoppscotch.io) is an open-source API testing client. Stubrix ships a Docker Compose profile to run Hoppscotch self-hosted alongside the mock server.

## Quick Start

```bash
# Start Hoppscotch + PostgreSQL
make hoppscotch

# Or detached
docker compose --profile hoppscotch up -d
```

Access at **http://localhost:3100**

## Network Topology

```
┌──────────────────────────────────────────────────────────┐
│  Host Machine                                            │
│                                                          │
│  ┌───────────────┐     ┌─────────────────────────────┐  │
│  │  Hoppscotch   │────▶│  Stubrix API                │  │
│  │  :3100        │     │  :9090  /api/...            │  │
│  └───────────────┘     └─────────────────────────────┘  │
│                                                          │
│  ┌───────────────┐     ┌─────────────────────────────┐  │
│  │  Bruno Client │────▶│  WireMock / Mockoon         │  │
│  │  (local app)  │     │  :8081  (mock responses)    │  │
│  └───────────────┘     └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOPPSCOTCH_PORT` | `3100` | Host port for Hoppscotch UI |
| `HOPPSCOTCH_SECRET` | `stubrix-hoppscotch-secret` | JWT secret — **change in production** |

## Importing Stubrix Collections

Hoppscotch supports importing from URL or JSON. To import the Stubrix API collection:

1. Open Hoppscotch → **Collections** → **Import**
2. Choose **OpenAPI** and enter:
   ```
   http://localhost:9090/api/docs-json
   ```
3. All Stubrix endpoints will be imported automatically.

## Makefile Commands (F8.02)

```bash
make hoppscotch        # Start Hoppscotch (attached)
make hoppscotch-down   # Stop Hoppscotch
make hoppscotch-logs   # Tail Hoppscotch logs
```

## Notes

- Hoppscotch self-hosted requires PostgreSQL when running in full mode. The `hoppscotch` Docker profile automatically depends on `db-postgres`.
- For a quick local test without DB, use the public [hoppscotch.io](https://hoppscotch.io) and point it to `http://localhost:9090`.
