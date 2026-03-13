import { Command } from 'commander';
import { apiGet, apiPost } from './api';

export function registerChaosCommands(program: Command): void {
  const chaos = program.command('chaos').description('Chaos engineering and fault injection');

  chaos
    .command('list')
    .description('List chaos fault profiles')
    .action(async () => {
      const data = await apiGet('/api/chaos/profiles');
      console.log(JSON.stringify(data, null, 2));
    });

  chaos
    .command('presets')
    .description('List built-in chaos presets')
    .action(async () => {
      const data = await apiGet('/api/chaos/presets');
      console.log(JSON.stringify(data, null, 2));
    });

  chaos
    .command('apply <preset>')
    .description('Apply a built-in chaos preset (slow-network | flaky-service | total-outage | timeout)')
    .option('--url <pattern>', 'URL regex filter')
    .action(async (preset: string, opts: { url?: string }) => {
      const result = await apiPost('/api/chaos/presets/apply', {
        preset,
        urlPattern: opts.url,
      });
      console.log(JSON.stringify(result, null, 2));
    });

  chaos
    .command('disable <id>')
    .description('Disable a chaos profile by ID')
    .action(async (id: string) => {
      const result = await apiPost(`/api/chaos/profiles/${id}/toggle`, { enabled: false });
      console.log(JSON.stringify(result, null, 2));
    });
}
