#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const WIREMOCK_BASE_URL = process.env.WIREMOCK_URL || "http://localhost:8081";

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function wm(path, options = {}) {
  const url = `${WIREMOCK_BASE_URL}/__admin${path}`;
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
  name: "wiremock-mcp",
  version: "1.0.0",
});

// -- List mappings ----------------------------------------------------------

server.tool(
  "wiremock_list_mappings",
  "List all WireMock stub mappings. Returns ID, request matcher, and response summary for each mapping.",
  {
    limit: z.number().optional().describe("Max number of mappings to return"),
    offset: z.number().optional().describe("Offset for pagination"),
  },
  async ({ limit, offset }) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", String(limit));
    if (offset !== undefined) params.set("offset", String(offset));
    const qs = params.toString();
    return wm(`/mappings${qs ? `?${qs}` : ""}`);
  },
);

// -- Get single mapping -----------------------------------------------------

server.tool(
  "wiremock_get_mapping",
  "Get a specific WireMock stub mapping by its UUID.",
  {
    id: z.string().describe("UUID of the mapping"),
  },
  async ({ id }) => wm(`/mappings/${id}`),
);

// -- Create mapping ---------------------------------------------------------

server.tool(
  "wiremock_create_mapping",
  "Create a new WireMock stub mapping. Provide full mapping JSON with request matcher and response definition.",
  {
    mapping: z
      .string()
      .describe(
        'Full WireMock mapping JSON as string, e.g. {"request":{"method":"GET","url":"/api/test"},"response":{"status":200,"body":"ok"}}',
      ),
  },
  async ({ mapping }) => {
    let parsed;
    try {
      parsed = JSON.parse(mapping);
    } catch {
      return {
        content: [{ type: "text", text: "Invalid JSON in mapping parameter" }],
        isError: true,
      };
    }
    return wm("/mappings", {
      method: "POST",
      body: JSON.stringify(parsed),
    });
  },
);

// -- Update mapping ---------------------------------------------------------

server.tool(
  "wiremock_update_mapping",
  "Update an existing WireMock stub mapping by UUID.",
  {
    id: z.string().describe("UUID of the mapping to update"),
    mapping: z.string().describe("Updated mapping JSON as string"),
  },
  async ({ id, mapping }) => {
    let parsed;
    try {
      parsed = JSON.parse(mapping);
    } catch {
      return {
        content: [{ type: "text", text: "Invalid JSON in mapping parameter" }],
        isError: true,
      };
    }
    return wm(`/mappings/${id}`, {
      method: "PUT",
      body: JSON.stringify(parsed),
    });
  },
);

// -- Delete mapping ---------------------------------------------------------

server.tool(
  "wiremock_delete_mapping",
  "Delete a WireMock stub mapping by UUID.",
  {
    id: z.string().describe("UUID of the mapping to delete"),
  },
  async ({ id }) => wm(`/mappings/${id}`, { method: "DELETE" }),
);

// -- Delete all mappings ----------------------------------------------------

server.tool(
  "wiremock_delete_all_mappings",
  "Delete ALL WireMock stub mappings. Use with caution.",
  {},
  async () => wm("/mappings", { method: "DELETE" }),
);

// -- Save mappings to disk --------------------------------------------------

server.tool(
  "wiremock_save_mappings",
  "Persist all in-memory WireMock mappings to disk (mocks/mappings/).",
  {},
  async () => wm("/mappings/save", { method: "POST" }),
);

// -- Reset mappings ---------------------------------------------------------

server.tool(
  "wiremock_reset",
  "Reset WireMock to its initial state — removes all stub mappings, request logs, and scenarios.",
  {},
  async () => wm("/reset", { method: "POST" }),
);

// -- Start recording --------------------------------------------------------

server.tool(
  "wiremock_start_recording",
  "Start recording proxied requests. All requests will be forwarded to the target URL and saved as stub mappings.",
  {
    targetUrl: z
      .string()
      .describe("Target base URL to proxy to, e.g. https://api.example.com"),
    captureHeaders: z
      .boolean()
      .optional()
      .describe("Whether to capture request headers in recordings"),
    requestBodyPattern: z
      .string()
      .optional()
      .describe('Body match type: "equalToJson", "equalToXml", or "equalTo"'),
  },
  async ({ targetUrl, captureHeaders, requestBodyPattern }) => {
    const body = {
      targetBaseUrl: targetUrl,
      captureHeaders: captureHeaders
        ? {
            "Content-Type": {},
            Authorization: {},
          }
        : undefined,
      requestBodyPattern: requestBodyPattern
        ? { matcher: requestBodyPattern, ignoreArrayOrder: true }
        : undefined,
    };
    return wm("/recordings/start", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
);

// -- Stop recording ---------------------------------------------------------

server.tool(
  "wiremock_stop_recording",
  "Stop recording and persist all captured mappings to disk.",
  {},
  async () => wm("/recordings/stop", { method: "POST" }),
);

// -- Recording status -------------------------------------------------------

server.tool(
  "wiremock_recording_status",
  "Check the current recording status (Recording or Stopped).",
  {},
  async () => wm("/recordings/status"),
);

// -- Snapshot ---------------------------------------------------------------

server.tool(
  "wiremock_snapshot",
  "Take a snapshot — capture all received requests as stub mappings and persist them.",
  {
    persist: z
      .boolean()
      .optional()
      .describe("Whether to persist snapshot to disk (default: true)"),
  },
  async ({ persist }) => {
    const body = { persist: persist !== false };
    return wm("/recordings/snapshot", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
);

// -- Get request log --------------------------------------------------------

server.tool(
  "wiremock_get_requests",
  "Get the log of all requests received by WireMock. Useful for debugging which requests hit the mock server.",
  {
    limit: z.number().optional().describe("Max number of requests to return"),
    sinceDate: z
      .string()
      .optional()
      .describe("ISO 8601 date to filter requests since"),
  },
  async ({ limit, sinceDate }) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", String(limit));
    if (sinceDate) params.set("since", sinceDate);
    const qs = params.toString();
    return wm(`/requests${qs ? `?${qs}` : ""}`);
  },
);

// -- Count requests ---------------------------------------------------------

server.tool(
  "wiremock_count_requests",
  "Count requests matching a specific pattern.",
  {
    method: z
      .string()
      .optional()
      .describe("HTTP method to match (GET, POST, etc.)"),
    url: z.string().optional().describe("URL path to match"),
  },
  async ({ method, url }) => {
    const body = {};
    if (method) body.method = method;
    if (url) body.url = url;
    return wm("/requests/count", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
);

// -- Get unmatched requests -------------------------------------------------

server.tool(
  "wiremock_unmatched_requests",
  "Get requests that were received but did not match any stub mapping. Essential for finding gaps in your mock coverage.",
  {},
  async () => wm("/requests/unmatched"),
);

// -- WireMock server status -------------------------------------------------

server.tool(
  "wiremock_status",
  "Check if WireMock is running and get server info.",
  {},
  async () => wm("/"),
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
