import { Command } from 'commander';
import { apiGet } from './api';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show Stubrix API status')
    .action(async () => {
      try {
        const data = await apiGet('/api/status');
        console.log(JSON.stringify(data, null, 2));
      } catch (err) {
        console.error(`API unavailable: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
