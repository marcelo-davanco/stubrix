import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { ProjectsService } from '../projects/projects.service';
import type { UpsertProjectDatabaseDto } from './dto/upsert-project-database.dto';

export interface ProjectDatabaseConfig {
  id: string;
  projectId: string;
  engine: 'postgres' | 'mysql' | 'sqlite' | 'mongodb';
  name: string;
  database: string | null;
  host: string | null;
  port: string | null;
  username: string | null;
  password: string | null;
  filePath: string | null;
  notes: string | null;
  enabled: boolean;
  connectionStatus: 'unknown' | 'ok' | 'error';
  connectionTestedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbRow {
  id: string;
  project_id: string;
  engine: string;
  name: string;
  database_name: string | null;
  host: string | null;
  port: string | null;
  username: string | null;
  password: string | null;
  file_path: string | null;
  notes: string | null;
  enabled: number;
  connection_status: string;
  connection_tested_at: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class ProjectDatabaseConfigService implements OnModuleDestroy {
  private readonly db: Database.Database;

  constructor(
    private readonly config: ConfigService,
    private readonly projects: ProjectsService,
  ) {
    const dumpsDir =
      this.config.get<string>('DUMPS_DIR') ??
      path.join(process.cwd(), '../../dumps');
    fs.mkdirSync(dumpsDir, { recursive: true });
    const dbPath = path.join(dumpsDir, 'project-databases.sqlite');
    this.db = new Database(dbPath);
    this.migrate();
    this.migrateFromJson(path.join(dumpsDir, '.project-databases.json'));
  }

  onModuleDestroy(): void {
    this.db.close();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS project_database_configs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        engine TEXT NOT NULL,
        name TEXT NOT NULL,
        database_name TEXT,
        host TEXT,
        port TEXT,
        username TEXT,
        password TEXT,
        file_path TEXT,
        notes TEXT,
        enabled INTEGER NOT NULL DEFAULT 0,
        connection_status TEXT NOT NULL DEFAULT 'unknown',
        connection_tested_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    try {
      this.db.exec(
        `ALTER TABLE project_database_configs ADD COLUMN enabled INTEGER NOT NULL DEFAULT 0`,
      );
    } catch {
      // column already exists — safe to ignore
    }
  }

  private migrateFromJson(jsonPath: string): void {
    if (!fs.existsSync(jsonPath)) return;
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      const entries = JSON.parse(raw) as Array<Record<string, unknown>>;
      if (!Array.isArray(entries) || entries.length === 0) return;

      const insert = this.db.prepare(
        `INSERT OR IGNORE INTO project_database_configs
          (id, project_id, engine, name, database_name, host, port, username, password, file_path, notes, connection_status, connection_tested_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      const migrateAll = this.db.transaction(() => {
        for (const e of entries) {
          insert.run(
            e['id'] ?? null,
            e['projectId'] ?? null,
            e['engine'] ?? null,
            e['name'] ?? null,
            e['database'] ?? null,
            e['host'] ?? null,
            e['port'] ?? null,
            e['username'] ?? null,
            e['password'] ?? null,
            e['filePath'] ?? null,
            e['notes'] ?? null,
            e['connectionStatus'] ?? 'unknown',
            e['connectionTestedAt'] ?? null,
            e['createdAt'] ?? new Date().toISOString(),
            e['updatedAt'] ?? new Date().toISOString(),
          );
        }
      });

      migrateAll();
      fs.renameSync(jsonPath, `${jsonPath}.migrated`);
    } catch {
      // silently skip migration errors — data stays in json as backup
    }
  }

  private rowToConfig(row: DbRow): ProjectDatabaseConfig {
    return {
      id: row.id,
      projectId: row.project_id,
      engine: row.engine as ProjectDatabaseConfig['engine'],
      name: row.name,
      database: row.database_name,
      host: row.host,
      port: row.port,
      username: row.username,
      password: row.password,
      filePath: row.file_path,
      notes: row.notes,
      enabled: row.enabled === 1,
      connectionStatus:
        row.connection_status as ProjectDatabaseConfig['connectionStatus'],
      connectionTestedAt: row.connection_tested_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  list(projectId: string): ProjectDatabaseConfig[] {
    this.projects.findOne(projectId);
    const rows = this.db
      .prepare(
        'SELECT * FROM project_database_configs WHERE project_id = ? ORDER BY created_at ASC',
      )
      .all(projectId) as DbRow[];
    return rows.map((r) => this.rowToConfig(r));
  }

  get(projectId: string, id: string): ProjectDatabaseConfig {
    const row = this.db
      .prepare(
        'SELECT * FROM project_database_configs WHERE project_id = ? AND id = ?',
      )
      .get(projectId, id) as DbRow | undefined;
    if (!row) {
      throw new NotFoundException(
        `Database config '${id}' not found in project '${projectId}'`,
      );
    }
    return this.rowToConfig(row);
  }

  upsert(
    projectId: string,
    dto: UpsertProjectDatabaseDto,
  ): ProjectDatabaseConfig {
    this.projects.findOne(projectId);
    const now = new Date().toISOString();

    const existing = this.db
      .prepare(
        'SELECT * FROM project_database_configs WHERE project_id = ? AND name = ? AND engine = ?',
      )
      .get(projectId, dto.name, dto.engine) as DbRow | undefined;

    if (existing) {
      this.db
        .prepare(
          `UPDATE project_database_configs SET
            database_name = COALESCE(?, database_name),
            host = COALESCE(?, host),
            port = COALESCE(?, port),
            username = COALESCE(?, username),
            password = COALESCE(?, password),
            file_path = COALESCE(?, file_path),
            notes = COALESCE(?, notes),
            updated_at = ?
          WHERE id = ?`,
        )
        .run(
          dto.database ?? null,
          dto.host ?? null,
          dto.port ?? null,
          dto.username ?? null,
          dto.password ?? null,
          dto.filePath ?? null,
          dto.notes ?? null,
          now,
          existing.id,
        );
      return this.get(projectId, existing.id);
    }

    const id = `${projectId}:${dto.engine}:${dto.name}`;
    this.db
      .prepare(
        `INSERT INTO project_database_configs
          (id, project_id, engine, name, database_name, host, port, username, password, file_path, notes, enabled, connection_status, connection_tested_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'unknown', NULL, ?, ?)`,
      )
      .run(
        id,
        projectId,
        dto.engine,
        dto.name,
        dto.database ?? null,
        dto.host ?? null,
        dto.port ?? null,
        dto.username ?? null,
        dto.password ?? null,
        dto.filePath ?? null,
        dto.notes ?? null,
        now,
        now,
      );
    return this.get(projectId, id);
  }

  updateConnectionStatus(
    projectId: string,
    id: string,
    status: 'ok' | 'error',
  ): ProjectDatabaseConfig {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        'UPDATE project_database_configs SET connection_status = ?, connection_tested_at = ? WHERE project_id = ? AND id = ?',
      )
      .run(status, now, projectId, id);
    if (result.changes === 0) {
      throw new NotFoundException(
        `Database config '${id}' not found in project '${projectId}'`,
      );
    }
    return this.get(projectId, id);
  }

  toggleEnabled(projectId: string, id: string): ProjectDatabaseConfig {
    const now = new Date().toISOString();
    const current = this.get(projectId, id);
    const newValue = current.enabled ? 0 : 1;
    const result = this.db
      .prepare(
        'UPDATE project_database_configs SET enabled = ?, updated_at = ? WHERE project_id = ? AND id = ?',
      )
      .run(newValue, now, projectId, id);
    if (result.changes === 0) {
      throw new NotFoundException(
        `Database config '${id}' not found in project '${projectId}'`,
      );
    }
    return this.get(projectId, id);
  }

  remove(projectId: string, id: string): void {
    this.projects.findOne(projectId);
    const result = this.db
      .prepare(
        'DELETE FROM project_database_configs WHERE project_id = ? AND id = ?',
      )
      .run(projectId, id);
    if (result.changes === 0) {
      throw new NotFoundException(
        `Database config '${id}' not found in project '${projectId}'`,
      );
    }
  }
}
