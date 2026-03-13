import { Command } from 'commander';
import { execSync } from 'child_process';

export function registerUpCommand(program: Command): void {
  program
    .command('up')
    .description('Start Stubrix services (WireMock + API)')
    .option('--engine <engine>', 'Mock engine: wiremock | mockoon', 'wiremock')
    .option('--postgres', 'Also start PostgreSQL')
    .action((opts: { engine: string; postgres?: boolean }) => {
      const profiles = [opts.engine];
      if (opts.postgres) profiles.push('postgres');
      const profileFlags = profiles.map((p) => `--profile ${p}`).join(' ');
      console.log(`Starting Stubrix (${profiles.join(', ')})...`);
      execSync(`docker compose ${profileFlags} up -d`, { stdio: 'inherit' });
    });
}
