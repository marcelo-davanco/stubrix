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
// Universal Import (F23)
// ===========================================================================

server.tool(
  "import_formats",
  "List all supported import formats (HAR, Postman, OpenAPI, Swagger).",
  {},
  async () => api("/api/import/formats", { method: "POST" }),
);

server.tool(
  "import_preview",
  "Preview what mocks would be imported from content without actually creating them.",
  {
    content: z.string().describe("Raw content of the file (HAR JSON, Postman JSON, OpenAPI JSON/YAML)"),
    filename: z.string().optional().describe("Original filename to help detect format (e.g., spec.yaml, collection.json)"),
    baseUrl: z.string().optional().describe("Base URL for OpenAPI specs without a server block"),
  },
  async ({ content, filename, baseUrl }) =>
    api("/api/import/preview", {
      method: "POST",
      body: JSON.stringify({ content, filename, baseUrl }),
    }),
);

server.tool(
  "import_url",
  "Import mocks from a URL (e.g., a public OpenAPI spec URL). Auto-detects format.",
  {
    url: z.string().describe("URL of the spec/collection to import (must be publicly accessible)"),
    projectId: z.string().describe("Target project ID"),
    deduplicate: z.boolean().optional().describe("Skip duplicate mappings (default: true)"),
    overwrite: z.boolean().optional().describe("Overwrite existing mappings (default: false)"),
    filterMethods: z.array(z.string()).optional().describe("Only import specific HTTP methods, e.g. ['GET', 'POST']"),
    filterStatusCodes: z.array(z.number()).optional().describe("Only import specific response status codes, e.g. [200, 201]"),
  },
  async ({ url, projectId, deduplicate, overwrite, filterMethods, filterStatusCodes }) =>
    api("/api/import/url", {
      method: "POST",
      body: JSON.stringify({ url, projectId, deduplicate, overwrite, filterMethods, filterStatusCodes }),
    }),
);

server.tool(
  "import_content",
  "Import mocks from raw file content (HAR, Postman Collection v2.1, OpenAPI 3.x, Swagger 2.0). Auto-detects format.",
  {
    content: z.string().describe("Raw content of the file to import"),
    projectId: z.string().describe("Target project ID"),
    filename: z.string().optional().describe("Original filename to help detect format"),
    deduplicate: z.boolean().optional().describe("Skip duplicate mappings (default: true)"),
    overwrite: z.boolean().optional().describe("Overwrite existing mappings (default: false)"),
    filterMethods: z.array(z.string()).optional().describe("Only import specific HTTP methods"),
    filterStatusCodes: z.array(z.number()).optional().describe("Only import specific response status codes"),
  },
  async ({ content, projectId, filename, deduplicate, overwrite, filterMethods, filterStatusCodes }) =>
    api("/api/import/content", {
      method: "POST",
      body: JSON.stringify({ content, projectId, filename, deduplicate, overwrite, filterMethods, filterStatusCodes }),
    }),
);

// ===========================================================================
// Time Machine — Scenario Capture & Restore (F11)
// ===========================================================================

server.tool(
  "scenario_list",
  "List all captured Time Machine scenarios.",
  {},
  async () => api("/api/scenarios"),
);

server.tool(
  "scenario_capture",
  "Capture current environment state (mocks + config) as a named scenario.",
  {
    name: z.string().describe("Scenario name"),
    description: z.string().optional().describe("Optional description"),
    tags: z.array(z.string()).optional().describe("Optional tags"),
  },
  async ({ name, description, tags }) =>
    api("/api/scenarios/capture", {
      method: "POST",
      body: JSON.stringify({ name, description, tags }),
    }),
);

server.tool(
  "scenario_restore",
  "Restore environment from a previously captured scenario.",
  {
    id: z.string().describe("Scenario UUID"),
  },
  async ({ id }) =>
    api(`/api/scenarios/${id}/restore`, { method: "POST" }),
);

server.tool(
  "scenario_diff",
  "Compare two scenarios and show differences in mocks and configuration.",
  {
    idA: z.string().describe("First scenario UUID"),
    idB: z.string().describe("Second scenario UUID"),
  },
  async ({ idA, idB }) => api(`/api/scenarios/${idA}/diff/${idB}`),
);

server.tool(
  "scenario_delete",
  "Delete a captured scenario by ID.",
  {
    id: z.string().describe("Scenario UUID to delete"),
  },
  async ({ id }) =>
    api(`/api/scenarios/${id}`, { method: "DELETE" }),
);

// ===========================================================================
// Intelligence — OpenRAG + MCP AI Layer (F9)
// ===========================================================================

server.tool(
  "rag_query",
  "Ask a natural language question about mocks, docs, or DB schemas using the RAG intelligence layer.",
  {
    question: z.string().describe("Natural language question"),
  },
  async ({ question }) =>
    api("/api/intelligence/query", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),
);

server.tool(
  "rag_suggest_mock",
  "Generate a WireMock mapping suggestion from a natural language endpoint description.",
  {
    description: z.string().describe("Natural language description, e.g. 'GET /users returns list of users with 200'"),
  },
  async ({ description }) =>
    api("/api/intelligence/suggest/mock", {
      method: "POST",
      body: JSON.stringify({ description }),
    }),
);

server.tool(
  "rag_suggest_data",
  "Generate SQL seed data from a natural language description.",
  {
    description: z.string().describe("Natural language description, e.g. 'Insert 10 users into users table'"),
  },
  async ({ description }) =>
    api("/api/intelligence/suggest/data", {
      method: "POST",
      body: JSON.stringify({ description }),
    }),
);

server.tool(
  "rag_index",
  "Index all current mock mappings into the RAG vector store for AI queries.",
  {},
  async () =>
    api("/api/intelligence/index", { method: "POST" }),
);

server.tool(
  "rag_health",
  "Check if the OpenRAG AI service is available.",
  {},
  async () => api("/api/intelligence/health"),
);

// ===========================================================================
// Chaos Engineering — Fault Injection (F14)
// ===========================================================================

server.tool(
  "chaos_list_profiles",
  "List all active chaos fault injection profiles.",
  {},
  async () => api("/api/chaos/profiles"),
);

server.tool(
  "chaos_create_profile",
  "Create a fault injection profile (delay, error, timeout, etc.).",
  {
    name: z.string().describe("Profile name"),
    faults: z.array(z.object({
      type: z.string().describe("Fault type: delay | error | timeout | random_error | bandwidth_limit"),
      probability: z.number().min(0).max(1).describe("Probability 0.0-1.0"),
      delayMs: z.number().optional(),
      errorStatus: z.number().optional(),
      errorMessage: z.string().optional(),
    })).describe("List of fault rules"),
    urlPattern: z.string().optional().describe("Regex to match URLs"),
    description: z.string().optional(),
  },
  async ({ name, faults, urlPattern, description }) =>
    api("/api/chaos/profiles", {
      method: "POST",
      body: JSON.stringify({ name, faults, urlPattern, description }),
    }),
);

server.tool(
  "chaos_list_presets",
  "List built-in chaos presets (slow-network, flaky-service, total-outage, timeout).",
  {},
  async () => api("/api/chaos/presets"),
);

server.tool(
  "chaos_apply_preset",
  "Apply a built-in chaos preset as a new fault profile.",
  {
    preset: z.string().describe("Preset name: slow-network | flaky-service | total-outage | timeout"),
    urlPattern: z.string().optional().describe("Optional URL regex filter"),
  },
  async ({ preset, urlPattern }) =>
    api("/api/chaos/presets/apply", {
      method: "POST",
      body: JSON.stringify({ preset, urlPattern }),
    }),
);

server.tool(
  "chaos_toggle_profile",
  "Enable or disable a chaos fault profile.",
  {
    id: z.string().describe("Profile UUID"),
    enabled: z.boolean().describe("true to enable, false to disable"),
  },
  async ({ id, enabled }) =>
    api(`/api/chaos/profiles/${id}/toggle`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),
);

// ===========================================================================
// Contract Testing — Pact Broker (F13)
// ===========================================================================

server.tool(
  "contract_list",
  "List all latest pact contracts from Pact Broker.",
  {},
  async () => api("/api/contracts/pacts"),
);

server.tool(
  "contract_can_i_deploy",
  "Check if a pacticipant version can be safely deployed to production.",
  {
    pacticipant: z.string().describe("Consumer or provider name"),
    version: z.string().describe("Version to check (e.g. '1.2.3' or git SHA)"),
  },
  async ({ pacticipant, version }) =>
    api(`/api/contracts/can-i-deploy?pacticipant=${encodeURIComponent(pacticipant)}&version=${encodeURIComponent(version)}`),
);

server.tool(
  "contract_broker_health",
  "Check if the Pact Broker is available.",
  {},
  async () => api("/api/contracts/health"),
);

// ===========================================================================
// Network Chaos — Toxiproxy (F26)
// ===========================================================================

server.tool(
  "network_list_proxies",
  "List all Toxiproxy network proxies.",
  {},
  async () => api("/api/chaos-network/proxies"),
);

server.tool(
  "network_create_proxy",
  "Create a Toxiproxy proxy to intercept a service.",
  {
    name: z.string().describe("Proxy name"),
    listen: z.string().describe("Listen address e.g. '0.0.0.0:8475'"),
    upstream: z.string().describe("Upstream address e.g. 'db-postgres:5432'"),
  },
  async ({ name, listen, upstream }) =>
    api("/api/chaos-network/proxies", {
      method: "POST",
      body: JSON.stringify({ name, listen, upstream }),
    }),
);

server.tool(
  "network_apply_preset",
  "Apply a network chaos preset to a proxy (latency, bandwidth, packet-loss, slow-close).",
  {
    proxyName: z.string().describe("Toxiproxy proxy name"),
    preset: z.string().describe("Preset: latency | bandwidth | packet-loss | slow-close"),
  },
  async ({ proxyName, preset }) =>
    api(`/api/chaos-network/proxies/${proxyName}/presets`, {
      method: "POST",
      body: JSON.stringify({ preset }),
    }),
);

server.tool(
  "network_list_presets",
  "List available network chaos presets.",
  {},
  async () => api("/api/chaos-network/presets"),
);

server.tool(
  "network_toxiproxy_health",
  "Check if Toxiproxy is available.",
  {},
  async () => api("/api/chaos-network/health"),
);

// ===========================================================================
// Webhooks — Receiver, Replay & Simulator (F25)
// ===========================================================================

server.tool(
  "webhook_list_events",
  "List received webhook events.",
  {
    limit: z.number().optional().describe("Max events to return (default 50)"),
    endpoint: z.string().optional().describe("Filter by endpoint path"),
  },
  async ({ limit, endpoint }) => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (endpoint) params.set("endpoint", endpoint);
    return api(`/api/webhooks/events?${params}`);
  },
);

server.tool(
  "webhook_replay",
  "Replay a received webhook event to its original (or a new) target URL.",
  {
    id: z.string().describe("Webhook event ID"),
    targetUrl: z.string().optional().describe("Override target URL"),
  },
  async ({ id, targetUrl }) => {
    const params = targetUrl ? `?targetUrl=${encodeURIComponent(targetUrl)}` : "";
    return api(`/api/webhooks/events/${id}/replay${params}`, { method: "POST" });
  },
);

server.tool(
  "webhook_clear",
  "Clear all stored webhook events.",
  {},
  async () => api("/api/webhooks/events", { method: "DELETE" }),
);

server.tool(
  "webhook_create_simulation",
  "Create a fake webhook simulation to fire at a target URL.",
  {
    name: z.string().describe("Simulation name"),
    targetUrl: z.string().describe("URL to send the webhook to"),
    method: z.string().optional().describe("HTTP method (default POST)"),
    payload: z.record(z.unknown()).optional().describe("Webhook payload"),
  },
  async ({ name, targetUrl, method, payload }) =>
    api("/api/webhooks/simulations", {
      method: "POST",
      body: JSON.stringify({ name, targetUrl, method: method ?? "POST", payload: payload ?? {} }),
    }),
);

server.tool(
  "webhook_fire_simulation",
  "Fire a webhook simulation to its configured target URL.",
  {
    id: z.string().describe("Simulation UUID"),
  },
  async ({ id }) => api(`/api/webhooks/simulations/${id}/fire`, { method: "POST" }),
);

// ===========================================================================
// Events — Kafka & RabbitMQ (F16)
// ===========================================================================

server.tool(
  "event_publish",
  "Publish an event to Kafka (Redpanda) or RabbitMQ.",
  {
    broker: z.enum(["kafka", "rabbitmq"]).describe("Message broker"),
    topic: z.string().describe("Kafka topic or RabbitMQ exchange name"),
    payload: z.record(z.unknown()).describe("Event payload"),
  },
  async ({ broker, topic, payload }) =>
    api("/api/events/publish", {
      method: "POST",
      body: JSON.stringify({ broker, topic, payload }),
    }),
);

server.tool(
  "event_list_templates",
  "List saved event templates.",
  {},
  async () => api("/api/events/templates"),
);

server.tool(
  "event_create_template",
  "Create a reusable event template for Kafka or RabbitMQ.",
  {
    name: z.string().describe("Template name"),
    broker: z.enum(["kafka", "rabbitmq"]),
    topic: z.string().describe("Kafka topic or RabbitMQ exchange"),
    payload: z.record(z.unknown()).describe("Event payload"),
  },
  async ({ name, broker, topic, payload }) =>
    api("/api/events/templates", {
      method: "POST",
      body: JSON.stringify({ name, broker, topic, payload }),
    }),
);

server.tool(
  "event_fire_template",
  "Fire a saved event template.",
  {
    id: z.string().describe("Template UUID"),
  },
  async ({ id }) => api(`/api/events/templates/${id}/fire`, { method: "POST" }),
);

server.tool(
  "event_health",
  "Check Kafka and RabbitMQ availability.",
  {},
  async () => api("/api/events/health"),
);

// ===========================================================================
// Protocols — GraphQL & gRPC (F15)
// ===========================================================================

server.tool(
  "protocol_list_mocks",
  "List protocol mocks (graphql, grpc, rest).",
  {
    protocol: z.enum(["graphql", "grpc", "rest"]).optional().describe("Filter by protocol"),
  },
  async ({ protocol }) => {
    const params = protocol ? `?protocol=${protocol}` : "";
    return api(`/api/protocols/mocks${params}`);
  },
);

server.tool(
  "protocol_create_mock",
  "Create a GraphQL or gRPC protocol mock.",
  {
    protocol: z.enum(["graphql", "grpc", "rest"]).describe("Protocol type"),
    name: z.string().describe("Mock name"),
    schema: z.string().optional().describe("GraphQL SDL schema string"),
    protoFile: z.string().optional().describe("Protobuf file content (gRPC)"),
    grpcService: z.string().optional().describe("gRPC service name"),
    endpoint: z.string().optional().describe("Endpoint URL"),
  },
  async ({ protocol, name, schema, protoFile, grpcService, endpoint }) =>
    api("/api/protocols/mocks", {
      method: "POST",
      body: JSON.stringify({ protocol, name, schema, protoFile, grpcService, endpoint }),
    }),
);

server.tool(
  "protocol_parse_graphql",
  "Parse a GraphQL schema and return a summary of types, queries, mutations and subscriptions.",
  {
    schema: z.string().describe("GraphQL SDL schema"),
  },
  async ({ schema }) =>
    api("/api/protocols/graphql/parse", {
      method: "POST",
      body: JSON.stringify({ schema }),
    }),
);

server.tool(
  "protocol_grpc_health",
  "Check if GripMock (gRPC mock engine) is available.",
  {},
  async () => api("/api/protocols/grpc/health"),
);

// ===========================================================================
// Auth — JWT, API Keys, RBAC & Multi-Tenancy (F20)
// ===========================================================================

server.tool(
  "auth_list_users",
  "List all users (optionally filtered by workspace).",
  {
    workspaceId: z.string().optional().describe("Filter by workspace ID"),
  },
  async ({ workspaceId }) => {
    const params = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
    return api(`/api/auth/users${params}`);
  },
);

server.tool(
  "auth_create_user",
  "Create a new user with role and workspace assignment.",
  {
    username: z.string().describe("Username"),
    email: z.string().describe("Email address"),
    role: z.enum(["admin", "editor", "viewer"]).describe("User role"),
    workspaceId: z.string().optional().describe("Workspace ID (default: 'default')"),
  },
  async ({ username, email, role, workspaceId }) =>
    api("/api/auth/users", {
      method: "POST",
      body: JSON.stringify({ username, email, role, workspaceId }),
    }),
);

server.tool(
  "auth_rotate_key",
  "Rotate the API key for a user.",
  {
    userId: z.string().describe("User ID"),
  },
  async ({ userId }) =>
    api(`/api/auth/users/${userId}/rotate-key`, { method: "POST" }),
);

server.tool(
  "auth_validate_key",
  "Validate an API key and return user info.",
  {
    apiKey: z.string().describe("API key to validate"),
  },
  async ({ apiKey }) =>
    api("/api/auth/validate", {
      method: "POST",
      body: JSON.stringify({ apiKey }),
    }),
);

server.tool(
  "auth_list_workspaces",
  "List all workspace IDs in the system.",
  {},
  async () => api("/api/auth/workspaces"),
);

server.tool(
  "auth_audit_log",
  "List audit log entries.",
  {
    userId: z.string().optional().describe("Filter by user ID"),
    limit: z.number().optional().describe("Max entries to return"),
  },
  async ({ userId, limit }) => {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (limit) params.set("limit", String(limit));
    return api(`/api/auth/audit?${params}`);
  },
);

// ===========================================================================
// Environment Templates — Blueprints (F24)
// ===========================================================================

server.tool(
  "template_list",
  "List all environment templates (built-in + custom).",
  {
    builtIn: z.boolean().optional().describe("Include built-in templates (default true)"),
  },
  async ({ builtIn }) => {
    const params = builtIn === false ? "?builtIn=false" : "";
    return api(`/api/templates${params}`);
  },
);

server.tool(
  "template_apply",
  "Apply an environment template to generate mock files.",
  {
    id: z.string().describe("Template ID"),
    variables: z.record(z.string()).describe("Variable values to substitute in the template"),
  },
  async ({ id, variables }) =>
    api(`/api/templates/${id}/apply`, {
      method: "POST",
      body: JSON.stringify({ variables }),
    }),
);

server.tool(
  "template_create",
  "Create a custom environment template.",
  {
    name: z.string().describe("Template name"),
    description: z.string().optional(),
    variables: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      default: z.string().optional(),
      required: z.boolean().optional(),
    })).describe("Template variables"),
    mocks: z.array(z.object({
      filename: z.string().describe("Output filename (supports {{VAR}} substitution)"),
      content: z.string().describe("WireMock JSON content (supports {{VAR}} substitution)"),
    })).describe("Mock files to generate"),
  },
  async ({ name, description, variables, mocks }) =>
    api("/api/templates", {
      method: "POST",
      body: JSON.stringify({ name, description, variables, mocks }),
    }),
);

// ===========================================================================
// Governance — Spectral Lint (F12)
// ===========================================================================

server.tool(
  "lint_spec",
  "Lint an OpenAPI specification against Spectral OAS rules. Returns violations grouped by severity.",
  {
    content: z.string().describe("OpenAPI spec content (JSON or YAML)"),
  },
  async ({ content }) =>
    api("/api/governance/lint", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
);

server.tool(
  "lint_rules",
  "List all active Spectral lint rules and their severities.",
  {},
  async () => api("/api/governance/lint/rules"),
);

server.tool(
  "lint_mock",
  "Check if a mock mapping is compliant with OAS conventions by linting its inline spec representation.",
  {
    content: z.string().describe("OpenAPI fragment or full spec to validate"),
  },
  async ({ content }) =>
    api("/api/governance/lint", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
);

// ===========================================================================
// Coverage — Mock Coverage Report (F19)
// ===========================================================================

server.tool(
  "coverage_report",
  "Generate a mock coverage report by comparing an OpenAPI spec against existing WireMock mappings.",
  {
    content: z.string().describe("OpenAPI spec content (JSON or YAML)"),
    specFile: z.string().optional().describe("Optional spec filename for display"),
  },
  async ({ content, specFile }) =>
    api("/api/coverage/analyze", {
      method: "POST",
      body: JSON.stringify({ content, specFile }),
    }),
);

server.tool(
  "coverage_score",
  "Get the current mock coverage percentage for an OpenAPI spec URL.",
  {
    specUrl: z.string().describe("URL of the OpenAPI spec (e.g. http://localhost:9090/api/docs-json)"),
  },
  async ({ specUrl }) => api(`/api/coverage/score?specUrl=${encodeURIComponent(specUrl)}`),
);

server.tool(
  "coverage_missing",
  "List all spec endpoints that are NOT fully covered by existing mocks.",
  {
    specContent: z.string().describe("OpenAPI spec content (JSON or YAML)"),
  },
  async ({ specContent }) =>
    api(`/api/coverage/missing?specContent=${encodeURIComponent(specContent)}`),
);

server.tool(
  "coverage_text_report",
  "Generate a human-readable text coverage report with progress bars.",
  {
    content: z.string().describe("OpenAPI spec content (JSON or YAML)"),
  },
  async ({ content }) =>
    api("/api/coverage/report/text", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
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
