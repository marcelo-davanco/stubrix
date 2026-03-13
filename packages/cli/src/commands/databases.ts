import { Command } from 'commander';
import { apiGet, apiPost } from './api';

export function registerDatabaseCommands(program: Command): void {
  const db = program.command('db').description('Database snapshot management');

  db
    .command('engines')
    .description('List available database engines')
    .action(async () => {
      const data = await apiGet('/api/db/engines');
      console.log(JSON.stringify(data, null, 2));
    });

  db
    .command('snapshots <engine>')
    .description('List snapshots for a database engine')
    .action(async (engine: string) => {
      const data = await apiGet(`/api/db/${engine}/snapshots`);
      console.log(JSON.stringify(data, null, 2));
    });

  db
    .command('snapshot <engine>')
    .description('Create a database snapshot')
    .option('--name <name>', 'Snapshot name')
    .action(async (engine: string, opts: { name?: string }) => {
      const result = await apiPost(`/api/db/${engine}/snapshots`, { name: opts.name });
      console.log(JSON.stringify(result, null, 2));
    });

  db
    .command('restore <engine> <snapshotName>')
    .description('Restore a database snapshot')
    .action(async (engine: string, snapshotName: string) => {
      const result = await apiPost(`/api/db/${engine}/snapshots/${snapshotName}/restore`, {});
      console.log(JSON.stringify(result, null, 2));
    });
}
