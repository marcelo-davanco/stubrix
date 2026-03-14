# @stubrix/cli

Stubrix CLI — control your mock server platform from the terminal.

## Installation

```bash
npm install -g @stubrix/cli
# or from the monorepo
npm run build -w @stubrix/cli
```

## Commands

| Command | Description |
|---------|-------------|
| `stubrix init` | Initialize a new Stubrix project |
| `stubrix up` | Start mock engine (WireMock by default) |
| `stubrix down` | Stop all services |
| `stubrix status` | Show API status |
| `stubrix doctor` | Health check all services |
| `stubrix mock list` | List projects |
| `stubrix mock create <projectId>` | Create a mock |
| `stubrix mock import <file>` | Import HAR/Postman/OpenAPI |
| `stubrix db engines` | List DB engines |
| `stubrix db snapshot <engine>` | Create DB snapshot |
| `stubrix db restore <engine> <name>` | Restore snapshot |
| `stubrix chaos list` | List chaos profiles |
| `stubrix chaos presets` | List built-in presets |
| `stubrix chaos apply <preset>` | Apply chaos preset |
| `stubrix scenario list` | List scenarios |
| `stubrix scenario save <name>` | Capture current state |
| `stubrix scenario restore <id>` | Restore a scenario |
| `stubrix scenario diff <idA> <idB>` | Compare scenarios |

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `STUBRIX_API_URL` | `http://localhost:9090` | API base URL |

## Examples

```bash
# Start WireMock + PostgreSQL
stubrix up --engine wiremock --postgres

# Import a Postman collection
stubrix mock import ./postman-collection.json

# Apply slow network chaos
stubrix chaos apply slow-network --url '/api/.*'

# Capture and restore scenarios
stubrix scenario save before-migration
stubrix scenario restore <uuid>
```
