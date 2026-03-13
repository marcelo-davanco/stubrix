import { Command } from 'commander';
import { apiGet, apiPost, apiDelete } from './api';

export function registerScenarioCommands(program: Command): void {
  const scenario = program.command('scenario').description('Time Machine scenario management');

  scenario
    .command('list')
    .description('List all captured scenarios')
    .action(async () => {
      const data = await apiGet('/api/scenarios');
      const items = Array.isArray(data) ? data : [];
      if (items.length === 0) {
        console.log('No scenarios found.');
        return;
      }
      for (const s of items) {
        const sc = s as Record<string, unknown>;
        const meta = sc['meta'] ? (sc['meta'] as Record<string, unknown>) : sc;
        console.log(`  ${meta['id']}  ${meta['name']}  (${meta['createdAt']})`);
      }
    });

  scenario
    .command('save <name>')
    .description('Capture current environment state as a named scenario')
    .option('--description <desc>', 'Optional description')
    .action(async (name: string, opts: { description?: string }) => {
      const result = await apiPost('/api/scenarios/capture', {
        name,
        description: opts.description,
      });
      console.log(JSON.stringify(result, null, 2));
    });

  scenario
    .command('restore <id>')
    .description('Restore environment from a scenario')
    .action(async (id: string) => {
      const result = await apiPost(`/api/scenarios/${id}/restore`, {});
      console.log(JSON.stringify(result, null, 2));
    });

  scenario
    .command('diff <idA> <idB>')
    .description('Compare two scenarios')
    .action(async (idA: string, idB: string) => {
      const result = await apiGet(`/api/scenarios/${idA}/diff/${idB}`);
      console.log(JSON.stringify(result, null, 2));
    });

  scenario
    .command('delete <id>')
    .description('Delete a scenario')
    .action(async (id: string) => {
      await apiDelete(`/api/scenarios/${id}`);
      console.log(`Scenario ${id} deleted.`);
    });
}
