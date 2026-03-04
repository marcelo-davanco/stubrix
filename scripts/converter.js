#!/usr/bin/env node

/**
 * Bidirectional converter: WireMock mappings <-> Mockoon environment JSON
 *
 * Canonical format: WireMock (mappings/*.json + __files/*)
 * Generated format: Mockoon environment (.mockoon-env.json)
 *
 * Usage:
 *   node converter.js to-mockoon   --mocks-dir ./mocks --output .mockoon-env.json
 *   node converter.js to-wiremock  --input .mockoon-env.json --mocks-dir ./mocks
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uuid() {
  return crypto.randomUUID();
}

function readJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function httpMethodToMockoon(method) {
  const map = {
    GET: "get",
    POST: "post",
    PUT: "put",
    DELETE: "delete",
    PATCH: "patch",
    HEAD: "head",
    OPTIONS: "options",
    ANY: "get",
  };
  return map[(method || "GET").toUpperCase()] || "get";
}

function mockoonMethodToWireMock(method) {
  return (method || "get").toUpperCase();
}

// ---------------------------------------------------------------------------
// WireMock -> Mockoon
// ---------------------------------------------------------------------------

function wiremockMappingToMockoonRoute(mapping, filesDir) {
  const req = mapping.request || {};
  const res = mapping.response || {};

  const endpoint = req.url || req.urlPattern || req.urlPathPattern || req.urlPath || "/";
  const method = httpMethodToMockoon(req.method);
  const statusCode = res.status || 200;

  let body = res.body || "";
  if (res.bodyFileName && filesDir) {
    const filePath = path.join(filesDir, res.bodyFileName);
    if (fs.existsSync(filePath)) {
      body = fs.readFileSync(filePath, "utf-8");
    } else {
      console.warn(`[converter] WARN: bodyFileName '${res.bodyFileName}' not found at ${filePath}`);
    }
  }

  const headers = [];
  if (res.headers) {
    for (const [key, value] of Object.entries(res.headers)) {
      headers.push({ key, value });
    }
  }
  if (!headers.find((h) => h.key.toLowerCase() === "content-type")) {
    headers.push({ key: "Content-Type", value: "application/json" });
  }

  const routeUuid = uuid();
  const responseUuid = uuid();

  return {
    uuid: routeUuid,
    type: "http",
    documentation: mapping.name || "",
    method,
    endpoint: endpoint.startsWith("/") ? endpoint : "/" + endpoint,
    responses: [
      {
        uuid: responseUuid,
        body,
        latency: res.fixedDelayMilliseconds || 0,
        statusCode,
        label: mapping.name || `Response ${statusCode}`,
        headers,
        bodyType: "INLINE",
        filePath: "",
        databucketID: "",
        sendFileAsBody: false,
        rules: [],
        rulesOperator: "OR",
        disableTemplating: false,
        fallbackTo404: false,
        default: true,
        crudKey: "id",
      },
    ],
    responseMode: null,
    enabled: true,
  };
}

function toMockoon(mocksDir, outputFile, options = {}) {
  const mappingsDir = path.join(mocksDir, "mappings");
  const filesDir = path.join(mocksDir, "__files");
  const mappings = readJsonFiles(mappingsDir);

  const routes = mappings.map((m) => wiremockMappingToMockoonRoute(m, filesDir));

  const rootChildren = routes.map((r) => ({
    type: "route",
    uuid: r.uuid,
  }));

  const env = {
    uuid: uuid(),
    lastMigration: 32,
    name: options.name || "Mock Server",
    endpointPrefix: "",
    latency: 0,
    port: options.port || 8080,
    hostname: "0.0.0.0",
    folders: [],
    routes,
    rootChildren,
    proxyMode: false,
    proxyHost: "",
    proxyRemovePrefix: false,
    cors: true,
    headers: [
      { key: "Content-Type", value: "application/json" },
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "Content-Type, Origin, Accept, Authorization, Content-Length, X-Requested-With" },
    ],
    proxyReqHeaders: [{ key: "", value: "" }],
    proxyResHeaders: [{ key: "", value: "" }],
    data: [],
    callbacks: [],
    tlsOptions: {
      enabled: false,
      type: "CERT",
      pfxPath: "",
      certPath: "",
      keyPath: "",
      caPath: "",
      passphrase: "",
    },
  };

  // If proxy target is set, enable proxy mode
  if (options.proxyTarget) {
    env.proxyMode = true;
    env.proxyHost = options.proxyTarget;
  }

  fs.writeFileSync(outputFile, JSON.stringify(env, null, 2), "utf-8");
  console.log(`[converter] Generated Mockoon env: ${outputFile} (${routes.length} routes)`);
  return env;
}

// ---------------------------------------------------------------------------
// Mockoon -> WireMock
// ---------------------------------------------------------------------------

function mockoonRouteToWireMock(route) {
  const response = route.responses?.[0] || {};

  const mapping = {
    id: uuid(),
    name: route.documentation || route.responses?.[0]?.label || "",
    request: {
      method: mockoonMethodToWireMock(route.method),
      url: route.endpoint,
    },
    response: {
      status: response.statusCode || 200,
      body: response.body || "",
      headers: {},
    },
  };

  if (response.headers) {
    for (const h of response.headers) {
      if (h.key) mapping.response.headers[h.key] = h.value;
    }
  }

  if (response.latency) {
    mapping.response.fixedDelayMilliseconds = response.latency;
  }

  return mapping;
}

function toWireMock(inputFile, mocksDir) {
  const envData = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
  const mappingsDir = path.join(mocksDir, "mappings");
  ensureDir(mappingsDir);
  ensureDir(path.join(mocksDir, "__files"));

  const routes = envData.routes || [];
  let count = 0;

  for (const route of routes) {
    const mapping = mockoonRouteToWireMock(route);
    const safeName = (route.endpoint || "root")
      .replace(/^\//, "")
      .replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `${safeName}_${route.method || "get"}.json`;
    fs.writeFileSync(
      path.join(mappingsDir, fileName),
      JSON.stringify(mapping, null, 2),
      "utf-8"
    );
    count++;
  }

  console.log(`[converter] Generated ${count} WireMock mappings in ${mappingsDir}`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printUsage() {
  console.log(`
Usage:
  node converter.js to-mockoon  --mocks-dir <dir> --output <file> [--port 8080] [--name "Mock Server"] [--proxy-target <url>]
  node converter.js to-wiremock --input <file>    --mocks-dir <dir>
  `);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  function getArg(name) {
    const idx = args.indexOf(name);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  }

  if (command === "to-mockoon") {
    const mocksDir = getArg("--mocks-dir") || "./mocks";
    const output = getArg("--output") || ".mockoon-env.json";
    const port = parseInt(getArg("--port") || "8080", 10);
    const name = getArg("--name") || "Mock Server";
    const proxyTarget = getArg("--proxy-target") || null;
    toMockoon(mocksDir, output, { port, name, proxyTarget });
  } else if (command === "to-wiremock") {
    const input = getArg("--input") || ".mockoon-env.json";
    const mocksDir = getArg("--mocks-dir") || "./mocks";
    toWireMock(input, mocksDir);
  } else {
    printUsage();
    process.exit(1);
  }
}

main();
