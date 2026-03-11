---
description: Expert guidance for Docker Compose profiles, Dockerfile, database containers and infrastructure management in Stubrix
---

# Docker & Infrastructure — Stubrix

## When to use
- Modifying docker-compose.yml profiles or services
- Adding new database engines or services
- Debugging container networking, volumes, or health checks
- Updating the Dockerfile for the mock server
- Managing environment variables across docker-compose and .env

## Docker Compose Profile System

### Available Profiles
| Profile | Service | Description |
|---------|---------|-------------|
| `wiremock` | wiremock | Serve mocks via WireMock |
| `wiremock-record` | wiremock-record | WireMock in recording mode |
| `mockoon` | mockoon | Serve mocks via Mockoon CLI |
| `mockoon-proxy` | mockoon-proxy | Mockoon with proxy fallback |
| `postgres` | db-postgres | PostgreSQL 17 |
| `databases` | db-postgres | Alias for postgres |
| `mysql` | db-mysql | MySQL 8 |

### Composition Rules
- Profiles are composable: `--profile wiremock --profile postgres`
- Mock engines are mutually exclusive (wiremock OR mockoon)
- Database profiles are independent and combinable
- SQLite runs on host filesystem, no container needed

## Service Patterns

### Database Service Template
```yaml
service-name:
  image: engine:version
  profiles: ["profile-name"]
  container_name: stubrix-db-{engine}
  environment:
    # Connection vars from .env with defaults
  ports:
    - "${EXTERNAL_PORT:-default}:{internal_port}"
  volumes:
    - named_volume:/data/path
    - ./dumps/{engine}:/docker-entrypoint-initdb.d:ro
  healthcheck:
    test: ["CMD-SHELL", "health-check-command"]
    interval: 10s
    timeout: 5s
    retries: 5
  restart: unless-stopped
```

### Key Patterns
- Always use named volumes for data persistence
- Mount `dumps/{engine}/` as init directory (read-only)
- Health checks are mandatory for all database services
- Use `restart: unless-stopped` for databases
- External ports always configurable via env vars

## Environment Variables
- Defined in `.env` (gitignored) with `.env.example` as template
- Docker Compose interpolates `${VAR:-default}` syntax
- NestJS loads via `@nestjs/config` ConfigModule
- Makefile exports all vars via `-include .env` + `export`

## Dockerfile (Multi-engine Mock Server)
- Multi-stage: installs both WireMock (Java) and Mockoon (Node.js)
- Entrypoint script selects engine based on `MOCK_ENGINE` env var
- Converter runs automatically when Mockoon starts
- Mocks mounted at `/mocks` via volume

## Makefile Targets
- Primary CLI interface for all Docker operations
- `make help` shows all available targets
- Targets compose profiles + env vars
- Pattern: `make {action}` wraps `docker compose --profile {profile} {command}`

## Troubleshooting
1. **Port conflicts**: Check `MOCK_PORT`, `PG_EXTERNAL_PORT`, `MYSQL_EXTERNAL_PORT`
2. **Volume permissions**: Ensure dumps directories exist locally
3. **Health check failures**: Check container logs with `docker compose logs {service}`
4. **Network issues**: Services on same compose network, use service names for inter-container DNS

## MCP Tools to Use
- **PostgreSQL MCP**: direct database queries against running containers
- **Sequential Thinking**: for complex multi-profile architecture decisions
