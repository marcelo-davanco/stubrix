---
description: Build all packages and prepare for deployment or production run
---

# Build & Deploy Workflow

## Build Order (critical — shared must be first)

1. Build shared types package
// turbo
```bash
npm run build:shared
```

2. Build API package
```bash
npm run build:api
```

3. Build db-ui package
```bash
npm run build:db-ui
```

4. Build UI package (produces static files into packages/api/public/)
```bash
npm run build:ui
```

## Alternatively, build everything in one command
```bash
npm run build
```

## Build Docker Image
```bash
make build
```

## Production Run

### Option A: API serves built UI (single process)
```bash
cd packages/api && node dist/main
```

### Option B: Docker with mock engine
```bash
make wiremock          # WireMock engine
# or
make mockoon           # Mockoon engine
```

### Option C: Full stack with databases
```bash
make all-up            # WireMock + PostgreSQL
```

## Verification
- Check API: `curl http://localhost:9090/api/status`
- Check mocks: `curl http://localhost:8081/api/health`
- Check UI: open `http://localhost:9090` (production) or `http://localhost:5173` (dev)

## Common Issues
- **Build fails on shared**: ensure `packages/shared/dist/` exists before building other packages
- **UI build fails**: check that `@stubrix/db-ui` is built first (it exports .ts, needs compilation)
- **Missing types**: run `npm run build:shared` to regenerate type declarations
