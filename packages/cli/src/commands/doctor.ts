import { Command } from 'commander';
import { apiGet } from './api';

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Check Stubrix environment health (API, WireMock, RAG, Pact)')
    .action(async () => {
      const checks: Array<{ name: string; url: string }> = [
        { name: 'API', url: '/api/status' },
        { name: 'Intelligence (RAG)', url: '/api/intelligence/health' },
        { name: 'Pact Broker', url: '/api/contracts/health' },
        { name: 'Toxiproxy', url: '/api/chaos-network/health' },
      ];

      let allOk = true;
      for (const check of checks) {
        try {
          const data = (await apiGet(check.url)) as Record<string, unknown>;
          const ok = data['available'] !== false && data['status'] !== 'error';
          console.log(`  ${ok ? '✅' : '⚠️ '} ${check.name}`);
          if (!ok) allOk = false;
        } catch {
          console.log(`  ❌ ${check.name} (unreachable)`);
          allOk = false;
        }
      }
      if (!allOk) process.exit(1);
    });
}
