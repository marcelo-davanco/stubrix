---
description: Expert guidance for creating, editing, recording and converting mock definitions in WireMock and Mockoon formats
---

# Mock Engineering — Stubrix

## When to use
- Creating new mock mappings (WireMock JSON format)
- Recording mocks from real APIs
- Converting between WireMock and Mockoon formats
- Debugging mock matching, priorities, or response bodies
- Designing mock scenarios for testing

## WireMock Mapping Format (Canonical)

### Inline Response Body
```json
{
  "request": {
    "method": "GET",
    "url": "/api/resource"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": "{\"key\": \"value\"}"
  }
}
```

### External Body File
```json
{
  "request": {
    "method": "GET",
    "urlPathPattern": "/api/users/[0-9]+"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "bodyFileName": "user-detail.json"
  }
}
```
- Mapping: `mocks/mappings/{name}.json`
- Body file: `mocks/__files/{filename}`

### Advanced Matching
```json
{
  "request": {
    "method": "POST",
    "url": "/api/orders",
    "headers": {
      "Authorization": { "matches": "Bearer .*" }
    },
    "bodyPatterns": [
      { "matchesJsonPath": "$.items[?(@.quantity > 0)]" }
    ]
  },
  "response": {
    "status": 201,
    "jsonBody": { "orderId": "abc-123", "status": "created" }
  },
  "priority": 1
}
```

## File Naming Convention
- Pattern: `{path}_{method}.json` (e.g., `api_users_get.json`, `api_orders_post.json`)
- Body files: descriptive names (e.g., `users-list.json`, `order-created.json`)

## Recording Workflows

### Automatic Recording
1. `make wiremock-record PROXY_TARGET=https://api.example.com`
2. Make requests against `localhost:8081`
3. `make down` — mocks auto-saved to `mocks/mappings/`

### API-Controlled Recording
1. `make wiremock` (start normally)
2. `./scripts/record.sh start https://api.example.com`
3. Make requests
4. `./scripts/record.sh stop`

### Via Dashboard
1. Navigate to project → Recording page
2. Enter proxy target URL
3. Start/Stop/Snapshot via UI buttons

## Format Conversion
- WireMock → Mockoon: `make convert-to-mockoon` (or automatic on Mockoon startup)
- Mockoon → WireMock: `make convert-to-wiremock`
- Converter: `scripts/converter.js`

## Mock Server Admin API (WireMock)
- `GET /__admin/mappings` — list all mappings
- `POST /__admin/mappings` — add mapping
- `DELETE /__admin/mappings/{id}` — remove mapping
- `POST /__admin/recordings/start` — start recording
- `POST /__admin/recordings/stop` — stop recording
- `POST /__admin/recordings/snapshot` — capture snapshot

## Best Practices
- Use `urlPathPattern` with regex for dynamic segments
- Set `priority` (lower = higher priority) for overlapping routes
- Use `bodyFileName` for large response bodies (>1KB)
- Keep mock data realistic — use real API responses as seeds
- Group related mocks in subdirectories if needed
- Always validate JSON structure before committing

## MCP Tools to Use
- **DeepWiki**: `ask_question("wiremock/wiremock", ...)` for WireMock docs
- **Memory MCP**: track which APIs have been recorded and their mock status
