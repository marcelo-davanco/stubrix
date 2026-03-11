---
description: Record mocks from a real API using WireMock recording mode
---

# Mock Recording Workflow

## Option A — Automatic Recording (simplest)

1. Start WireMock in recording mode pointing to the real API
```bash
make wiremock-record PROXY_TARGET=https://api.example.com
```

2. Make requests against the mock server
```bash
curl http://localhost:8081/api/users
curl http://localhost:8081/api/products/42
curl -X POST http://localhost:8081/api/orders -d '{"item":"abc"}'
```

3. Stop the container (mocks auto-saved)
```bash
make down
```

4. Verify recorded mocks
// turbo
```bash
make list-mappings
```

## Option B — API-Controlled Recording

1. Start WireMock normally
```bash
make wiremock
```

2. Start recording via Admin API
```bash
./scripts/record.sh start https://api.example.com
```

3. Make requests against `localhost:8081`

4. Stop recording (mocks persisted)
```bash
./scripts/record.sh stop
```

5. Check recording status
```bash
./scripts/record.sh status
```

## Option C — Snapshot (point-in-time capture)
```bash
./scripts/record.sh snapshot
```

## Option D — Via Dashboard UI
1. Open `http://localhost:5173`
2. Navigate to project → **Recording**
3. Enter proxy target URL
4. Click **Start Recording**
5. Make requests against `localhost:8081`
6. Click **Stop** or **Snapshot**

## Post-Recording Tasks

### Review and clean up mocks
// turbo
```bash
ls -la mocks/mappings/
```

### Edit mocks if needed (via Dashboard or manually)
- Remove duplicates
- Adjust response bodies
- Add URL patterns for dynamic segments

### Convert to Mockoon (if needed)
```bash
make convert-to-mockoon
```

### Test mocks offline
```bash
make down
make wiremock
curl http://localhost:8081/api/users
```

## Tips
- Record against staging/dev APIs, not production
- Use the Dashboard for visual mock management after recording
- Commit mocks to git for CI/CD: `git add mocks/ && git commit -m "add API mocks"`
