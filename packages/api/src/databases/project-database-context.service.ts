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
  ): ResolvedProjectDatabaseContext | null {
    if (!projectId) {
      return null;
    }

    const projectConfigs = this.configs.list(projectId);
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
