---
description: Run unit tests, E2E tests and validate the full Stubrix project
---

# Test Suite Workflow

## Unit Tests (API)

1. Run all unit tests
```bash
npm run test -w @stubrix/api
```

2. Run tests in watch mode (during development)
```bash
npm run test:watch -w @stubrix/api
```

3. Run tests with coverage
```bash
npm run test:cov -w @stubrix/api
```

4. Run a specific test file
```bash
npx jest --config packages/api/package.json -- {test-file-pattern}
```

## E2E Tests (API)

1. Ensure the API is NOT running on port 9090 (E2E starts its own instance)

2. Run E2E tests
```bash
npm run test:e2e -w @stubrix/api
```

## Lint & Format

1. Lint the API
```bash
npm run lint -w @stubrix/api
```

2. Format the API
```bash
npm run format -w @stubrix/api
```

## Full Validation Pipeline

1. Build all packages (catches type errors)
// turbo
```bash
npm run build
```

2. Run unit tests
```bash
npm run test -w @stubrix/api
```

3. Run E2E tests
```bash
npm run test:e2e -w @stubrix/api
```

4. Lint
```bash
npm run lint -w @stubrix/api
```

## E2E Dashboard Tests (via Playwright MCP)

Use the Playwright MCP tools for UI testing:

1. Navigate to the dashboard: `mcp4_browser_navigate` → `http://localhost:5173`
2. Take snapshot: `mcp4_browser_snapshot` to see page state
3. Interact with elements: `mcp4_browser_click`, `mcp4_browser_type`
4. Verify state: `mcp4_browser_snapshot` after actions
5. Check console: `mcp4_browser_console_messages` for errors

### Common E2E Test Scenarios
- Create a new project
- Create/edit/delete a mock
- Start/stop recording
- Navigate between pages
- Database snapshot create/restore
- Real-time log streaming

## Test Writing Guidelines
- API unit tests: use `@nestjs/testing` TestingModule
- Mock external deps: axios, fs, child_process
- Use descriptive `describe`/`it` blocks
- Test happy path + error cases
- Keep tests focused — one concern per test
