import { Command } from 'commander';
import { execFileSync } from 'child_process';

const ALLOWED_ENGINES = new Set(['wiremock', 'mockoon']);

export function registerUpCommand(program: Command): void {
  program
    .command('up')
    .description('Start Stubrix services (WireMock + API)')
    .option('--engine <engine>', 'Mock engine: wiremock | mockoon', 'wiremock')
    .option('--postgres', 'Also start PostgreSQL')
    .action((opts: { engine: string; postgres?: boolean }) => {
      if (!ALLOWED_ENGINES.has(opts.engine)) {
        console.error(
          `Invalid engine: "${opts.engine}". Allowed: wiremock, mockoon`,
        );
        process.exit(1);
      }
      const profiles = [opts.engine];
      if (opts.postgres) profiles.push('postgres');
      const args = ['compose'];
      for (const p of profiles) args.push('--profile', p);
      args.push('up', '-d');
      console.log(`Starting Stubrix (${profiles.join(', ')})...`);
      execFileSync('docker', args, { stdio: 'inherit' });
    });
}
