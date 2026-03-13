#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE_URL = process.env.STUBRIX_API_URL || "http://localhost:9090";

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function api(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!res.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body, null, 2)}`,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: typeof body === "string" ? body : JSON.stringify(body, null, 2),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "stubrix-mcp",
  version: "1.0.0",
});

// ===========================================================================
// Projects
// ===========================================================================

server.tool(
  "stubrix_list_projects",
  "List all Stubrix projects.",
  {},
  async () => api("/api/projects"),
);

server.tool(
  "stubrix_get_project",
  "Get a specific Stubrix project by ID.",
  {
    projectId: z.string().describe("Project ID"),
  },
  async ({ projectId }) => api(`/api/projects/${projectId}`),
);

server.tool(
  "stubrix_create_project",
  "Create a new Stubrix project.",
  {
    name: z.string().describe("Project name"),
    description: z.string().optional().describe("Project description"),
    proxyTarget: z
      .string()
      .optional()
      .describe("Default proxy target URL for recording"),
  },
  async ({ name, description, proxyTarget }) => {
    const body = { name };
    if (description) body.description = description;
    if (proxyTarget) body.proxyTarget = proxyTarget;
    return api("/api/projects", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
);

server.tool(
  "stubrix_update_project",
  "Update an existing Stubrix project.",
  {
    projectId: z.string().describe("Project ID"),
    name: z.string().optional().describe("New project name"),
    description: z.string().optional().describe("New description"),
    proxyTarget: z.string().optional().describe("New proxy target URL"),
  },
  async ({ projectId, name, description, proxyTarget }) => {
    const body = {};
    if (name) body.name = name;
    if (description !== undefined) body.description = description;
    if (proxyTarget !== undefined) body.proxyTarget = proxyTarget;
    return api(`/api/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
);

server.tool(
  "stubrix_delete_project",
  "Delete a Stubrix project.",
  {
    projectId: z.string().describe("Project ID"),
  },
  async ({ projectId }) =>
    api(`/api/projects/${projectId}`, { method: "DELETE" }),
);

// ===========================================================================
// Mocks
// ===========================================================================

server.tool(
  "stubrix_list_mocks",
  "List all mock mappings for a project.",
  {
    projectId: z.string().describe("Project ID"),
  },
  async ({ projectId }) => api(`/api/projects/${projectId}/mocks`),
);

server.tool(
  "stubrix_get_mock",
  "Get a specific mock by ID within a project.",
  {
    projectId: z.string().describe("Project ID"),
    mockId: z.string().describe("Mock mapping ID"),
  },
  async ({ projectId, mockId }) =>
    api(`/api/projects/${projectId}/mocks/${mockId}`),
);

server.tool(
  "stubrix_create_mock",
  "Create a new mock mapping in a project. Provide the full mock definition as JSON.",
  {
    projectId: z.string().describe("Project ID"),
    mock: z
      .string()
      .describe(
        'Mock definition JSON string with request/response. Example: {"request":{"method":"GET","url":"/api/test"},"response":{"status":200,"jsonBody":{"ok":true}}}',
      ),
  },
  async ({ projectId, mock }) => {
    let parsed;
    try {
      parsed = JSON.parse(mock);
    } catch {
      return {
        content: [{ type: "text", text: "Invalid JSON in mock parameter" }],
        isError: true,
      };
    }
    return api(`/api/projects/${projectId}/mocks`, {
      method: "POST",
      body: JSON.stringify(parsed),
    });
  },
);

server.tool(
  "stubrix_update_mock",
  "Update an existing mock mapping.",
  {
    projectId: z.string().describe("Project ID"),
    mockId: z.string().describe("Mock ID"),
    mock: z.string().describe("Updated mock definition JSON string"),
  },
  async ({ projectId, mockId, mock }) => {
    let parsed;
    try {
      parsed = JSON.parse(mock);
    } catch {
      return {
        content: [{ type: "text", text: "Invalid JSON in mock parameter" }],
        isError: true,
      };
    }
    return api(`/api/projects/${projectId}/mocks/${mockId}`, {
      method: "PUT",
      body: JSON.stringify(parsed),
    });
  },
);

server.tool(
  "stubrix_delete_mock",
  "Delete a mock mapping from a project.",
  {
    projectId: z.string().describe("Project ID"),
    mockId: z.string().describe("Mock ID"),
  },
  async ({ projectId, mockId }) =>
    api(`/api/projects/${projectId}/mocks/${mockId}`, { method: "DELETE" }),
);

// ===========================================================================
// Recording
// ===========================================================================

server.tool(
  "stubrix_start_recording",
  "Start recording proxied requests for a project. Requests will be forwarded to the target URL and saved as mocks.",
  {
    projectId: z.string().describe("Project ID"),
    targetUrl: z
      .string()
      .describe("Target API URL to proxy and record from"),
  },
  async ({ projectId, targetUrl }) =>
    api(`/api/projects/${projectId}/recording/start`, {
      method: "POST",
      body: JSON.stringify({ targetUrl }),
    }),
);

server.tool(
  "stubrix_stop_recording",
  "Stop recording for a project and persist captured mocks.",
  {
    projectId: z.string().describe("Project ID"),
  },
  async ({ projectId }) =>
    api(`/api/projects/${projectId}/recording/stop`, { method: "POST" }),
);

server.tool(
  "stubrix_recording_status",
  "Get the current recording status for a project.",
  {
    projectId: z.string().describe("Project ID"),
  },
  async ({ projectId }) =>
    api(`/api/projects/${projectId}/recording/status`),
);

// ===========================================================================
// Status & Engine
// ===========================================================================

server.tool(
  "stubrix_get_status",
  "Get Stubrix platform status including engine health and mock counts.",
  {},
  async () => api("/api/status"),
);

server.tool(
  "stubrix_engine_status",
  "Get the current mock engine status (WireMock/Mockoon health).",
  {},
  async () => api("/api/engine"),
);

server.tool(
  "stubrix_engine_reset",
  "Reset the mock engine — clear all runtime state.",
  {},
  async () => api("/api/engine/reset", { method: "POST" }),
);

// ===========================================================================
// Logs
// ===========================================================================

server.tool(
  "stubrix_get_logs",
  "Get recent request logs from the Stubrix API.",
  {
    limit: z.number().optional().describe("Max number of logs to return"),
  },
  async ({ limit }) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", String(limit));
    const qs = params.toString();
    return api(`/api/logs${qs ? `?${qs}` : ""}`);
  },
);

// ===========================================================================
// Database Engines
// ===========================================================================

server.tool(
  "stubrix_list_db_engines",
  "List all available database engines (PostgreSQL, MySQL, SQLite).",
  {},
  async () => api("/api/db/engines"),
);

server.tool(
  "stubrix_list_databases",
  "List databases for a specific engine, optionally scoped to a project.",
  {
    engine: z
      .string()
      .optional()
      .describe('Database engine: "postgres", "mysql", or "sqlite"'),
    projectId: z.string().optional().describe("Project ID for scoping"),
  },
  async ({ engine, projectId }) => {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    const qs = params.toString();
    const path = engine
      ? `/api/db/engines/${engine}/databases`
      : "/api/db/databases";
    return api(`${path}${qs ? `?${qs}` : ""}`);
  },
);

server.tool(
  "stubrix_get_database_info",
  "Get detailed info about a specific database (tables, schema, size).",
  {
    name: z.string().describe("Database name"),
    engine: z
      .string()
      .optional()
      .describe('Database engine: "postgres", "mysql", or "sqlite"'),
    projectId: z.string().optional().describe("Project ID for scoping"),
  },
  async ({ name, engine, projectId }) => {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    const qs = params.toString();
    const path = engine
      ? `/api/db/engines/${engine}/databases/${name}/info`
      : `/api/db/databases/${name}/info`;
    return api(`${path}${qs ? `?${qs}` : ""}`);
  },
);

// ===========================================================================
// Snapshots
// ===========================================================================

server.tool(
  "stubrix_list_snapshots",
  "List all database snapshots, optionally filtered by project.",
  {
    projectId: z.string().optional().describe("Filter snapshots by project ID"),
  },
  async ({ projectId }) => {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    const qs = params.toString();
    return api(`/api/db/snapshots${qs ? `?${qs}` : ""}`);
  },
);

server.tool(
  "stubrix_create_snapshot",
  "Create a new database snapshot.",
  {
    database: z.string().describe("Database name to snapshot"),
    name: z.string().describe("Snapshot name (used as filename)"),
    engine: z
      .string()
      .optional()
      .describe('Database engine: "postgres", "mysql", or "sqlite"'),
    projectId: z
      .string()
      .optional()
      .describe("Project ID to associate with this snapshot"),
  },
  async ({ database, name, engine, projectId }) => {
    const body = { database, name };
    if (projectId) body.projectId = projectId;
    const path = engine
      ? `/api/db/engines/${engine}/snapshots`
      : "/api/db/snapshots";
    return api(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
);

server.tool(
  "stubrix_restore_snapshot",
  "Restore a database from a snapshot.",
  {
    snapshotName: z.string().describe("Name of the snapshot to restore"),
    database: z
      .string()
      .optional()
      .describe("Target database name (defaults to original)"),
    engine: z
      .string()
      .optional()
      .describe('Database engine: "postgres", "mysql", or "sqlite"'),
  },
  async ({ snapshotName, database, engine }) => {
    const body = {};
    if (database) body.database = database;
    const path = engine
      ? `/api/db/engines/${engine}/snapshots/${snapshotName}/restore`
      : `/api/db/snapshots/${snapshotName}/restore`;
    return api(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
);

server.tool(
  "stubrix_delete_snapshot",
  "Delete a database snapshot.",
  {
    snapshotName: z.string().describe("Name of the snapshot to delete"),
  },
  async ({ snapshotName }) =>
    api(`/api/db/snapshots/${snapshotName}`, { method: "DELETE" }),
);

// ===========================================================================
// Project Database Configs
// ===========================================================================

server.tool(
  "stubrix_list_db_configs",
  "List database configurations for a project.",
  {
    projectId: z.string().describe("Project ID"),
  },
  async ({ projectId }) =>
    api(`/api/projects/${projectId}/databases/configs`),
);

server.tool(
  "stubrix_create_db_config",
  "Create a database configuration for a project.",
  {
    projectId: z.string().describe("Project ID"),
    config: z
      .string()
      .describe(
        'Database config JSON string. Example: {"engine":"postgres","database":"mydb","host":"localhost","port":5442}',
      ),
  },
  async ({ projectId, config }) => {
    let parsed;
    try {
      parsed = JSON.parse(config);
    } catch {
      return {
        content: [{ type: "text", text: "Invalid JSON in config parameter" }],
        isError: true,
      };
    }
    return api(`/api/projects/${projectId}/databases/configs`, {
      method: "POST",
      body: JSON.stringify(parsed),
    });
  },
);

server.tool(
  "stubrix_delete_db_config",
  "Delete a database configuration from a project.",
  {
    projectId: z.string().describe("Project ID"),
    configId: z.string().describe("Database config ID"),
  },
  async ({ projectId, configId }) =>
    api(`/api/projects/${projectId}/databases/configs/${configId}`, {
      method: "DELETE",
    }),
);

// ---------------------------------------------------------------------------
// MCP Prompts - Predefined workflows for AI assistants
// ---------------------------------------------------------------------------

server.prompt(
  "setup-recording-session",
  "Guides through setting up a complete recording session for API traffic",
  {
    projectId: z.string().optional().describe("Optional: Project ID to use (will create if not provided)"),
    proxyTarget: z.string().describe("Target API URL to record from (e.g., https://api.example.com)"),
    includePatterns: z.string().optional().describe("Optional: Comma-separated URL patterns to include (e.g., /api/*,/api/users/**)"),
    excludePatterns: z.string().optional().describe("Optional: Comma-separated URL patterns to exclude (e.g., /api/health,/api/metrics/*)"),
  },
  async ({ projectId, proxyTarget, includePatterns, excludePatterns }) => {
    const steps = [];
    const tools = [];
    
    // Step 1: Get or create project
    if (projectId) {
      steps.push("1. Get existing project");
      tools.push("stubrix_get_project");
    } else {
      steps.push("1. Create new project");
      tools.push("stubrix_create_project");
    }
    
    // Step 2: Start recording
    steps.push("2. Start recording session");
    tools.push("stubrix_start_recording");
    
    // Step 3: Monitor recording
    steps.push("3. Monitor recording status");
    tools.push("stubrix_get_recording_status");
    
    // Step 4: Stop recording
    steps.push("4. Stop recording when done");
    tools.push("stubrix_stop_recording");
    
    const prompt = `I'll help you set up a complete recording session. Here's the workflow:

**Target API:** ${proxyTarget}
${includePatterns ? `**Include Patterns:** ${includePatterns}` : ''}
${excludePatterns ? `**Exclude Patterns:** ${excludePatterns}` : ''}

**Steps to follow:**
${steps.map(step => `- ${step}`).join('\n')}

**Available tools:**
${tools.map(tool => `- \`${tool}\``).join('\n')}

**Example commands:**
\`\`\`bash
# Step 1 - Get or create project
${projectId ? `stubrix_get_project projectId="${projectId}"` : `stubrix_create_project name="API Recording" description="Recording session for ${proxyTarget}"`}

# Step 2 - Start recording
stubrix_start_recording projectId="${projectId || 'NEW_PROJECT_ID'}" proxyTarget="${proxyTarget}"${includePatterns ? ` includePatterns="${includePatterns}"` : ''}${excludePatterns ? ` excludePatterns="${excludePatterns}"` : ''}

# Step 3 - Check status
stubrix_get_recording_status projectId="${projectId || 'NEW_PROJECT_ID'}"

# Step 4 - Stop when done
stubrix_stop_recording projectId="${projectId || 'NEW_PROJECT_ID'}"
\`\`\`

**Next actions:**
1. ${projectId ? 'Get the project details' : 'Create a new project'}
2. Start the recording session
3. Make your API calls against localhost:8081
4. Stop recording to persist mocks

Would you like me to execute any of these steps?`;

    return {
      content: [{ type: "text", text: prompt }],
    };
  },
);

server.prompt(
  "create-mock-from-description",
  "Creates a complete mock from natural language description",
  {
    projectId: z.string().describe("Project ID where to create the mock"),
    description: z.string().describe("Natural language description of the mock behavior"),
  },
  async ({ projectId, description }) => {
    const prompt = `I'll help you create a mock based on your description.

**Project:** ${projectId}
**Description:** ${description}

**Let me analyze this and create the appropriate mock...**

Based on your description, I'll need to:
1. Extract HTTP method and URL pattern
2. Determine response status and content type
3. Generate appropriate response body
4. Create the mock using the available tools

**Available tools:**
- \`stubrix_create_mock\` - Create the actual mock
- \`stubrix_get_project\` - Get project details if needed

**Example mock structure:**
\`\`\`json
{
  "request": {
    "method": "GET|POST|PUT|DELETE",
    "url": "/api/endpoint"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": "{...response data...}"
  }
}
\`\`\`

**Next steps:**
1. I'll analyze your description to extract the mock details
2. Create the mock with appropriate parameters
3. Confirm the mock was created successfully

Would you like me to proceed with creating this mock?`;

    return {
      content: [{ type: "text", text: prompt }],
    };
  },
);

server.prompt(
  "database-snapshot-cycle",
  "Guides through snapshot, make changes, and restore database workflow",
  {
    projectId: z.string().describe("Project ID for database operations"),
    databaseEngine: z.string().optional().describe("Optional: Database engine (postgres, mysql, sqlite)"),
    snapshotName: z.string().optional().describe("Optional: Custom snapshot name"),
  },
  async ({ projectId, databaseEngine, snapshotName }) => {
    const steps = [
      "1. Check database configurations",
      "2. Create snapshot before changes",
      "3. Make your database changes",
      "4. Restore snapshot when needed"
    ];
    
    const tools = [
      "stubrix_get_db_configs",
      "stubrix_get_databases",
      "stubrix_create_snapshot",
      "stubrix_list_snapshots",
      "stubrix_restore_snapshot"
    ];
    
    const prompt = `I'll guide you through a complete database snapshot cycle.

**Project:** ${projectId}
${databaseEngine ? `**Database Engine:** ${databaseEngine}` : ''}
${snapshotName ? `**Snapshot Name:** ${snapshotName}` : ''}

**Workflow Steps:**
${steps.map(step => `- ${step}`).join('\n')}

**Available tools:**
${tools.map(tool => `- \`${tool}\``).join('\n')}

**Example commands:**
\`\`\`bash
# Step 1 - Check database configs
stubrix_get_db_configs projectId="${projectId}"

# Step 2 - List available databases
stubrix_get_databases projectId="${projectId}"${databaseEngine ? ` engine="${databaseEngine}"` : ''}

# Step 3 - Create snapshot
stubrix_create_snapshot projectId="${projectId}"${databaseEngine ? ` engine="${databaseEngine}"` : ''}${snapshotName ? ` name="${snapshotName}"` : ''}

# Step 4 - List snapshots
stubrix_list_snapshots projectId="${projectId}"

# Step 5 - Restore when needed
stubrix_restore_snapshot projectId="${projectId}" name="SNAPSHOT_NAME"${databaseEngine ? ` engine="${databaseEngine}"` : ''}
\`\`\`

**Best practices:**
- Always create snapshot before making changes
- Use descriptive snapshot names
- Test database connectivity before operations
- Verify snapshot creation success

**Next actions:**
1. Check your database configurations
2. Create a snapshot before making changes
3. Proceed with your database operations
4. Restore if needed

Ready to start the snapshot cycle?`;

    return {
      content: [{ type: "text", text: prompt }],
    };
  },
);

server.prompt(
  "full-platform-health-check",
  "Comprehensive health check of all Stubrix services and components",
  {
    includeDatabases: z.boolean().optional().describe("Optional: Include database health check"),
    includeContainers: z.boolean().optional().describe("Optional: Include Docker container health"),
  },
  async ({ includeDatabases, includeContainers }) => {
    const checks = [
      "1. Check API server status",
      "2. Check mock server engine",
      "3. List projects and mocks",
      "4. Check recording status"
    ];
    
    const tools = [
      "stubrix_get_status",
      "stubrix_get_engine_status",
      "stubrix_list_projects",
      "stubrix_get_mock_stats"
    ];
    
    if (includeDatabases) {
      checks.push("5. Check database engines and configs");
      tools.push("stubrix_list_db_engines", "stubrix_get_databases");
    }
    
    if (includeContainers) {
      checks.push("6. Check Docker containers");
      // Note: Container checks would require docker-mcp tools
    }
    
    const prompt = `I'll perform a comprehensive health check of your Stubrix platform.

**Health Check Scope:**
${includeDatabases ? '✅ Include database checks' : ''}
${includeContainers ? '✅ Include container checks' : ''}

**Health Check Steps:**
${checks.map(step => `- ${step}`).join('\n')}

**Available tools:**
${tools.map(tool => `- \`${tool}\``).join('\n')}

**Example health check commands:**
\`\`\`bash
# Step 1 - API Status
stubrix_get_status

# Step 2 - Engine Status
stubrix_get_engine_status

# Step 3 - Projects Overview
stubrix_list_projects

# Step 4 - Mock Statistics
stubrix_get_mock_stats${includeDatabases ? `
# Step 5 - Database Engines
stubrix_list_db_engines` : ''}${includeDatabases ? `
# Step 6 - Database Health
stubrix_get_databases projectId="PROJECT_ID"` : ''}
\`\`\`

**Health indicators to check:**
- ✅ API server responsive
- ✅ Mock engine running
- ✅ Projects accessible
- ✅ Mocks loading correctly
- ✅ Recording functionality
${includeDatabases ? '- ✅ Database connections' : ''}
${includeContainers ? '- ✅ Docker containers healthy' : ''}

**Next steps:**
1. Run the health check commands
2. Analyze results for any issues
3. Provide recommendations for fixes

Ready to start the health check?`;

    return {
      content: [{ type: "text", text: prompt }],
    };
  },
);

// ===========================================================================
// Stateful Mocks (F10)
// ===========================================================================

server.tool(
  "stateful_mock_list",
  "List all stateful mocks (Mock ↔ DB Sync).",
  {},
  async () => api("/api/stateful/mocks"),
);

server.tool(
  "stateful_mock_get",
  "Get a specific stateful mock by ID.",
  {
    id: z.string().describe("Stateful mock ID"),
  },
  async ({ id }) => api(`/api/stateful/mocks/${id}`),
);

server.tool(
  "stateful_mock_create",
  "Create a stateful mock that responds with live data from a database query rendered through a Handlebars template.",
  {
    name: z.string().describe("Human-readable name for the mock"),
    description: z.string().optional().describe("Optional description"),
    method: z.string().describe("HTTP method (GET, POST, etc.)"),
    urlPath: z.string().optional().describe("Exact URL path to match, e.g. /api/users"),
    urlPattern: z.string().optional().describe("Regex URL pattern to match"),
    stateEngine: z.enum(["postgres", "mysql", "sqlite"]).describe("Database engine to query"),
    stateDatabase: z.string().optional().describe("Database name (optional, uses default if omitted)"),
    stateQuery: z.string().describe("READ-ONLY SQL query to execute, e.g. SELECT * FROM users"),
    stateTemplate: z
      .string()
      .describe(
        "Handlebars template for the response body. Available: {{json state.rows}}, {{state.rowCount}}, {{request.method}}, {{request.url}}. Helpers: {{json}}, {{pick state.rows 0}}, {{first state.rows}}, {{last state.rows}}",
      ),
    responseStatus: z.number().optional().describe("HTTP response status (default: 200)"),
    fallbackBody: z.string().optional().describe("Static body returned if DB query fails"),
    queryTimeoutMs: z.number().optional().describe("Query timeout in milliseconds (default: 5000)"),
    cacheTtlSeconds: z.number().optional().describe("Cache TTL in seconds, 0 = disabled (default: 0)"),
  },
  async ({
    name,
    description,
    method,
    urlPath,
    urlPattern,
    stateEngine,
    stateDatabase,
    stateQuery,
    stateTemplate,
    responseStatus,
    fallbackBody,
    queryTimeoutMs,
    cacheTtlSeconds,
  }) =>
    api("/api/stateful/mocks", {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        request: { method, urlPath, urlPattern },
        stateConfig: {
          stateEngine,
          stateDatabase,
          stateQuery,
          stateTemplate,
          queryTimeoutMs,
          cacheTtlSeconds,
        },
        response: {
          status: responseStatus ?? 200,
          headers: { "Content-Type": "application/json" },
          fallbackBody,
        },
      }),
    }),
);

server.tool(
  "stateful_mock_update",
  "Update an existing stateful mock.",
  {
    id: z.string().describe("Stateful mock ID"),
    name: z.string().optional(),
    description: z.string().optional(),
    stateQuery: z.string().optional().describe("New SQL query"),
    stateTemplate: z.string().optional().describe("New Handlebars template"),
    queryTimeoutMs: z.number().optional(),
    cacheTtlSeconds: z.number().optional(),
  },
  async ({ id, name, description, stateQuery, stateTemplate, queryTimeoutMs, cacheTtlSeconds }) => {
    const body = {};
    if (name) body.name = name;
    if (description) body.description = description;
    if (stateQuery || stateTemplate || queryTimeoutMs !== undefined || cacheTtlSeconds !== undefined) {
      body.stateConfig = { stateQuery, stateTemplate, queryTimeoutMs, cacheTtlSeconds };
    }
    return api(`/api/stateful/mocks/${id}`, { method: "PUT", body: JSON.stringify(body) });
  },
);

server.tool(
  "stateful_mock_delete",
  "Delete a stateful mock by ID.",
  {
    id: z.string().describe("Stateful mock ID"),
  },
  async ({ id }) => api(`/api/stateful/mocks/${id}`, { method: "DELETE" }),
);

server.tool(
  "stateful_mock_test",
  "Test a stateful mock against the current database state and return the rendered response.",
  {
    id: z.string().describe("Stateful mock ID"),
    method: z.string().optional().describe("Override request method for testing"),
    url: z.string().optional().describe("Override URL for testing"),
  },
  async ({ id, method, url }) =>
    api(`/api/stateful/mocks/${id}/test`, {
      method: "POST",
      body: JSON.stringify({ method: method ?? "GET", url: url ?? "/test" }),
    }),
);

server.tool(
  "stateful_mock_preview",
  "Preview the rendered response of a stateful mock using sample data (no real DB query).",
  {
    id: z.string().describe("Stateful mock ID"),
  },
  async ({ id }) => api(`/api/stateful/mocks/${id}/preview`),
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
