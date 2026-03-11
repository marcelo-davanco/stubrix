---
description: Set up the local development environment for Stubrix from scratch
---

# Development Environment Setup

## Prerequisites
- Node.js >= 24 (check with `node -v`)
- npm >= 10 (check with `npm -v`)
- Docker and Docker Compose installed
- PostgreSQL client tools (`pg_dump`, `psql`) for real snapshot operations

## Steps

1. Clone and enter the repository
```bash
cd /Users/killvorak/mvps/hyper-stubrix/stubrix
```

2. Copy environment file
```bash
cp .env.example .env
```

3. Install all workspace dependencies
// turbo
```bash
npm install
```

4. Build packages in correct order (shared must be first)
// turbo
```bash
npm run build:shared
```

5. Build the full project
```bash
npm run build
```

6. Start PostgreSQL container (detached)
```bash
make postgres-up
```

7. Start API in dev mode (port 9090)
```bash
npm run dev:api
```

8. In a separate terminal, start UI dev server (port 5173)
```bash
npm run dev:ui
```

9. Verify the setup
- API health: `curl http://localhost:9090/api/status`
- UI: open `http://localhost:5173` in browser
- PostgreSQL: `make postgres-psql`

## Notes
- The UI dev server proxies `/api/*` and `/ws/*` to the API at `localhost:9090`
- If you only need the API, skip step 8
- If you don't need databases, skip step 6
