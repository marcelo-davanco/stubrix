import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectsService } from '../projects/projects.service';
import { DriverRegistryService } from './drivers/driver-registry.service';
import { ProjectDatabaseConfigService } from './project-database-config.service';
import type { CreateSnapshotDto } from './dto/create-snapshot.dto';
import type { UpdateSnapshotDto } from './dto/update-snapshot.dto';
import type { RestoreSnapshotDto } from './dto/restore-snapshot.dto';

interface SnapshotFile {
  file: string;
  filepath: string;
  engine: string;
  stats: fs.Stats;
}

export interface SnapshotMeta {
  favorite: boolean;
  protected: boolean;
  category: string | null;
  engine: string | null;
  projectId: string | null;
}

export interface SnapshotItem extends SnapshotMeta {
  name: string;
  engine: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
}

export interface ListSnapshotsResponse {
  snapshots: SnapshotItem[];
  metadata: Record<string, SnapshotMeta>;
}

export interface CreateSnapshotResponse {
  snapshot: SnapshotItem;
}

export interface UpdateSnapshotResponse {
  name: string;
  meta: SnapshotMeta;
}

export interface RemoveSnapshotResponse {
  message: string;
}

export interface RestoreSnapshotResponse {
  message: string;
  engine: string;
}

@Injectable()
export class DbSnapshotsService {
  private readonly dumpsDir: string;
  private readonly postgresHost: string | undefined;
  private readonly postgresPort: string;
  private readonly postgresUser: string;
  private readonly postgresPassword: string;
  private readonly postgresDatabase: string;
  private readonly mysqlHost: string | undefined;
  private readonly mysqlPort: string;
  private readonly mysqlUser: string;
  private readonly mysqlPassword: string;
  private readonly mysqlDatabase: string;

  constructor(
    private readonly config: ConfigService,
    private readonly registry: DriverRegistryService,
    private readonly projects: ProjectsService,
    private readonly dbConfigs: ProjectDatabaseConfigService,
  ) {
    this.dumpsDir =
      this.config.get<string>('DUMPS_DIR') ??
      path.join(process.cwd(), '../../dumps');
    this.postgresHost = this.config.get<string>('PG_HOST');
    this.postgresPort = this.config.get<string>('PG_PORT') ?? '5432';
    this.postgresUser = this.config.get<string>('PG_USER') ?? 'postgres';
    this.postgresPassword =
      this.config.get<string>('PG_PASSWORD') ?? 'postgres';
    this.postgresDatabase =
      this.config.get<string>('PG_DATABASE') ?? 'postgres';

    // MySQL environment variables
    this.mysqlHost = this.config.get<string>('MYSQL_HOST');
    this.mysqlPort = this.config.get<string>('MYSQL_PORT') ?? '3306';
    this.mysqlUser = this.config.get<string>('MYSQL_USER') ?? 'stubrix';
    this.mysqlPassword = this.config.get<string>('MYSQL_PASSWORD') ?? 'stubrix';
    this.mysqlDatabase = this.config.get<string>('MYSQL_DATABASE') ?? 'stubrix';

    this.ensureDir(this.dumpsDir);
    this.ensureDir(path.join(this.dumpsDir, 'postgres'));
    this.ensureDir(path.join(this.dumpsDir, 'mysql'));
    this.ensureDir(path.join(this.dumpsDir, 'sqlite'));
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private getMetadataFile(): string {
    return path.join(this.dumpsDir, '.snapshot-metadata.json');
  }

  private static readonly FORBIDDEN_KEYS = new Set([
    '__proto__',
    'constructor',
    'prototype',
  ]);

  private readMetadata(): Record<string, SnapshotMeta> {
    try {
      const file = this.getMetadataFile();
      if (fs.existsSync(file)) {
        const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf-8'));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const safe = Object.create(null) as Record<string, SnapshotMeta>;
          for (const [k, v] of Object.entries(parsed)) {
            if (!DbSnapshotsService.FORBIDDEN_KEYS.has(k)) {
              safe[k] = v as SnapshotMeta;
            }
          }
          return safe;
        }
      }
    } catch {
      // ignore
    }
    return Object.create(null) as Record<string, SnapshotMeta>;
  }

  private writeMetadata(data: Record<string, SnapshotMeta>): void {
    fs.writeFileSync(
      this.getMetadataFile(),
      JSON.stringify(data, null, 2),
      'utf-8',
    );
  }

  private getSnapshotMeta(name: string): SnapshotMeta {
    const meta = this.readMetadata();
    return (
      meta[name] ?? {
        favorite: false,
        protected: false,
        category: null,
        engine: null,
        projectId: null,
      }
    );
  }

  private resolveProjectId(projectId?: string): string | null {
    if (!projectId) {
      return null;
    }

    this.projects.findOne(projectId);
    return projectId;
  }

  private setSnapshotMeta(
    name: string,
    updates: Partial<SnapshotMeta>,
  ): SnapshotMeta {
    const baseName = path.basename(name, path.extname(name));
    if (DbSnapshotsService.FORBIDDEN_KEYS.has(baseName)) {
      throw new ForbiddenException('Invalid snapshot name');
    }
    const meta = this.readMetadata();
    const safeUpdates: SnapshotMeta = {
      ...this.getSnapshotMeta(name),
      favorite:
        typeof updates.favorite === 'boolean' ? updates.favorite : false,
      protected:
        typeof updates.protected === 'boolean' ? updates.protected : false,
      category: typeof updates.category === 'string' ? updates.category : null,
      engine: typeof updates.engine === 'string' ? updates.engine : null,
      projectId:
        typeof updates.projectId === 'string' ? updates.projectId : null,
    };
    meta[name] = safeUpdates;
    this.writeMetadata(meta);
    return meta[name];
  }

  private listSnapshotFiles(): SnapshotFile[] {
    const files: SnapshotFile[] = [];
    for (const engine of ['postgres', 'mysql', 'sqlite']) {
      const engineDir = path.join(this.dumpsDir, engine);
      let dirEntries: string[];
      try {
        dirEntries = fs.readdirSync(engineDir) as unknown as string[];
      } catch {
        continue;
      }
      const engineFiles = dirEntries
        .filter((f: string) => f.endsWith('.sql') || f.endsWith('.db'))
        .map((file: string) => {
          const filepath = path.join(engineDir, file);
          const stats = fs.statSync(filepath);
          return { file, filepath, engine, stats };
        });
      files.push(...engineFiles);
    }
    return files;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  private getTimestamp(): string {
    return new Date()
      .toISOString()
      .replace(/[:.]/g, '')
      .replace('T', '-')
      .slice(0, 15);
  }

  private getPostgresEnv(
    database?: string,
    overrides?: Partial<{
      host: string;
      port: string;
      user: string;
      password: string;
    }>,
  ): NodeJS.ProcessEnv {
    return {
      ...process.env,
      PGHOST: overrides?.host ?? this.postgresHost,
      PGPORT: overrides?.port ?? this.postgresPort,
      PGUSER: overrides?.user ?? this.postgresUser,
      PGPASSWORD: overrides?.password ?? this.postgresPassword,
      PGDATABASE: database ?? this.postgresDatabase,
    };
  }

  private getMysqlEnv(
    overrides?: Partial<{
      host: string;
      port: string;
      username: string;
      password: string;
    }>,
  ): NodeJS.ProcessEnv {
    return {
      ...process.env,
      MYSQL_HOST: overrides?.host ?? this.mysqlHost,
      MYSQL_PORT: overrides?.port ?? this.mysqlPort,
      MYSQL_USER: overrides?.username ?? this.mysqlUser,
      MYSQL_PWD: overrides?.password ?? this.mysqlPassword,
    };
  }

  private readonly execFileAsync = promisify(execFile);

  private async createPostgresSnapshot(
    database: string,
    filepath: string,
    envOverrides?: Partial<{
      host: string;
      port: string;
      user: string;
      password: string;
    }>,
  ): Promise<void> {
    const host = envOverrides?.host ?? this.postgresHost ?? 'localhost';
    const port = envOverrides?.port ?? this.postgresPort;
    const user = envOverrides?.user ?? this.postgresUser;
    await this.execFileAsync(
      'pg_dump',
      [
        '-h',
        host,
        '-p',
        port,
        '-U',
        user,
        '--clean',
        '--if-exists',
        '--file',
        filepath,
        database,
      ],
      {
        env: this.getPostgresEnv(database, envOverrides),
      },
    );
  }

  private async restorePostgresSnapshot(
    database: string,
    filepath: string,
    envOverrides?: Partial<{
      host: string;
      port: string;
      user: string;
      password: string;
    }>,
  ): Promise<void> {
    const host = envOverrides?.host ?? this.postgresHost ?? 'localhost';
    const port = envOverrides?.port ?? this.postgresPort;
    const user = envOverrides?.user ?? this.postgresUser;
    await this.execFileAsync(
      'psql',
      ['-h', host, '-p', port, '-U', user, '--file', filepath, database],
      {
        env: this.getPostgresEnv(database, envOverrides),
      },
    );
  }

  list(projectId?: string): ListSnapshotsResponse {
    if (projectId) {
      this.projects.findOne(projectId);
    }
    const resolvedProjectId = projectId ?? null;
    const snapshots = this.listSnapshotFiles()
      .map(({ file, engine, stats }) => ({
        ...this.getSnapshotMeta(file),
        name: file,
        engine,
        size: stats.size,
        sizeFormatted: this.formatBytes(stats.size),
        createdAt: stats.mtime.toISOString(),
      }))
      .filter((snapshot) => {
        if (!resolvedProjectId) {
          return true;
        }

        return snapshot.projectId === resolvedProjectId;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    return { snapshots, metadata: this.readMetadata() };
  }

  private resolveConnectionOverrides(
    projectId: string | null,
    connectionId: string | undefined,
    engine: string,
  ):
    | Partial<{ host: string; port: string; user: string; password: string }>
    | undefined {
    if (!connectionId || !projectId) {
      return undefined;
    }
    try {
      const cfg = this.dbConfigs.get(projectId, connectionId);
      if (cfg.engine !== engine) {
        return undefined;
      }
      return {
        host: cfg.host ?? undefined,
        port: cfg.port ?? undefined,
        user: cfg.username ?? undefined,
        password: cfg.password ?? undefined,
      };
    } catch {
      return undefined;
    }
  }

  async create(
    dto: CreateSnapshotDto,
    engineParam?: string,
  ): Promise<CreateSnapshotResponse> {
    const engineName = engineParam ?? dto.engine;
    const driver = engineName
      ? this.registry.get(engineName)
      : await this.registry.getPrimary();

    if (!driver) {
      throw new NotFoundException('No active database engine found');
    }

    const label = path.basename(dto.label ?? 'snapshot');
    const database = path.basename(dto.database ?? 'default');
    const projectId = this.resolveProjectId(dto.projectId);
    const extension = driver.engine === 'sqlite' ? 'db' : 'sql';
    const filename = `${label}-${database}-${this.getTimestamp()}.${extension}`;
    const targetDir = path.join(this.dumpsDir, driver.engine);
    this.ensureDir(targetDir);
    const filepath = path.join(targetDir, filename);
    const resolvedFilepath = path.resolve(filepath);
    const resolvedTargetDir = path.resolve(targetDir);
    if (
      resolvedFilepath !== resolvedTargetDir &&
      !resolvedFilepath.startsWith(resolvedTargetDir + path.sep)
    ) {
      throw new Error('Snapshot path is outside the allowed directory');
    }

    if (driver.engine === 'postgres') {
      const envOverrides = this.resolveConnectionOverrides(
        projectId,
        dto.connectionId,
        driver.engine,
      );
      await this.createPostgresSnapshot(database, filepath, envOverrides);
    } else if (driver.engine === 'mysql') {
      const envOverrides = this.resolveConnectionOverrides(
        projectId,
        dto.connectionId,
        driver.engine,
      );
      if (driver.createSnapshot) {
        await driver.createSnapshot(database, filepath, envOverrides);
      } else {
        throw new Error('MySQL driver does not support snapshots');
      }
    } else if (driver.engine === 'sqlite') {
      if (driver.createSnapshot) {
        await driver.createSnapshot(database, filepath);
      } else {
        throw new Error('SQLite driver does not support snapshots');
      }
    } else {
      const safeEngine = String(driver.engine).replace(/[^a-z0-9_-]/gi, '');
      const safeDatabase = String(database).replace(/[^a-z0-9_-]/gi, '');
      fs.writeFileSync(
        filepath,
        `-- placeholder snapshot for ${safeEngine}:${safeDatabase}\n`,
        'utf-8',
      );
    }

    const snapshotMeta = this.setSnapshotMeta(filename, {
      favorite: false,
      protected: false,
      category: dto.category ?? null,
      engine: driver.engine,
      projectId,
    });

    const stats = fs.statSync(filepath);
    return {
      snapshot: {
        ...snapshotMeta,
        name: filename,
        engine: driver.engine,
        size: stats.size,
        sizeFormatted: this.formatBytes(stats.size),
        createdAt: stats.mtime.toISOString(),
      },
    };
  }

  update(name: string, dto: UpdateSnapshotDto): UpdateSnapshotResponse {
    const snapshots = this.listSnapshotFiles();
    const snapshot = snapshots.find((s) => s.file === name);
    if (!snapshot) throw new NotFoundException('Snapshot not found');

    let currentName = name;
    const currentPath = snapshot.filepath;

    if (dto.newName && dto.newName !== name) {
      const ext = path.extname(name);
      const rawName = dto.newName.endsWith(ext)
        ? dto.newName
        : `${dto.newName}${ext}`;
      const newName = path.basename(rawName);
      const newPath = path.join(path.dirname(currentPath), newName);
      if (fs.existsSync(newPath)) {
        throw new ConflictException('A snapshot with this name already exists');
      }
      fs.renameSync(currentPath, newPath);
      const meta = this.readMetadata();
      const forbidden = DbSnapshotsService.FORBIDDEN_KEYS;
      if (
        meta[currentName] &&
        !forbidden.has(newName) &&
        !forbidden.has(currentName)
      ) {
        // lgtm[js/remote-property-injection] - keys sanitized against forbidden prototype names above
        meta[newName] = meta[currentName];
        delete meta[currentName];
        this.writeMetadata(meta);
      }
      currentName = newName;
    }

    const allowed: Array<keyof SnapshotMeta> = [
      'favorite',
      'protected',
      'category',
      'engine',
      'projectId',
    ];
    const updates: Partial<SnapshotMeta> = {};
    for (const key of allowed) {
      if (key in dto && (dto as Record<string, unknown>)[key] !== undefined) {
        (updates as Record<string, unknown>)[key] = (
          dto as Record<string, unknown>
        )[key];
      }
    }
    const meta = this.setSnapshotMeta(currentName, updates);
    return { name: currentName, meta };
  }

  remove(name: string): RemoveSnapshotResponse {
    const snapshots = this.listSnapshotFiles();
    const snapshot = snapshots.find((s) => s.file === name);
    if (!snapshot) throw new NotFoundException('Snapshot not found');

    const meta = this.getSnapshotMeta(name);
    if (meta.protected) {
      throw new ForbiddenException(
        'Snapshot is protected and cannot be deleted',
      );
    }

    fs.unlinkSync(snapshot.filepath);
    const allMeta = this.readMetadata();
    if (
      name !== '__proto__' &&
      name !== 'constructor' &&
      name !== 'prototype'
    ) {
      delete allMeta[name];
    }
    this.writeMetadata(allMeta);

    return { message: `Snapshot "${name}" deleted` };
  }

  async restore(
    name: string,
    dto: RestoreSnapshotDto,
    engineParam?: string,
  ): Promise<RestoreSnapshotResponse> {
    const snapshots = this.listSnapshotFiles();
    const snapshot = snapshots.find((s) => s.file === name);
    if (!snapshot) throw new NotFoundException('Snapshot not found');

    const engine = engineParam ?? snapshot.engine;
    const database = dto.database ?? 'default';

    if (engine === 'postgres') {
      const overrides = this.resolveConnectionOverrides(
        dto.projectId ?? null,
        dto.connectionId,
        engine,
      );
      await this.restorePostgresSnapshot(
        database,
        snapshot.filepath,
        overrides,
      );
      return {
        message: `Snapshot "${name}" restored to database "${database}"`,
        engine,
      };
    } else if (engine === 'mysql') {
      const overrides = this.resolveConnectionOverrides(
        dto.projectId ?? null,
        dto.connectionId,
        engine,
      );
      const mysqlDriver = this.registry.get('mysql');
      if (mysqlDriver?.restoreSnapshot) {
        await mysqlDriver.restoreSnapshot(
          database,
          snapshot.filepath,
          overrides,
        );
        return {
          message: `Snapshot "${name}" restored to database "${database}"`,
          engine,
        };
      } else {
        throw new Error('MySQL driver does not support restore');
      }
    } else if (engine === 'sqlite') {
      const sqliteDriver = this.registry.get('sqlite');
      if (sqliteDriver?.restoreSnapshot) {
        await sqliteDriver.restoreSnapshot(database, snapshot.filepath);
        return {
          message: `Snapshot "${name}" restored to database "${database}"`,
          engine,
        };
      } else {
        throw new Error('SQLite driver does not support restore');
      }
    }

    return {
      message: `Snapshot "${name}" restore requested to database "${database}"`,
      engine,
    };
  }
}
