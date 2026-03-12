# Stubrix API Documentation

## Overview

The Stubrix API provides a comprehensive control plane for managing mock servers, recording traffic, and handling database snapshots. All endpoints are documented with OpenAPI/Swagger and available for interactive exploration.

## Base URL

- **Development**: `http://localhost:9090/api`
- **Production**: `https://api.stubrix.com/api`

## Authentication

Currently, the API does not require authentication. This may change in future versions.

## Interactive Documentation

### Swagger UI
Access the interactive API documentation at:
```
http://localhost:9090/api/docs
```

### JSON Spec
Access the raw OpenAPI specification at:
```
http://localhost:9090/api/docs-json
```

## API Endpoints

### 🏗️ Projects
Manage mock server projects and configurations.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List all projects |
| GET | `/projects/:id` | Get project by ID |
| POST | `/projects` | Create new project |
| PUT | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |

#### Example: Create Project
```bash
curl -X POST http://localhost:9090/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E-commerce API",
    "description": "Mock server for e-commerce endpoints",
    "proxyTarget": "https://api.ecommerce.com"
  }'
```

### 🎭 Mocks
Manage mock definitions within projects.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/:projectId/mocks` | List project mocks |
| GET | `/projects/:projectId/mocks/:id` | Get mock by ID |
| POST | `/projects/:projectId/mocks` | Create new mock |
| PUT | `/projects/:projectId/mocks/:id` | Update mock |
| DELETE | `/projects/:projectId/mocks/:id` | Delete mock |

#### Example: Create Mock
```bash
curl -X POST http://localhost:9090/api/projects/project-id/mocks \
  -H "Content-Type: application/json" \
  -d '{
    "request": {
      "method": "GET",
      "url": "/api/users"
    },
    "response": {
      "status": 200,
      "body": "{\"users\": []}",
      "headers": {"Content-Type": "application/json"}
    }
  }'
```

### 📹 Recording
Manage traffic recording sessions.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/:projectId/recording/status` | Get recording status |
| POST | `/projects/:projectId/recording/start` | Start recording |
| POST | `/projects/:projectId/recording/stop` | Stop recording |
| POST | `/projects/:projectId/recording/snapshot` | Take snapshot |

#### Example: Start Recording
```bash
curl -X POST http://localhost:9090/api/projects/project-id/recording/start \
  -H "Content-Type: application/json" \
  -d '{
    "proxyTarget": "https://api.example.com"
  }'
```

### 🗄️ Databases
Manage database snapshots and configurations.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/db/engines` | List database engines |
| GET | `/db/snapshots` | List snapshots |
| POST | `/db/snapshots` | Create snapshot |
| POST | `/db/snapshots/:id/restore` | Restore snapshot |

### ⚙️ Engine
Control mock engine operations.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/engine` | Get engine status |
| POST | `/engine/reset` | Reset all mappings |

### 📊 Status
System health and status information.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | Get system status |

### 📝 Logs
Real-time log streaming.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/logs` | Get recent logs |

## Response Format

All API responses follow a consistent format:

### Success Responses
```json
{
  "data": { /* response data */ }
}
```

### Error Responses
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 204 | No Content - Resource deleted |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

## Rate Limiting

Currently, no rate limiting is implemented. This may be added in future versions.

## Versioning

The API follows semantic versioning. Current version: **1.0.0**

## Development

### Running the API
```bash
cd packages/api
npm run start:dev
```

### Building
```bash
cd packages/api
npm run build
```

### Testing
```bash
cd packages/api
npm run test
```

## Integration Examples

### JavaScript/Node.js
```javascript
const baseUrl = 'http://localhost:9090/api';

// List projects
const projects = await fetch(`${baseUrl}/projects`).then(r => r.json());

// Create project
const project = await fetch(`${baseUrl}/projects`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My API Mocks',
    description: 'Test mocks for my API'
  })
}).then(r => r.json());
```

### Python
```python
import requests

base_url = 'http://localhost:9090/api'

# List projects
projects = requests.get(f'{base_url}/projects').json()

# Create project
project = requests.post(f'{base_url}/projects', json={
    'name': 'My API Mocks',
    'description': 'Test mocks for my API'
}).json()
```

## Support

For API questions and support:
- Check the interactive documentation at `/api/docs`
- Review the OpenAPI spec at `/api/docs-json`
- Open an issue on GitHub
