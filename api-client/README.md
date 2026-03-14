# Stubrix — Bruno API Client (F7)

API collections for [Bruno](https://www.usebruno.com/) covering all Stubrix endpoints.

## Quick Start

1. Install Bruno: https://www.usebruno.com/downloads
2. Open Bruno → **Open Collection** → select this `api-client/` folder
3. Select the `local` environment
4. Run requests

## Collections

| Folder | Description |
|--------|-------------|
| `control-plane/` | Projects + Mocks CRUD |
| `databases/` | DB engines, snapshots |
| `recording/` | Start/stop traffic recording |
| `stateful-mocks/` | Stateful mock CRUD + test |
| `import/` | Universal import (HAR/Postman/OpenAPI) |

## Environments

| Name | API URL |
|------|---------|
| `local` | `http://localhost:9090` |
| `docker` | `http://localhost:9090` |

## CI / Automated Tests

```bash
make bruno-test
make bruno-test-collection COLLECTION=control-plane
```
