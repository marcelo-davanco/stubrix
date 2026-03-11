# Stubrix Custom MCP Servers

Custom [Model Context Protocol](https://modelcontextprotocol.io/) servers built for the Stubrix platform. These provide direct programmatic access to WireMock, the Stubrix API, and Docker Compose from AI coding assistants like Windsurf Cascade.

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
cd packages/mcp/wiremock-mcp && npm install
cd packages/mcp/stubrix-mcp && npm install
cd packages/mcp/docker-mcp && npm install
```

## Windsurf Configuration

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

## Requirements
- Node.js >= 20
- Docker and Docker Compose (for docker-mcp)
- WireMock running (for wiremock-mcp)
- Stubrix API running (for stubrix-mcp)
