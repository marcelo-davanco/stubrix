import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectsService } from '../projects/projects.service';
import type { UpsertProjectDatabaseDto } from './dto/upsert-project-database.dto';

export interface ProjectDatabaseConfig {
  id: string;
  projectId: string;
  engine: 'postgres' | 'mysql' | 'sqlite';
  name: string;
  database: string | null;
  host: string | null;
  port: string | null;
  username: string | null;
  password: string | null;
  filePath: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ProjectDatabaseConfigService {
  private readonly configFile: string;

  constructor(
    private readonly config: ConfigService,
    private readonly projects: ProjectsService,
  ) {
    const dumpsDir =
      this.config.get<string>('DUMPS_DIR') ??
      path.join(process.cwd(), '../../dumps');
    fs.mkdirSync(dumpsDir, { recursive: true });
    this.configFile = path.join(dumpsDir, '.project-databases.json');
    this.ensureConfigFile();
  }

  private ensureConfigFile(): void {
    if (!fs.existsSync(this.configFile)) {
      fs.writeFileSync(this.configFile, JSON.stringify([], null, 2));
    }
  }

  private readAll(): ProjectDatabaseConfig[] {
    const raw = fs.readFileSync(this.configFile, 'utf-8');
    return JSON.parse(raw) as ProjectDatabaseConfig[];
  }

  private writeAll(entries: ProjectDatabaseConfig[]): void {
    fs.writeFileSync(this.configFile, JSON.stringify(entries, null, 2));
  }

  list(projectId: string): ProjectDatabaseConfig[] {
    this.projects.findOne(projectId);
    return this.readAll().filter((entry) => entry.projectId === projectId);
  }

  get(projectId: string, id: string): ProjectDatabaseConfig {
    const entry = this.list(projectId).find((item) => item.id === id);
    if (!entry) {
      throw new NotFoundException(
        `Database config '${id}' not found in project '${projectId}'`,
      );
    }
    return entry;
  }

  upsert(
    projectId: string,
    dto: UpsertProjectDatabaseDto,
  ): ProjectDatabaseConfig {
    this.projects.findOne(projectId);
    const all = this.readAll();
    const existingIndex = all.findIndex(
      (item) =>
        item.projectId === projectId &&
        item.name === dto.name &&
        item.engine === dto.engine,
    );
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const current = all[existingIndex];
      const updated: ProjectDatabaseConfig = {
        ...current,
        database: dto.database ?? current.database,
        host: dto.host ?? current.host,
        port: dto.port ?? current.port,
        username: dto.username ?? current.username,
        password: dto.password ?? current.password,
        filePath: dto.filePath ?? current.filePath,
        notes: dto.notes ?? current.notes,
        updatedAt: now,
      };
      all[existingIndex] = updated;
      this.writeAll(all);
      return updated;
    }

    const duplicateId = `${projectId}:${dto.engine}:${dto.name}`;
    if (all.some((item) => item.id === duplicateId)) {
      throw new ConflictException(
        `Database config '${dto.name}' already exists for project '${projectId}'`,
      );
    }

    const created: ProjectDatabaseConfig = {
      id: duplicateId,
      projectId,
      engine: dto.engine,
      name: dto.name,
      database: dto.database ?? null,
      host: dto.host ?? null,
      port: dto.port ?? null,
      username: dto.username ?? null,
      password: dto.password ?? null,
      filePath: dto.filePath ?? null,
      notes: dto.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    all.push(created);
    this.writeAll(all);
    return created;
  }

  remove(projectId: string, id: string): void {
    this.projects.findOne(projectId);
    const all = this.readAll();
    const index = all.findIndex(
      (item) => item.projectId === projectId && item.id === id,
    );
    if (index === -1) {
      throw new NotFoundException(
        `Database config '${id}' not found in project '${projectId}'`,
      );
    }
    all.splice(index, 1);
    this.writeAll(all);
  }
}
