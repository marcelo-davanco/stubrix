import { Injectable } from '@nestjs/common';
import { ProjectDatabaseConfigService } from './project-database-config.service';

export interface ResolvedProjectDatabaseContext {
  projectId: string;
  engine: 'postgres' | 'mysql' | 'sqlite';
  connectionName: string;
  database: string | null;
  host: string | null;
  port: string | null;
  username: string | null;
  password: string | null;
  filePath: string | null;
}

@Injectable()
export class ProjectDatabaseContextService {
  constructor(private readonly configs: ProjectDatabaseConfigService) {}

  resolve(
    projectId?: string,
    engine?: string,
    connectionId?: string,
  ): ResolvedProjectDatabaseContext | null {
    if (!projectId) {
      return null;
    }

    if (connectionId) {
      const config = this.configs.get(projectId, connectionId);
      if (!config.enabled) return null;
      return {
        projectId,
        engine: config.engine,
        connectionName: config.name,
        database: config.database,
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        filePath: config.filePath,
      };
    }

    const projectConfigs = this.configs
      .list(projectId)
      .filter((c) => c.enabled);
    const selected = engine
      ? projectConfigs.find((item) => item.engine === engine)
      : projectConfigs[0];

    if (!selected) {
      return null;
    }

    return {
      projectId,
      engine: selected.engine,
      connectionName: selected.name,
      database: selected.database,
      host: selected.host,
      port: selected.port,
      username: selected.username,
      password: selected.password,
      filePath: selected.filePath,
    };
  }
}
