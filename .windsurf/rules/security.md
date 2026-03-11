---
trigger: always
description: Security rules — no secrets in code, no committed .env files, CORS via env
---

# Security Rules

## Secrets
- **Never hardcode** credentials, API keys, ports, or URLs in source code
- All secrets go in `.env` (gitignored) — use `.env.example` as template
- Access via `@nestjs/config` ConfigService in NestJS, `import.meta.env` in Vite

## .env Files
- `.env` is in `.gitignore` — never commit it
- `.env.example` is committed — update it when adding new variables
- All variables must have sensible defaults in `docker-compose.yml` and `ConfigService`

## CORS
- Configured via `CORS_ORIGIN` environment variable
- Default: `*` (development only)
- Production: set explicit origins comma-separated

## Database Credentials
- Always use environment variables: `PG_USER`, `PG_PASSWORD`, `MYSQL_USER`, `MYSQL_PASSWORD`
- Docker Compose defaults are for local development only
- Never log connection strings or passwords

## API Security
- No authentication is implemented yet — the API is intended for local/internal use
- When auth is added, use NestJS Guards and decorators
- Never expose WireMock Admin API (`/__admin/`) to untrusted networks
