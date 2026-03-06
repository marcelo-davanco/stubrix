import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectsService } from '../projects/projects.service';
import { DriverRegistryService } from './drivers/driver-registry.service';
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

  constructor(
    private readonly config: ConfigService,
    private readonly registry: DriverRegistryService,
    private readonly projects: ProjectsService,
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

  private readMetadata(): Record<string, SnapshotMeta> {
    try {
      const file = this.getMetadataFile();
      if (fs.existsSync(file)) {
        const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf-8'));
        if (parsed && typeof parsed === 'object') {
          return parsed as Record<string, SnapshotMeta>;
        }
      }
    } catch {
      // ignore
    }
    return {};
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
    const meta = this.readMetadata();
    meta[name] = { ...this.getSnapshotMeta(name), ...updates };
    this.writeMetadata(meta);
    return meta[name];
  }

  private listSnapshotFiles(): SnapshotFile[] {
    const files: SnapshotFile[] = [];
    for (const engine of ['postgres', 'mysql', 'sqlite']) {
      const engineDir = path.join(this.dumpsDir, engine);
      if (!fs.existsSync(engineDir)) continue;
      const engineFiles = fs
        .readdirSync(engineDir)
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

  private getPostgresEnv(database?: string): NodeJS.ProcessEnv {
    return {
      ...process.env,
      PGHOST: this.postgresHost,
      PGPORT: this.postgresPort,
      PGUSER: this.postgresUser,
      PGPASSWORD: this.postgresPassword,
      PGDATABASE: database ?? this.postgresDatabase,
    };
  }

  private createPostgresSnapshot(database: string, filepath: string): void {
    execFileSync(
      'pg_dump',
      ['--clean', '--if-exists', '--file', filepath, database],
      {
        env: this.getPostgresEnv(database),
        stdio: 'pipe',
      },
    );
  }

  private restorePostgresSnapshot(database: string, filepath: string): void {
    execFileSync('psql', ['--file', filepath, database], {
      env: this.getPostgresEnv(database),
      stdio: 'pipe',
    });
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

    const label = dto.label ?? 'snapshot';
    const database = dto.database ?? 'default';
    const projectId = this.resolveProjectId(dto.projectId);
    const extension = driver.engine === 'sqlite' ? 'db' : 'sql';
    const filename = `${label}-${database}-${this.getTimestamp()}.${extension}`;
    const targetDir = path.join(this.dumpsDir, driver.engine);
    this.ensureDir(targetDir);
    const filepath = path.join(targetDir, filename);

    if (driver.engine === 'postgres') {
      this.createPostgresSnapshot(database, filepath);
    } else {
      fs.writeFileSync(
        filepath,
        `-- placeholder snapshot for ${driver.engine}:${database}\n`,
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
    let currentPath = snapshot.filepath;

    if (dto.newName && dto.newName !== name) {
      const ext = path.extname(name);
      const newName = dto.newName.endsWith(ext)
        ? dto.newName
        : `${dto.newName}${ext}`;
      const newPath = path.join(path.dirname(currentPath), newName);
      if (fs.existsSync(newPath)) {
        throw new ConflictException('A snapshot with this name already exists');
      }
      fs.renameSync(currentPath, newPath);
      const meta = this.readMetadata();
      if (meta[currentName]) {
        meta[newName] = meta[currentName];
        delete meta[currentName];
        this.writeMetadata(meta);
      }
      currentName = newName;
      currentPath = newPath;
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
      if (key in dto) {
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
    delete allMeta[name];
    this.writeMetadata(allMeta);

    return { message: `Snapshot "${name}" deleted` };
  }

  restore(
    name: string,
    dto: RestoreSnapshotDto,
    engineParam?: string,
  ): RestoreSnapshotResponse {
    const snapshots = this.listSnapshotFiles();
    const snapshot = snapshots.find((s) => s.file === name);
    if (!snapshot) throw new NotFoundException('Snapshot not found');

    const engine = engineParam ?? snapshot.engine;
    const database = dto.database ?? 'default';

    if (engine === 'postgres') {
      this.restorePostgresSnapshot(database, snapshot.filepath);
      return {
        message: `Snapshot "${name}" restored to database "${database}"`,
        engine,
      };
    }

    return {
      message: `Snapshot "${name}" restore requested to database "${database}"`,
      engine,
    };
  }
}
