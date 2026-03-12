# MCP Prompts - AI-Assisted Workflows

This document describes the predefined MCP prompts available in the Stubrix MCP server that guide AI assistants through common workflows.

## Overview

The Stubrix MCP server includes **4 predefined prompts** that help AI assistants perform multi-step operations consistently. These prompts leverage the existing **27 tools** to provide guided workflows for common tasks.

## Available Prompts

### 1. setup-recording-session

**Purpose**: Guides through setting up a complete recording session for API traffic.

**Parameters**:
- `projectId` (optional): Project ID to use (will create if not provided)
- `proxyTarget` (required): Target API URL to record from
- `includePatterns` (optional): Comma-separated URL patterns to include
- `excludePatterns` (optional): Comma-separated URL patterns to exclude

**Example Usage**:
```bash
# Start recording session with filters
setup-recording-session proxyTarget="https://api.example.com" includePatterns="/api/*,/api/users/**" excludePatterns="/api/health,/api/metrics/*"

# Start recording without project (will create one)
setup-recording-session proxyTarget="https://staging.api.com"
```

**Workflow Steps**:
1. Get or create project
2. Start recording session
3. Monitor recording status
4. Stop recording when done

**Tools Used**:
- `stubrix_get_project` / `stubrix_create_project`
- `stubrix_start_recording`
- `stubrix_get_recording_status`
- `stubrix_stop_recording`

---

### 2. create-mock-from-description

**Purpose**: Creates a complete mock from natural language description.

**Parameters**:
- `projectId` (required): Project ID where to create the mock
- `description` (required): Natural language description of the mock behavior

**Example Usage**:
```bash
# Create a simple GET endpoint mock
create-mock-from-description projectId="proj_123" description="Create a GET endpoint at /api/users that returns a list of 3 users with id, name, and email"

# Create a POST endpoint mock
create-mock-from-description projectId="proj_123" description="POST /api/orders that creates a new order and returns 201 with order details"
```

**Workflow Steps**:
1. Analyze description to extract mock details
2. Extract HTTP method and URL pattern
3. Determine response status and content type
4. Generate appropriate response body
5. Create the mock using available tools

**Tools Used**:
- `stubrix_create_mock`
- `stubrix_get_project`

---

### 3. database-snapshot-cycle

**Purpose**: Guides through snapshot, make changes, and restore database workflow.

**Parameters**:
- `projectId` (required): Project ID for database operations
- `databaseEngine` (optional): Database engine (postgres, mysql, sqlite)
- `snapshotName` (optional): Custom snapshot name

**Example Usage**:
```bash
# Complete snapshot cycle for PostgreSQL
database-snapshot-cycle projectId="proj_123" databaseEngine="postgres" snapshotName="pre-migration-snapshot"

# Quick snapshot without specific engine
database-snapshot-cycle projectId="proj_123"
```

**Workflow Steps**:
1. Check database configurations
2. Create snapshot before changes
3. Make your database changes
4. Restore snapshot when needed

**Tools Used**:
- `stubrix_get_db_configs`
- `stubrix_get_databases`
- `stubrix_create_snapshot`
- `stubrix_list_snapshots`
- `stubrix_restore_snapshot`

**Best Practices**:
- Always create snapshot before making changes
- Use descriptive snapshot names
- Test database connectivity before operations
- Verify snapshot creation success

---

### 4. full-platform-health-check

**Purpose**: Comprehensive health check of all Stubrix services and components.

**Parameters**:
- `includeDatabases` (optional): Include database health check
- `includeContainers` (optional): Include Docker container health

**Example Usage**:
```bash
# Full health check including databases
full-platform-health-check includeDatabases=true includeContainers=true

# Basic health check (API and mock server only)
full-platform-health-check
```

**Workflow Steps**:
1. Check API server status
2. Check mock server engine
3. List projects and mocks
4. Check recording status
5. (Optional) Check database engines and configs
6. (Optional) Check Docker containers

**Tools Used**:
- `stubrix_get_status`
- `stubrix_get_engine_status`
- `stubrix_list_projects`
- `stubrix_get_mock_stats`
- `stubrix_list_db_engines` (if databases included)
- `stubrix_get_databases` (if databases included)

**Health Indicators**:
- ✅ API server responsive
- ✅ Mock engine running
- ✅ Projects accessible
- ✅ Mocks loading correctly
- ✅ Recording functionality
- ✅ Database connections (if included)
- ✅ Docker containers healthy (if included)

---

## MCP Configuration

Add these prompts to your MCP configuration:

```json
{
  "mcpServers": {
    "stubrix-mcp": {
      "command": "node",
      "args": ["packages/mcp/stubrix-mcp/src/index.js"],
      "env": { "STUBRIX_API_URL": "http://localhost:9090" }
    }
  }
}
```

## Usage Examples

### Example 1: Recording Session Setup

```
You: "I need to record API calls from the staging server"
→ AI calls: setup-recording-session proxyTarget="https://staging.api.com"

AI: "I'll help you set up a complete recording session. Here's the workflow:

**Target API:** https://staging.api.com

**Steps to follow:**
- 1. Create new project
- 2. Start recording session
- 3. Monitor recording status
- 4. Stop recording when done

**Available tools:**
- `stubrix_create_project`
- `stubrix_start_recording`
- `stubrix_get_recording_status`
- `stubrix_stop_recording`

Would you like me to execute any of these steps?"
```

### Example 2: Mock Creation

```
You: "Create a mock for user authentication endpoint"
→ AI calls: create-mock-from-description projectId="proj_123" description="POST /api/auth/login that accepts email and password and returns JWT token"

AI: "I'll help you create a mock based on your description.

**Project:** proj_123
**Description:** POST /api/auth/login that accepts email and password and returns JWT token

Based on your description, I'll need to:
1. Extract HTTP method and URL pattern
2. Determine response status and content type
3. Generate appropriate response body
4. Create the mock using the available tools

Would you like me to proceed with creating this mock?"
```

### Example 3: Database Operations

```
You: "I need to run database migrations but want to be safe"
→ AI calls: database-snapshot-cycle projectId="proj_123" databaseEngine="postgres" snapshotName="pre-migration"

AI: "I'll guide you through a complete database snapshot cycle.

**Project:** proj_123
**Database Engine:** postgres
**Snapshot Name:** pre-migration

**Workflow Steps:**
- 1. Check database configurations
- 2. Create snapshot before changes
- 3. Make your database changes
- 4. Restore snapshot when needed

**Best practices:**
- Always create snapshot before making changes
- Use descriptive snapshot names
- Test database connectivity before operations

Ready to start the snapshot cycle?"
```

## Integration with AI Assistants

These prompts work seamlessly with:

- **Windsurf Cascade** - Native MCP integration
- **Cursor** - MCP server support
- **Claude Desktop** - Model Context Protocol
- **Other MCP-compatible AI assistants**

## Benefits

1. **Consistent Workflows**: Standardized approaches to common tasks
2. **Error Reduction**: Guided steps prevent mistakes
3. **Tool Discovery**: Prompts expose relevant tools for each task
4. **Context Awareness**: Prompts understand project context and dependencies
5. **Best Practices**: Built-in recommendations and safety checks

## Technical Details

### Prompt Structure

Each prompt follows this structure:
- **Description**: Clear purpose and scope
- **Parameters**: Required and optional inputs with validation
- **Workflow**: Step-by-step guidance
- **Tools**: Relevant MCP tools for the task
- **Examples**: Sample commands and usage patterns

### Error Handling

Prompts include:
- Parameter validation with Zod schemas
- Graceful error messages
- Fallback options for missing parameters
- Clear next steps when issues occur

### Extensibility

New prompts can be added by:
1. Adding `server.prompt()` calls to the MCP server
2. Defining parameter schemas with Zod
3. Implementing the prompt logic
4. Updating this documentation

## Troubleshooting

### Common Issues

1. **API Server Not Running**: Ensure Stubrix API is running on localhost:9090
2. **Missing Project ID**: Some prompts can create projects automatically
3. **Database Connection**: Check database configurations before snapshot operations
4. **Permission Issues**: Ensure proper file permissions for snapshot operations

### Debug Mode

Enable debug logging by setting:
```bash
export DEBUG=stubrix-mcp:*
```

## Future Enhancements

Planned improvements:
- Additional prompts for specific use cases
- Integration with more external services
- Enhanced error recovery workflows
- Custom prompt templates
- Prompt chaining for complex workflows
