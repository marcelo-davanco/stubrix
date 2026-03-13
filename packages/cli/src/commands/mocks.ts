import { Command } from 'commander';
import { apiGet, apiPost, apiDelete } from './api';

export function registerMockCommands(program: Command): void {
  const mocks = program.command('mock').description('Mock management');

  mocks
    .command('list [projectId]')
    .description('List mocks (optionally filtered by project)')
    .option('--json', 'Output raw JSON')
    .action(async (projectId: string | undefined, opts: { json?: boolean }) => {
      const url = projectId ? `/api/projects/${projectId}/mocks` : '/api/projects';
      const data = await apiGet(url);
      if (opts.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const m = item as Record<string, unknown>;
          console.log(`  ${m['id'] ?? m['name'] ?? JSON.stringify(m)}`);
        }
      }
    });

  mocks
    .command('create <projectId>')
    .description('Create a mock in a project')
    .requiredOption('--method <method>', 'HTTP method')
    .requiredOption('--path <path>', 'URL path')
    .option('--status <status>', 'Response status code', '200')
    .option('--body <body>', 'Response body JSON', '{}')
    .action(async (projectId: string, opts: { method: string; path: string; status: string; body: string }) => {
      const result = await apiPost(`/api/projects/${projectId}/mocks`, {
        request: { method: opts.method.toUpperCase(), urlPath: opts.path },
        response: { status: parseInt(opts.status), body: opts.body, headers: { 'Content-Type': 'application/json' } },
      });
      console.log(JSON.stringify(result, null, 2));
    });

  mocks
    .command('delete <projectId> <mockId>')
    .description('Delete a mock')
    .action(async (projectId: string, mockId: string) => {
      await apiDelete(`/api/projects/${projectId}/mocks/${mockId}`);
      console.log(`Mock ${mockId} deleted.`);
    });

  mocks
    .command('import <file>')
    .description('Import mocks from HAR/Postman/OpenAPI file')
    .option('--preview', 'Preview without importing')
    .action(async (file: string, opts: { preview?: boolean }) => {
      const { readFileSync } = await import('fs');
      const content = readFileSync(file, 'utf-8');
      const url = opts.preview ? '/api/import/preview' : '/api/import/content';
      const result = await apiPost(url, { content, filename: file });
      console.log(JSON.stringify(result, null, 2));
    });
}
