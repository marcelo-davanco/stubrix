---
trigger: always
description: Mock files use WireMock JSON as canonical format — stored in mocks/mappings/ and mocks/__files/
---

# Mock Format Rules

## Canonical Format
WireMock JSON is the **single source of truth** for all mock definitions.

## File Locations
- Mappings: `mocks/mappings/*.json`
- Response bodies: `mocks/__files/*`

## Naming Convention
- Mapping files: `{path}_{method}.json` (e.g., `api_users_get.json`)
- Body files: descriptive names (e.g., `users-list.json`, `order-created.json`)

## Mockoon Conversion
- Mockoon format is auto-generated from WireMock mappings on engine startup
- Generated file: `.mockoon-env.json` (gitignored)
- Manual conversion: `make convert-to-mockoon`
- Never edit `.mockoon-env.json` directly — edit WireMock mappings instead

## Mock Structure
```json
{
  "request": {
    "method": "GET|POST|PUT|DELETE|PATCH",
    "url": "/exact/path",
    "urlPathPattern": "/regex/path/[0-9]+"
  },
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/json" },
    "body": "{\"inline\": \"json\"}",
    "bodyFileName": "external-file.json"
  }
}
```

## Priority
- Lower number = higher priority
- Use `"priority": 1` for specific routes that overlap with patterns
- Default priority (unset) is lowest
