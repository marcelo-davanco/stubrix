import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { execSync } from 'child_process';
import * as mysql from 'mysql2/promise';
import * as fs from 'fs';
import { ProjectDatabaseConfigService } from './project-database-config.service';
import { UpsertProjectDatabaseDto } from './dto/upsert-project-database.dto';
import type { ProjectDatabaseConfig } from './project-database-config.service';

@Controller('projects/:projectId/databases/configs')
export class ProjectDatabaseConfigController {
  constructor(private readonly configs: ProjectDatabaseConfigService) {}

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.configs.list(projectId);
  }

  @Get(':id')
  get(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.configs.get(projectId, id);
  }

  @Post()
  upsert(
    @Param('projectId') projectId: string,
    @Body() dto: UpsertProjectDatabaseDto,
  ) {
    return this.configs.upsert(projectId, dto);
  }

  @Delete(':id')
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    this.configs.remove(projectId, id);
    return { message: 'Database config removed' };
  }

  @Get(':id/test')
  async testConnection(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    const config = this.configs.get(projectId, id);
    try {
      const ok = await this.testConfigConnection(config);
      this.configs.updateConnectionStatus(projectId, id, ok ? 'ok' : 'error');
      return {
        ok,
        message: ok ? 'Connection successful' : 'Connection failed',
      };
    } catch (err) {
      this.configs.updateConnectionStatus(projectId, id, 'error');
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  private async testConfigConnection(
    config: ProjectDatabaseConfig,
  ): Promise<boolean> {
    if (config.engine === 'postgres') {
      try {
        execSync('pg_isready', {
          env: {
            ...process.env,
            PGHOST: config.host ?? 'localhost',
            PGPORT: config.port ?? '5432',
            PGUSER: config.username ?? 'postgres',
            PGPASSWORD: config.password ?? '',
            PGDATABASE: config.database ?? 'postgres',
          },
          stdio: 'ignore',
        });
        return true;
      } catch {
        return false;
      }
    }

    if (config.engine === 'mysql') {
      let conn: mysql.Connection | null = null;
      try {
        conn = await mysql.createConnection({
          host: config.host ?? 'localhost',
          port: Number(config.port ?? 3306),
          user: config.username ?? 'root',
          password: config.password ?? '',
          database: config.database ?? undefined,
        });
        await conn.query('SELECT 1');
        return true;
      } catch {
        return false;
      } finally {
        await conn?.end();
      }
    }

    if (config.engine === 'sqlite') {
      return Boolean(config.filePath && fs.existsSync(config.filePath));
    }

    return false;
  }
}
