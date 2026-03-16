#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

const PROJECT_DIR = process.env.COMPOSE_PROJECT_DIR || process.cwd();

const VALID_PROFILES = [
  'wiremock',
  'wiremock-record',
  'mockoon',
  'mockoon-proxy',
  'postgres',
  'databases',
  'mysql',
];

// ---------------------------------------------------------------------------
// Exec helper
// ---------------------------------------------------------------------------

async function run(cmd, args, options = {}) {
  try {
    const { stdout, stderr } = await exec(cmd, args, {
      cwd: PROJECT_DIR,
      timeout: 30_000,
      env: { ...process.env, PAGER: 'cat' },
      ...options,
    });
    const output = [stdout, stderr].filter(Boolean).join('\n').trim();
    return {
      content: [{ type: 'text', text: output || '(no output)' }],
    };
  } catch (err) {
    const output = [err.stdout, err.stderr, err.message]
      .filter(Boolean)
      .join('\n')
      .trim();
    return {
      content: [{ type: 'text', text: `Error: ${output}` }],
      isError: true,
    };
  }
}

function docker(...args) {
  return run('docker', args);
}

function compose(...args) {
  return run('docker', ['compose', ...args]);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateProfiles(profiles) {
  const invalid = profiles.filter((p) => !VALID_PROFILES.includes(p));
  if (invalid.length > 0) {
    return `Invalid profile(s): ${invalid.join(', ')}. Valid: ${VALID_PROFILES.join(', ')}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: 'docker-mcp',
  version: '1.0.0',
});

// -- List containers --------------------------------------------------------

server.tool(
  'docker_ps',
  'List all Docker containers (running and stopped) for the Stubrix project. Shows name, status, ports, and image.',
  {
    all: z
      .boolean()
      .optional()
      .describe('Show all containers including stopped (default: true)'),
  },
  async ({ all }) => {
    const args = ['compose', 'ps', '--format', 'table'];
    if (all !== false) args.push('-a');
    return run('docker', args);
  },
);

// -- Compose up -------------------------------------------------------------

server.tool(
  'docker_compose_up',
  'Start Docker Compose services with specified profiles. Services run in detached mode.',
  {
    profiles: z
      .array(z.string())
      .describe(
        'Docker Compose profiles to start. Valid: "wiremock", "wiremock-record", "mockoon", "mockoon-proxy", "postgres", "databases", "mysql"',
      ),
    build: z
      .boolean()
      .optional()
      .describe('Rebuild images before starting (default: false)'),
  },
  async ({ profiles, build }) => {
    const err = validateProfiles(profiles);
    if (err) {
      return { content: [{ type: 'text', text: err }], isError: true };
    }
    const args = ['compose'];
    for (const p of profiles) {
      args.push('--profile', p);
    }
    args.push('up', '-d');
    if (build) args.push('--build');
    return run('docker', args);
  },
);

// -- Compose down -----------------------------------------------------------

server.tool(
  'docker_compose_down',
  'Stop and remove Docker Compose services for specified profiles.',
  {
    profiles: z.array(z.string()).describe('Docker Compose profiles to stop'),
    volumes: z
      .boolean()
      .optional()
      .describe('Also remove named volumes (default: false)'),
  },
  async ({ profiles, volumes }) => {
    const err = validateProfiles(profiles);
    if (err) {
      return { content: [{ type: 'text', text: err }], isError: true };
    }
    const args = ['compose'];
    for (const p of profiles) {
      args.push('--profile', p);
    }
    args.push('down');
    if (volumes) args.push('-v');
    return run('docker', args);
  },
);

// -- Compose restart --------------------------------------------------------

server.tool(
  'docker_compose_restart',
  'Restart Docker Compose services for specified profiles.',
  {
    profiles: z
      .array(z.string())
      .describe('Docker Compose profiles to restart'),
  },
  async ({ profiles }) => {
    const err = validateProfiles(profiles);
    if (err) {
      return { content: [{ type: 'text', text: err }], isError: true };
    }
    const args = ['compose'];
    for (const p of profiles) {
      args.push('--profile', p);
    }
    args.push('restart');
    return run('docker', args);
  },
);

// -- Container logs ---------------------------------------------------------

server.tool(
  'docker_logs',
  'Get logs from a Docker Compose service. Useful for debugging startup issues or runtime errors.',
  {
    service: z
      .string()
      .describe(
        'Service name from docker-compose.yml: "wiremock", "wiremock-record", "mockoon", "mockoon-proxy", "db-postgres", "db-mysql"',
      ),
    tail: z
      .number()
      .optional()
      .describe('Number of lines to show from the end (default: 100)'),
    since: z
      .string()
      .optional()
      .describe('Show logs since duration (e.g., "5m", "1h")'),
  },
  async ({ service, tail, since }) => {
    const args = ['compose', 'logs', service];
    args.push('--tail', String(tail || 100));
    if (since) args.push('--since', since);
    args.push('--no-color');
    return run('docker', args);
  },
);

// -- Container inspect ------------------------------------------------------

server.tool(
  'docker_inspect',
  'Inspect a running Docker container — get detailed info including IP, ports, mounts, env, and health.',
  {
    container: z
      .string()
      .describe(
        'Container name: "mock-server-wiremock", "stubrix-db-postgres", "stubrix-db-mysql", etc.',
      ),
  },
  async ({ container }) => {
    return docker(
      'inspect',
      container,
      '--format',
      JSON.stringify({
        Name: '{{.Name}}',
        State: '{{.State.Status}}',
        Health:
          '{{if .State.Health}}{{.State.Health.Status}}{{else}}N/A{{end}}',
        Ports:
          '{{range $k, $v := .NetworkSettings.Ports}}{{$k}}->{{range $v}}{{.HostPort}}{{end}} {{end}}',
        Image: '{{.Config.Image}}',
        Created: '{{.Created}}',
      }),
    );
  },
);

// -- Health check -----------------------------------------------------------

server.tool(
  'docker_health',
  'Check health status of all Stubrix containers. Quick overview of which services are running and healthy.',
  {},
  async () => {
    return run('docker', [
      'compose',
      'ps',
      '-a',
      '--format',
      'table {{.Name}}\t{{.Status}}\t{{.Ports}}',
    ]);
  },
);

// -- Build images -----------------------------------------------------------

server.tool(
  'docker_build',
  'Build Docker images for the Stubrix project.',
  {
    noCache: z
      .boolean()
      .optional()
      .describe('Build without using cache (default: false)'),
  },
  async ({ noCache }) => {
    const args = ['compose', 'build'];
    if (noCache) args.push('--no-cache');
    return run('docker', args, { timeout: 120_000 });
  },
);

// -- Execute command in container -------------------------------------------

server.tool(
  'docker_exec',
  'Execute a command inside a running Docker container.',
  {
    container: z.string().describe('Container name'),
    command: z
      .string()
      .describe('Command to execute (e.g., "pg_isready -U postgres")'),
  },
  async ({ container, command }) => {
    const parts = command.split(/\s+/);
    return docker('exec', container, ...parts);
  },
);

// -- Volume info ------------------------------------------------------------

server.tool(
  'docker_volumes',
  'List Docker volumes used by Stubrix (pg_data, mysql_data).',
  {},
  async () => {
    return docker(
      'volume',
      'ls',
      '--filter',
      'name=stubrix',
      '--format',
      'table {{.Name}}\t{{.Driver}}\t{{.Mountpoint}}',
    );
  },
);

// -- Stop all ---------------------------------------------------------------

server.tool(
  'docker_stop_all',
  "Stop ALL Stubrix Docker services across all profiles. Equivalent to 'make down'.",
  {
    volumes: z
      .boolean()
      .optional()
      .describe('Also remove volumes (destroys data). Default: false'),
  },
  async ({ volumes }) => {
    const args = [
      'compose',
      '--profile',
      'wiremock',
      '--profile',
      'wiremock-record',
      '--profile',
      'mockoon',
      '--profile',
      'mockoon-proxy',
      '--profile',
      'postgres',
      '--profile',
      'mysql',
      'down',
    ];
    if (volumes) args.push('-v');
    return run('docker', args);
  },
);

// -- Network info -----------------------------------------------------------

server.tool(
  'docker_network',
  'Show the Docker network used by Stubrix Compose services.',
  {},
  async () => {
    return run('docker', [
      'network',
      'ls',
      '--filter',
      'name=stubrix',
      '--format',
      'table {{.Name}}\t{{.Driver}}\t{{.Scope}}',
    ]);
  },
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
