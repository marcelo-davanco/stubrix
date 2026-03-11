# Stubrix Custom MCP Servers

Custom [Model Context Protocol](https://modelcontextprotocol.io/) servers built for the Stubrix platform. These provide direct programmatic access to WireMock, the Stubrix API, and Docker Compose from AI coding assistants like Windsurf Cascade.

## Architecture

The Stubrix MCP servers are organized as separate packages within the `packages/mcp/` directory:

- **@stubrix/wiremock-mcp**: Direct WireMock Admin API access
- **@stubrix/stubrix-mcp**: Full Stubrix Control Plane API access  
- **@stubrix/docker-mcp**: Docker Compose management for Stubrix profiles

Each server is a standalone Node.js application with its own `package.json` and can be run independently.

## Servers

### @stubrix/wiremock-mcp
Direct access to the WireMock Admin API (`/__admin/`).

| Tool | Description |
|------|-------------|
| `wiremock_list_mappings` | List all stub mappings |
| `wiremock_get_mapping` | Get mapping by UUID |
| `wiremock_create_mapping` | Create a new mapping |
| `wiremock_update_mapping` | Update mapping by UUID |
| `wiremock_delete_mapping` | Delete mapping by UUID |
| `wiremock_delete_all_mappings` | Delete ALL mappings |
| `wiremock_save_mappings` | Persist mappings to disk |
| `wiremock_reset` | Reset WireMock state |
| `wiremock_start_recording` | Start recording proxied requests |
| `wiremock_stop_recording` | Stop recording and persist |
| `wiremock_recording_status` | Check recording status |
| `wiremock_snapshot` | Capture point-in-time snapshot |
| `wiremock_get_requests` | Get request log |
| `wiremock_count_requests` | Count matching requests |
| `wiremock_unmatched_requests` | Find unmatched requests |
| `wiremock_status` | Check server status |

**Env**: `WIREMOCK_URL` (default: `http://localhost:8081`)

### @stubrix/stubrix-mcp
Full control of the Stubrix Control Plane API (`/api/`).

| Tool | Description |
|------|-------------|
| `stubrix_list_projects` | List all projects |
| `stubrix_get_project` | Get project by ID |
| `stubrix_create_project` | Create a new project |
| `stubrix_update_project` | Update project |
| `stubrix_delete_project` | Delete project |
| `stubrix_list_mocks` | List mocks for project |
| `stubrix_get_mock` | Get mock by ID |
| `stubrix_create_mock` | Create mock mapping |
| `stubrix_update_mock` | Update mock mapping |
| `stubrix_delete_mock` | Delete mock mapping |
| `stubrix_start_recording` | Start recording for project |
| `stubrix_stop_recording` | Stop recording |
| `stubrix_recording_status` | Check recording status |
| `stubrix_get_status` | Platform status |
| `stubrix_engine_status` | Engine health |
| `stubrix_engine_reset` | Reset engine state |
| `stubrix_get_logs` | Get request logs |
| `stubrix_list_db_engines` | List database engines |
| `stubrix_list_databases` | List databases |
| `stubrix_get_database_info` | Get database details |
| `stubrix_list_snapshots` | List snapshots |
| `stubrix_create_snapshot` | Create snapshot |
| `stubrix_restore_snapshot` | Restore snapshot |
| `stubrix_delete_snapshot` | Delete snapshot |
| `stubrix_list_db_configs` | List project DB configs |
| `stubrix_create_db_config` | Create DB config |
| `stubrix_delete_db_config` | Delete DB config |

**Env**: `STUBRIX_API_URL` (default: `http://localhost:9090`)

### @stubrix/docker-mcp
Docker Compose management scoped to Stubrix profiles.

| Tool | Description |
|------|-------------|
| `docker_ps` | List containers |
| `docker_compose_up` | Start profiles (detached) |
| `docker_compose_down` | Stop profiles |
| `docker_compose_restart` | Restart profiles |
| `docker_logs` | Get service logs |
| `docker_inspect` | Inspect container |
| `docker_health` | Health overview |
| `docker_build` | Build images |
| `docker_exec` | Execute command in container |
| `docker_volumes` | List volumes |
| `docker_stop_all` | Stop all services |
| `docker_network` | Show networks |

**Env**: `COMPOSE_PROJECT_DIR` (default: current directory)

## Installation

```bash
# Install all MCP servers
cd packages/mcp && npm install

# Install individual servers
cd packages/mcp/wiremock-mcp && npm install
cd packages/mcp/stubrix-mcp && npm install  
cd packages/mcp/docker-mcp && npm install
```

## Development

Each MCP server can be run independently for development:

```bash
# WireMock MCP
cd packages/mcp/wiremock-mcp && npm start

# Stubrix MCP  
cd packages/mcp/stubrix-mcp && npm start

# Docker MCP
cd packages/mcp/docker-mcp && npm start
```

## Requirements

- **Node.js** >= 24 (required by all MCP servers)
- **Docker** and **Docker Compose** (for docker-mcp)
- **WireMock** running on port 8081 (for wiremock-mcp)
- **Stubrix API** running on port 9090 (for stubrix-mcp)

## Project Structure

```
packages/mcp/
├── README.md                    # This file
├── mcp-config-snippet.json      # Configuration template
├── wiremock-mcp/               # WireMock Admin API MCP
│   ├── package.json
│   └── src/index.js
├── stubrix-mcp/                # Stubrix Control Plane API MCP  
│   ├── package.json
│   └── src/index.js
└── docker-mcp/                 # Docker Compose MCP
    ├── package.json
    └── src/index.js
```

## Usage Examples

### WireMock Operations
```javascript
// List all mappings
await wiremock_list_mappings()

// Create a new mapping
await wiremock_create_mapping({
  request: { method: "GET", url: "/api/test" },
  response: { status: 200, body: "Hello World" }
})
```

### Stubrix Platform Management
```javascript
// List all projects
await stubrix_list_projects()

// Create a new project
await stubrix_create_project({
  name: "My Project",
  description: "Test project"
})
```

### Docker Compose Management
```javascript
// Start WireMock profile
await docker_compose_up(["wiremock"])

// Check service health
await docker_health()
```

## Configuration

### Environment Variables

Each MCP server can be configured via environment variables:

| Server | Variable | Default | Description |
|--------|----------|---------|-------------|
| wiremock-mcp | `WIREMOCK_URL` | `http://localhost:8081` | WireMock server URL |
| stubrix-mcp | `STUBRIX_API_URL` | `http://localhost:9090` | Stubrix API base URL |
| docker-mcp | `COMPOSE_PROJECT_DIR` | `.` | Docker Compose project directory |

### Windsurf Configuration

Add to your `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "wiremock-mcp": {
      "command": "node",
      "args": ["/path/to/stubrix/packages/mcp/wiremock-mcp/src/index.js"],
      "env": {
        "WIREMOCK_URL": "http://localhost:8081"
      }
    },
    "stubrix-mcp": {
      "command": "node",
      "args": ["/path/to/stubrix/packages/mcp/stubrix-mcp/src/index.js"],
      "env": {
        "STUBRIX_API_URL": "http://localhost:9090"
      }
    },
    "docker-mcp": {
      "command": "node",
      "args": ["/path/to/stubrix/packages/mcp/docker-mcp/src/index.js"],
      "env": {
        "COMPOSE_PROJECT_DIR": "/path/to/stubrix"
      }
    }
  }
}
```

> **Note**: Use the absolute path to your stubrix repository in the `args` and `COMPOSE_PROJECT_DIR` fields.

## Troubleshooting

### Common Issues

1. **Server not starting**: Ensure Node.js >= 24 is installed
2. **Connection refused**: Verify target services are running on correct ports
3. **Permission denied**: Check file paths in configuration are correct
4. **Docker commands failing**: Ensure Docker daemon is running and user has permissions

### Debug Mode

Run MCP servers with debug logging:

```bash
DEBUG=mcp:* cd packages/mcp/wiremock-mcp && npm start
```

### Health Checks

Verify MCP server connectivity:

```bash
# Test WireMock connection
curl http://localhost:8081/__admin/

# Test Stubrix API  
curl http://localhost:9090/api/health

# Test Docker Compose
docker-compose ps
```

## Contributing

When adding new MCP servers or modifying existing ones:

1. Follow the existing package structure in `packages/mcp/`
2. Use `@stubrix/<name>-mcp` naming convention
3. Include comprehensive tool descriptions in the README
4. Update this README with new servers
5. Test with Windsurf Cascade before submitting changes

## Dependencies

All MCP servers depend on:
- `@modelcontextprotocol/sdk`: ^1.12.1
- Node.js >= 24.0.0

Each server is a lightweight wrapper around its target API with minimal dependencies.
