import { Command } from 'commander';
import { execSync } from 'child_process';

export function registerDownCommand(program: Command): void {
  program
    .command('down')
    .description('Stop all Stubrix services')
    .option('--volumes', 'Also remove volumes')
    .action((opts: { volumes?: boolean }) => {
      const flag = opts.volumes ? '-v' : '';
      console.log('Stopping Stubrix services...');
      execSync(
        `docker compose --profile wiremock --profile mockoon --profile postgres --profile mysql down ${flag}`,
        { stdio: 'inherit' },
      );
    });
}
