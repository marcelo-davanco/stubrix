import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import * as fs from 'fs';
import * as path from 'path';
import { DbSnapshotsService } from './db-snapshots.service';
import { ProjectsService } from '../projects/projects.service';
import { DriverRegistryService } from './drivers/driver-registry.service';
import { ProjectDatabaseConfigService } from './project-database-config.service';
import type { DatabaseDriverInterface } from './drivers/database-driver.interface';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

// Prevent better-sqlite3 native binding load: explicit factory avoids auto-mock
// inspection that would load the real module and fail to find native bindings.
jest.mock('better-sqlite3', () =>
  jest.fn().mockImplementation(() => ({
    prepare: jest.fn().mockReturnValue({
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue(undefined),
      run: jest.fn().mockReturnValue({ changes: 0, lastInsertRowid: 0 }),
    }),
    exec: jest.fn(),
    pragma: jest.fn(),
    close: jest.fn(),
    backup: jest.fn().mockResolvedValue(undefined),
  })),
);

// Mock child_process so promisify(execFile) uses the mock at service instantiation
jest.mock('child_process', () => ({ execFile: jest.fn() }));

// Mock fs so every service file-system call is controllable
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
  statSync: jest
    .fn()
    .mockReturnValue({ size: 2048, mtime: new Date('2024-06-01T10:00:00Z') }),
  readFileSync: jest.fn().mockReturnValue('{}'),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  renameSync: jest.fn(),
}));

import { execFile } from 'child_process';

const mockExecFile = execFile as unknown as jest.Mock;

// Typed accessors for the mocked fs functions
const mockFs = {
  existsSync: fs.existsSync as jest.Mock,
  mkdirSync: fs.mkdirSync as jest.Mock,
  readdirSync: fs.readdirSync as jest.Mock,
  statSync: fs.statSync as jest.Mock,
  readFileSync: fs.readFileSync as jest.Mock,
  writeFileSync: fs.writeFileSync as jest.Mock,
  unlinkSync: fs.unlinkSync as jest.Mock,
  renameSync: fs.renameSync as jest.Mock,
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DUMPS_DIR = '/tmp/test-dumps';

// ─── Driver factory ───────────────────────────────────────────────────────────

const makeDriver = (
  overrides: Partial<DatabaseDriverInterface> = {},
): DatabaseDriverInterface => ({
  engine: 'postgres',
  isConfigured: jest.fn().mockReturnValue(true),
  healthCheck: jest.fn().mockResolvedValue(true),
  listDatabases: jest.fn().mockResolvedValue([]),
  getDatabaseInfo: jest.fn().mockResolvedValue({}),
  createSnapshot: jest.fn().mockResolvedValue(undefined),
  restoreSnapshot: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const POSTGRES_DRIVER = makeDriver({ engine: 'postgres' });
const MYSQL_DRIVER = makeDriver({ engine: 'mysql' });
const SQLITE_DRIVER = makeDriver({ engine: 'sqlite' });

describe('DbSnapshotsService', () => {
  let service: DbSnapshotsService;
  let projects: DeepMocked<ProjectsService>;
  let registry: DeepMocked<DriverRegistryService>;
  let dbConfigs: DeepMocked<ProjectDatabaseConfigService>;
  let module: TestingModule;

  beforeEach(async () => {
    // Reset fs mocks to safe defaults before each test
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockReset();
    mockFs.readdirSync.mockReturnValue([]);
    mockFs.statSync.mockReturnValue({
      size: 2048,
      mtime: new Date('2024-06-01T10:00:00Z'),
    });
    mockFs.readFileSync.mockReturnValue('{}');
    mockFs.writeFileSync.mockReset();
    mockFs.unlinkSync.mockReset();
    mockFs.renameSync.mockReset();

    // execFile resolves successfully by default
    mockExecFile.mockImplementation(
      (
        _f: unknown,
        _a: unknown,
        _o: unknown,
        cb: (err: null, stdout: string, stderr: string) => void,
      ) => cb(null, '', ''),
    );

    module = await Test.createTestingModule({
      providers: [
        DbSnapshotsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'DUMPS_DIR') return DUMPS_DIR;
              return undefined;
            }),
          },
        },
        { provide: ProjectsService, useValue: createMock<ProjectsService>() },
        {
          provide: DriverRegistryService,
          useValue: createMock<DriverRegistryService>(),
        },
        {
          provide: ProjectDatabaseConfigService,
          useValue: createMock<ProjectDatabaseConfigService>(),
        },
      ],
    }).compile();

    service = module.get<DbSnapshotsService>(DbSnapshotsService);
    projects = module.get<DeepMocked<ProjectsService>>(ProjectsService);
    registry = module.get<DeepMocked<DriverRegistryService>>(
      DriverRegistryService,
    );
    dbConfigs = module.get<DeepMocked<ProjectDatabaseConfigService>>(
      ProjectDatabaseConfigService,
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await module.close();
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const mockReaddirSync = (impl: (dir: string) => string[]) => {
    mockFs.readdirSync.mockImplementation(impl);
  };

  const stubProject = (id = 'proj-id') => ({
    id,
    name: `Project ${id}`,
    slug: id,
    proxyTarget: null,
    description: '',
    createdAt: null,
  });

  // ─── list() ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('should return empty list when no snapshot files exist', () => {
      const result = service.list();

      expect(result.snapshots).toEqual([]);
    });

    it('should list snapshots across all three engine directories', () => {
      mockReaddirSync((dir) => {
        if (dir.endsWith('postgres')) return ['snap1.sql'];
        if (dir.endsWith('mysql')) return ['snap2.sql'];
        if (dir.endsWith('sqlite')) return ['snap3.db'];
        return [];
      });

      const result = service.list();

      expect(result.snapshots).toHaveLength(3);
      expect(result.snapshots.map((s) => s.name)).toEqual(
        expect.arrayContaining(['snap1.sql', 'snap2.sql', 'snap3.db']),
      );
    });

    it('should filter snapshots by projectId', () => {
      mockReaddirSync((dir) => {
        if (dir.endsWith('postgres')) return ['snap1.sql'];
        return [];
      });
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          'snap1.sql': {
            projectId: 'project-a',
            favorite: false,
            protected: false,
            category: null,
            engine: 'postgres',
          },
        }),
      );
      projects.findOne.mockReturnValue(stubProject('project-a'));

      const result = service.list('project-a');

      expect(result.snapshots).toHaveLength(1);
      expect(result.snapshots[0].projectId).toBe('project-a');
    });

    it('should return empty when no snapshots match projectId', () => {
      mockReaddirSync((dir) => {
        if (dir.endsWith('postgres')) return ['snap-other.sql'];
        return [];
      });
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          'snap-other.sql': {
            projectId: 'other-project',
            favorite: false,
            protected: false,
            category: null,
            engine: 'postgres',
          },
        }),
      );
      projects.findOne.mockReturnValue(stubProject('project-b'));

      expect(service.list('project-b').snapshots).toHaveLength(0);
    });

    it('should skip non-sql/db files', () => {
      mockReaddirSync((dir) => {
        if (dir.endsWith('postgres'))
          return ['snap.sql', 'readme.txt', 'archive.tar.gz'];
        return [];
      });

      const result = service.list();

      expect(result.snapshots).toHaveLength(1);
      expect(result.snapshots[0].name).toBe('snap.sql');
    });

    it('should validate project when projectId is provided', () => {
      projects.findOne.mockReturnValue(stubProject());

      service.list('proj-id');

      expect(projects.findOne).toHaveBeenCalledWith('proj-id');
    });

    it('should skip engine directory when it does not exist', () => {
      mockFs.readdirSync.mockImplementation((dir: fs.PathLike) => {
        if (dir.toString().endsWith('mysql')) throw new Error('ENOENT');
        return [];
      });

      const result = service.list();

      // only postgres and sqlite dirs checked — both empty
      expect(result.snapshots).toHaveLength(0);
    });
  });

  // ─── create() ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should throw NotFoundException when no engine is available', async () => {
      registry.get.mockReturnValue(undefined);
      registry.getPrimary.mockResolvedValue(null);

      await expect(
        service.create({ label: 'snap', database: 'mydb' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a postgres snapshot via pg_dump', async () => {
      registry.get.mockReturnValue(POSTGRES_DRIVER);

      await service.create({
        label: 'snap',
        database: 'mydb',
        engine: 'postgres',
      });

      expect(mockExecFile).toHaveBeenCalledWith(
        'pg_dump',
        expect.arrayContaining(['mydb']),
        expect.objectContaining({
          env: expect.objectContaining({ PGDATABASE: 'mydb' }),
        }),
        expect.any(Function),
      );
    });

    it('should create a mysql snapshot via driver.createSnapshot', async () => {
      registry.get.mockReturnValue(MYSQL_DRIVER);

      await service.create({
        label: 'snap',
        database: 'mydb',
        engine: 'mysql',
      });

      expect(MYSQL_DRIVER.createSnapshot).toHaveBeenCalled();
    });

    it('should throw when mysql driver has no createSnapshot method', async () => {
      registry.get.mockReturnValue(
        makeDriver({ engine: 'mysql', createSnapshot: undefined }),
      );

      await expect(
        service.create({ label: 'snap', database: 'mydb', engine: 'mysql' }),
      ).rejects.toThrow('MySQL driver does not support snapshots');
    });

    it('should create a sqlite snapshot via driver.createSnapshot', async () => {
      registry.get.mockReturnValue(SQLITE_DRIVER);

      await service.create({
        label: 'snap',
        database: 'test.db',
        engine: 'sqlite',
      });

      expect(SQLITE_DRIVER.createSnapshot).toHaveBeenCalled();
    });

    it('should throw when sqlite driver has no createSnapshot method', async () => {
      registry.get.mockReturnValue(
        makeDriver({ engine: 'sqlite', createSnapshot: undefined }),
      );

      await expect(
        service.create({
          label: 'snap',
          database: 'test.db',
          engine: 'sqlite',
        }),
      ).rejects.toThrow('SQLite driver does not support snapshots');
    });

    it('should use primary engine when no engineParam is given', async () => {
      registry.getPrimary.mockResolvedValue(POSTGRES_DRIVER);

      await service.create({ label: 'snap', database: 'mydb' });

      expect(registry.getPrimary).toHaveBeenCalled();
    });

    it('should write a placeholder file for unknown engines', async () => {
      registry.get.mockReturnValue(makeDriver({ engine: 'custom-engine' }));

      await service.create({
        label: 'snap',
        database: 'mydb',
        engine: 'custom-engine',
      });

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('placeholder snapshot'),
        'utf-8',
      );
    });

    it('should apply connection overrides from dbConfigs', async () => {
      registry.get.mockReturnValue(POSTGRES_DRIVER);
      projects.findOne.mockReturnValue(stubProject('proj-1'));
      dbConfigs.get.mockReturnValue({
        id: 'conn-1',
        projectId: 'proj-1',
        engine: 'postgres',
        name: 'Custom PG',
        database: 'mydb',
        host: 'custom-host',
        port: '5433',
        username: 'customuser',
        password: 'custompass',
        filePath: null,
        notes: null,
        enabled: true,
        connectionStatus: 'ok',
        connectionTestedAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      await service.create({
        label: 'snap',
        database: 'mydb',
        engine: 'postgres',
        projectId: 'proj-1',
        connectionId: 'conn-1',
      });

      expect(mockExecFile).toHaveBeenCalledWith(
        'pg_dump',
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            PGHOST: 'custom-host',
            PGUSER: 'customuser',
          }),
        }),
        expect.any(Function),
      );
    });

    it('should persist snapshot metadata with category', async () => {
      registry.get.mockReturnValue(POSTGRES_DRIVER);

      await service.create({
        label: 'tagged',
        database: 'mydb',
        engine: 'postgres',
        category: 'production',
      });

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.snapshot-metadata.json'),
        expect.stringContaining('production'),
        'utf-8',
      );
    });

    it('should return snapshot item with correct engine and name', async () => {
      registry.get.mockReturnValue(POSTGRES_DRIVER);

      const result = await service.create({
        label: 'mysnap',
        database: 'testdb',
        engine: 'postgres',
      });

      expect(result.snapshot.engine).toBe('postgres');
      expect(result.snapshot.name).toMatch(/mysnap-testdb-.*\.sql/);
    });
  });

  // ─── update() ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    const SNAP_NAME = 'snapshot-mydb-20240601-10.sql';

    beforeEach(() => {
      mockReaddirSync((dir) => {
        if (dir.endsWith('postgres')) return [SNAP_NAME];
        return [];
      });
    });

    it('should throw NotFoundException when snapshot does not exist', () => {
      expect(() => service.update('nonexistent.sql', {})).toThrow(
        NotFoundException,
      );
    });

    it('should update metadata without renaming', () => {
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          [SNAP_NAME]: {
            favorite: false,
            protected: false,
            category: null,
            engine: 'postgres',
            projectId: null,
          },
        }),
      );

      const result = service.update(SNAP_NAME, { favorite: true });

      expect(result.name).toBe(SNAP_NAME);
      expect(result.meta.favorite).toBe(true);
    });

    it('should rename snapshot file and transfer metadata', () => {
      const newName = 'new-snapshot.sql';
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          [SNAP_NAME]: {
            favorite: true,
            protected: false,
            category: null,
            engine: 'postgres',
            projectId: null,
          },
        }),
      );

      const result = service.update(SNAP_NAME, { newName });

      expect(mockFs.renameSync).toHaveBeenCalled();
      expect(result.name).toBe(newName);
    });

    it('should throw ConflictException when rename target already exists', () => {
      mockFs.existsSync.mockImplementation((p: fs.PathLike) =>
        p.toString().endsWith('existing.sql'),
      );

      expect(() =>
        service.update(SNAP_NAME, { newName: 'existing.sql' }),
      ).toThrow(ConflictException);
    });

    it('should append file extension when newName has none', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockReturnValue('{}');

      const result = service.update(SNAP_NAME, { newName: 'renamed-snap' });

      expect(result.name).toBe('renamed-snap.sql');
    });
  });

  // ─── remove() ────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    const SNAP_NAME = 'snapshot-mydb-20240601-10.sql';

    beforeEach(() => {
      mockReaddirSync((dir) => {
        if (dir.endsWith('postgres')) return [SNAP_NAME];
        return [];
      });
    });

    it('should throw NotFoundException when snapshot does not exist', () => {
      expect(() => service.remove('nonexistent.sql')).toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when snapshot is protected', () => {
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          [SNAP_NAME]: {
            protected: true,
            favorite: false,
            category: null,
            engine: 'postgres',
            projectId: null,
          },
        }),
      );

      expect(() => service.remove(SNAP_NAME)).toThrow(ForbiddenException);
    });

    it('should delete file and remove from metadata on success', () => {
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          [SNAP_NAME]: {
            protected: false,
            favorite: false,
            category: null,
            engine: 'postgres',
            projectId: null,
          },
        }),
      );

      const result = service.remove(SNAP_NAME);

      expect(mockFs.unlinkSync).toHaveBeenCalledWith(
        path.join(DUMPS_DIR, 'postgres', SNAP_NAME),
      );
      expect(result.message).toContain(SNAP_NAME);
    });

    it('should persist metadata after deletion', () => {
      mockFs.readFileSync.mockReturnValue('{}');

      service.remove(SNAP_NAME);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.snapshot-metadata.json'),
        expect.any(String),
        'utf-8',
      );
    });
  });

  // ─── restore() ───────────────────────────────────────────────────────────────

  describe('restore()', () => {
    const POSTGRES_SNAP = 'snap-postgres.sql';
    const MYSQL_SNAP = 'snap-mysql.sql';
    const SQLITE_SNAP = 'snap-sqlite.db';

    beforeEach(() => {
      mockReaddirSync((dir) => {
        if (dir.endsWith('postgres')) return [POSTGRES_SNAP];
        if (dir.endsWith('mysql')) return [MYSQL_SNAP];
        if (dir.endsWith('sqlite')) return [SQLITE_SNAP];
        return [];
      });
    });

    it('should throw NotFoundException when snapshot is not found', async () => {
      await expect(service.restore('nonexistent.sql', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should restore a postgres snapshot via psql', async () => {
      const result = await service.restore(POSTGRES_SNAP, {
        database: 'target-db',
      });

      expect(mockExecFile).toHaveBeenCalledWith(
        'psql',
        expect.arrayContaining(['target-db']),
        expect.any(Object),
        expect.any(Function),
      );
      expect(result.engine).toBe('postgres');
      expect(result.message).toContain(POSTGRES_SNAP);
    });

    it('should default database to "default" when not specified', async () => {
      await service.restore(POSTGRES_SNAP, {});

      expect(mockExecFile).toHaveBeenCalledWith(
        'psql',
        expect.arrayContaining(['default']),
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should restore a mysql snapshot via driver.restoreSnapshot', async () => {
      registry.get.mockReturnValue(MYSQL_DRIVER);

      const result = await service.restore(MYSQL_SNAP, {
        database: 'target-db',
      });

      expect(MYSQL_DRIVER.restoreSnapshot).toHaveBeenCalled();
      expect(result.engine).toBe('mysql');
    });

    it('should throw when mysql driver has no restoreSnapshot method', async () => {
      registry.get.mockReturnValue(
        makeDriver({ engine: 'mysql', restoreSnapshot: undefined }),
      );

      await expect(
        service.restore(MYSQL_SNAP, { database: 'db' }),
      ).rejects.toThrow('MySQL driver does not support restore');
    });

    it('should restore a sqlite snapshot via driver.restoreSnapshot', async () => {
      registry.get.mockReturnValue(SQLITE_DRIVER);

      const result = await service.restore(SQLITE_SNAP, {});

      expect(SQLITE_DRIVER.restoreSnapshot).toHaveBeenCalled();
      expect(result.engine).toBe('sqlite');
    });

    it('should throw when sqlite driver has no restoreSnapshot method', async () => {
      registry.get.mockReturnValue(
        makeDriver({ engine: 'sqlite', restoreSnapshot: undefined }),
      );

      await expect(service.restore(SQLITE_SNAP, {})).rejects.toThrow(
        'SQLite driver does not support restore',
      );
    });

    it('should use engineParam override to determine restore strategy', async () => {
      registry.get.mockReturnValue(MYSQL_DRIVER);

      const result = await service.restore(
        MYSQL_SNAP,
        { database: 'db' },
        'mysql',
      );

      expect(result.engine).toBe('mysql');
    });

    it('should return generic restore message for unsupported engine', async () => {
      mockReaddirSync((dir) => {
        if (dir.endsWith('postgres')) return [POSTGRES_SNAP];
        return [];
      });

      const result = await service.restore(
        POSTGRES_SNAP,
        { database: 'db' },
        'unknown-engine',
      );

      expect(result.message).toContain('restore requested');
      expect(result.engine).toBe('unknown-engine');
    });
  });

  // ─── Prototype pollution protection ──────────────────────────────────────────

  describe('setSnapshotMeta() — prototype pollution guard', () => {
    it('should throw ForbiddenException for __proto__ as snapshot name', () => {
      mockReaddirSync((dir) => {
        if (dir.endsWith('postgres')) return ['__proto__.sql'];
        return [];
      });

      expect(() => service.update('__proto__.sql', { favorite: true })).toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for constructor as snapshot name', () => {
      mockReaddirSync((dir) => {
        if (dir.endsWith('postgres')) return ['constructor.sql'];
        return [];
      });

      expect(() =>
        service.update('constructor.sql', { favorite: true }),
      ).toThrow(ForbiddenException);
    });
  });

  // ─── formatBytes() ───────────────────────────────────────────────────────────

  describe('formatBytes()', () => {
    it('should format 0 bytes as "0 B"', () => {
      mockReaddirSync((dir) => {
        if (dir.endsWith('postgres')) return ['empty.sql'];
        return [];
      });
      mockFs.statSync.mockReturnValue({
        size: 0,
        mtime: new Date('2024-01-01'),
      });

      expect(service.list().snapshots[0].sizeFormatted).toBe('0 B');
    });

    it('should format 2048 bytes as KB', () => {
      mockReaddirSync((dir) => {
        if (dir.endsWith('postgres')) return ['mid.sql'];
        return [];
      });
      mockFs.statSync.mockReturnValue({
        size: 2048,
        mtime: new Date('2024-01-01'),
      });

      expect(service.list().snapshots[0].sizeFormatted).toContain('KB');
    });
  });

  // ─── readMetadata() error resilience ─────────────────────────────────────────

  describe('readMetadata() — error resilience', () => {
    it('should return empty object when metadata file does not exist', () => {
      mockFs.existsSync.mockImplementation(
        (p: fs.PathLike) => !p.toString().includes('.snapshot-metadata.json'),
      );

      expect(service.list().metadata).toEqual({});
    });

    it('should return empty object when metadata file read throws', () => {
      mockFs.readFileSync.mockImplementation((p: fs.PathLike | number) => {
        if (p.toString().includes('.snapshot-metadata.json')) {
          throw new Error('read error');
        }
        return '{}';
      });

      expect(service.list().metadata).toEqual({});
    });
  });

  // ─── resolveConnectionOverrides() ────────────────────────────────────────────

  describe('resolveConnectionOverrides()', () => {
    it('should not call dbConfigs.get when connectionId is absent', async () => {
      registry.get.mockReturnValue(POSTGRES_DRIVER);
      projects.findOne.mockReturnValue(stubProject('proj-1'));

      await service.create({
        label: 'snap',
        database: 'mydb',
        engine: 'postgres',
        projectId: 'proj-1',
      });

      expect(dbConfigs.get).not.toHaveBeenCalled();
    });

    it('should ignore overrides when config engine mismatches driver engine', async () => {
      registry.get.mockReturnValue(POSTGRES_DRIVER);
      projects.findOne.mockReturnValue(stubProject('proj-1'));
      dbConfigs.get.mockReturnValue({
        id: 'conn-1',
        projectId: 'proj-1',
        engine: 'mysql', // mismatch
        name: 'MySQL Conn',
        database: 'mydb',
        host: 'mysql-host',
        port: '3306',
        username: 'user',
        password: 'pass',
        filePath: null,
        notes: null,
        enabled: true,
        connectionStatus: 'ok',
        connectionTestedAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      await service.create({
        label: 'snap',
        database: 'mydb',
        engine: 'postgres',
        projectId: 'proj-1',
        connectionId: 'conn-1',
      });

      expect(mockExecFile).toHaveBeenCalledWith(
        'pg_dump',
        expect.any(Array),
        expect.objectContaining({
          env: expect.not.objectContaining({ PGHOST: 'mysql-host' }),
        }),
        expect.any(Function),
      );
    });
  });
});
