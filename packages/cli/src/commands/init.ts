import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a new Stubrix project in the current directory')
    .option('-n, --name <name>', 'Project name', 'my-stubrix')
    .action((opts: { name: string }) => {
      const dirs = ['mocks/mappings', 'mocks/__files'];
      for (const d of dirs) {
        fs.mkdirSync(path.join(process.cwd(), d), { recursive: true });
        console.log(`  created ${d}`);
      }

      const envFile = path.join(process.cwd(), '.env');
      if (!fs.existsSync(envFile)) {
        fs.writeFileSync(envFile, `STUBRIX_PROJECT=${opts.name}\nMOCK_PORT=8081\nAPI_PORT=9090\n`);
        console.log('  created .env');
      }

      console.log(`\nStubrix project "${opts.name}" initialized.`);
      console.log('Run: make wiremock   or   docker compose --profile wiremock up -d');
    });
}
