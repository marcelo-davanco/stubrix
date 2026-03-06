import { Injectable } from '@nestjs/common';
import { DriverRegistryService } from './drivers/driver-registry.service';
import type { Engine } from '@stubrix/shared';
import { ProjectDatabaseContextService } from './project-database-context.service';

@Injectable()
export class DbEnginesService {
  constructor(
    private readonly registry: DriverRegistryService,
    private readonly projectContext: ProjectDatabaseContextService,
  ) {}

  async listEngines(): Promise<{ engines: Engine[] }> {
    const drivers = this.registry.getAll();
    const engines: Engine[] = [];

    for (const driver of drivers) {
      if (!driver.isConfigured()) continue;
      let status: Engine['status'] = 'inactive';
      try {
        const healthy = await driver.healthCheck();
        status = healthy ? 'active' : 'inactive';
      } catch {
        status = 'error';
      }
      engines.push({ name: driver.engine, status });
    }

    return { engines };
  }

  async listDatabases(engine?: string, projectId?: string) {
    const resolvedContext = this.projectContext.resolve(projectId, engine);
    const resolvedEngine = resolvedContext?.engine ?? engine;
    const driver = resolvedEngine
      ? this.registry.get(resolvedEngine)
      : await this.registry.getPrimary();

    if (!driver) {
      return { engine: null, databases: [], projectContext: resolvedContext };
    }

    const databases = await driver.listDatabases();
    const preferredDatabase = resolvedContext?.database;
    const orderedDatabases = preferredDatabase
      ? [
          preferredDatabase,
          ...databases.filter((database) => database !== preferredDatabase),
        ]
      : databases;

    return {
      engine: driver.engine,
      databases: orderedDatabases,
      projectContext: resolvedContext,
    };
  }

  async getDatabaseInfo(name: string, engine?: string, projectId?: string) {
    const resolvedContext = this.projectContext.resolve(projectId, engine);
    const resolvedEngine = resolvedContext?.engine ?? engine;
    const resolvedName = resolvedContext?.database ?? name;
    const driver = resolvedEngine
      ? this.registry.get(resolvedEngine)
      : await this.registry.getPrimary();

    if (!driver) {
      return null;
    }

    const info = await driver.getDatabaseInfo(resolvedName);
    return { engine: driver.engine, projectContext: resolvedContext, ...info };
  }
}
