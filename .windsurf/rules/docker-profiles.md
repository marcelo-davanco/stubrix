---
trigger: always
description: Docker Compose profile rules — never start services without explicit profiles
---

# Docker Compose Profiles

## Rule
**Never start Docker services without an explicit `--profile` flag.** Plain `docker compose up` will start nothing because all services require profiles.

## Available Profiles
| Profile | Service | Port |
|---------|---------|------|
| `wiremock` | WireMock mock server | 8081 |
| `wiremock-record` | WireMock recording mode | 8081 |
| `mockoon` | Mockoon mock server | 8081 |
| `mockoon-proxy` | Mockoon proxy mode | 8081 |
| `postgres` / `databases` | PostgreSQL 17 | 5442 |
| `mysql` | MySQL 8 | 3307 |

## Mutual Exclusions
- Mock engines are mutually exclusive: use `wiremock` OR `mockoon`, not both
- Database profiles are independent and composable

## Common Combinations
```bash
make wiremock           # Mocks only
make postgres-up        # PostgreSQL only (detached)
make all-up             # WireMock + PostgreSQL (detached)
```

## Environment Overrides
- `MOCK_PORT` — mock server port (default: 8081)
- `PG_EXTERNAL_PORT` — PostgreSQL host port (default: 5442)
- `MYSQL_EXTERNAL_PORT` — MySQL host port (default: 3307)
- `PROXY_TARGET` — real API URL for recording/proxy

## Prefer Makefile
Always use `make` targets over raw `docker compose` commands — they handle env loading and profile composition correctly.
