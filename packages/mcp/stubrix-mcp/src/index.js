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
// Start server
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
