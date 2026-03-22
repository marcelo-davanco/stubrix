import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MongodbDriver } from './mongodb.driver';
import type { ConnectionOverrides } from './database-driver.interface';

jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
  execFile: jest.fn(),
  spawn: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(Buffer.alloc(0)),
  createWriteStream: jest.fn(),
  createReadStream: jest.fn(),
  statSync: jest.fn().mockReturnValue({ size: 1024 }),
}));

jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    db: jest.fn().mockReturnValue({
      admin: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue({ ok: 1 }),
        listDatabases: jest.fn().mockResolvedValue({
          databases: [
            { name: 'stubrix' },
            { name: 'testdb' },
            { name: 'admin' },
            { name: 'config' },
            { name: 'local' },
          ],
        }),
      }),
      stats: jest.fn().mockResolvedValue({ dataSize: 1048576 }),
      listCollections: jest.fn().mockReturnValue({
        toArray: jest
          .fn()
          .mockResolvedValue([{ name: 'USERS' }, { name: 'POSTS' }]),
      }),
      command: jest.fn().mockResolvedValue({ size: 512000 }),
      collection: jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([{ _id: '1', name: 'Alice' }]),
          }),
        }),
      }),
    }),
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const child_process = require('child_process') as {
  execFileSync: jest.Mock;
  execFile: jest.Mock;
  spawn: jest.Mock;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  writeFileSync: jest.Mock;
  existsSync: jest.Mock;
  readFileSync: jest.Mock;
  createWriteStream: jest.Mock;
  createReadStream: jest.Mock;
  statSync: jest.Mock;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mongodb = require('mongodb') as { MongoClient: jest.Mock };

class TestableMongodbDriver extends MongodbDriver {
  public exposedBuildUri(
    database?: string,
    overrides?: ConnectionOverrides,
  ): string {
    return this.buildUri(database, overrides);
  }
}

function makeConfig(overrides: Record<string, string | undefined> = {}): {
  get: jest.Mock;
} {
  const defaults: Record<string, string> = {
    MONGO_HOST: 'localhost',
    MONGO_PORT: '27017',
    MONGO_USER: 'stubrix',
    MONGO_PASSWORD: 'stubrix',
    MONGO_DATABASE: 'stubrix',
    MONGO_CONTAINER: 'stubrix-mongodb',
  };
  return {
    get: jest.fn((key: string) =>
      key in overrides ? overrides[key] : defaults[key],
    ),
  };
}

async function makeDriver(
  configOverrides: Record<string, string | undefined> = {},
): Promise<TestableMongodbDriver> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      { provide: MongodbDriver, useClass: TestableMongodbDriver },
      { provide: ConfigService, useValue: makeConfig(configOverrides) },
    ],
  }).compile();
  return module.get<TestableMongodbDriver>(MongodbDriver);
}

describe('MongodbDriver', () => {
  let driver: TestableMongodbDriver;

  beforeEach(async () => {
    jest.clearAllMocks();
    driver = await makeDriver();
  });

  it('should be defined', () => {
    expect(driver).toBeDefined();
  });

  it('should have engine set to mongodb', () => {
    expect(driver.engine).toBe('mongodb');
  });

  describe('isConfigured', () => {
    it('should return true when MONGO_HOST is set', () => {
      expect(driver.isConfigured()).toBe(true);
    });

    it('should return false when MONGO_HOST is not set', async () => {
      const unconfigured = await makeDriver({ MONGO_HOST: undefined });
      expect(unconfigured.isConfigured()).toBe(false);
    });
  });

  describe('buildUri', () => {
    it('should build URI with default credentials', () => {
      const uri = driver.exposedBuildUri();
      expect(uri).toContain('mongodb://');
      expect(uri).toContain('stubrix');
      expect(uri).toContain('localhost:27017');
      expect(uri).toContain('authSource=admin');
    });

    it('should build URI with custom database', () => {
      const uri = driver.exposedBuildUri('customdb');
      expect(uri).toContain('/customdb');
    });

    it('should build URI with connection overrides', () => {
      const overrides: ConnectionOverrides = {
        host: 'remotehost',
        port: '27018',
        username: 'admin',
        password: 'secret',
      };
      const uri = driver.exposedBuildUri('testdb', overrides);
      expect(uri).toContain('remotehost:27018');
      expect(uri).toContain('/testdb');
    });

    it('should URL-encode username and password', () => {
      const overrides: ConnectionOverrides = {
        username: 'user@domain',
        password: 'p@ss:word',
      };
      const uri = driver.exposedBuildUri(undefined, overrides);
      expect(uri).toContain(encodeURIComponent('user@domain'));
      expect(uri).toContain(encodeURIComponent('p@ss:word'));
    });
  });

  describe('healthCheck', () => {
    it('should return true when MongoDB responds to ping', async () => {
      const result = await driver.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when connect throws', async () => {
      mongodb.MongoClient.mockImplementationOnce(() => ({
        connect: jest.fn().mockRejectedValue(new Error('connection refused')),
        close: jest.fn().mockResolvedValue(undefined),
        db: jest.fn(),
      }));
      const result = await driver.healthCheck();
      expect(result).toBe(false);
    });

    it('should return false when not configured', async () => {
      const unconfigured = await makeDriver({ MONGO_HOST: undefined });
      expect(await unconfigured.healthCheck()).toBe(false);
    });
  });

  describe('listDatabases', () => {
    it('should return databases excluding system ones', async () => {
      const result = await driver.listDatabases();
      expect(result).toContain('stubrix');
      expect(result).toContain('testdb');
      expect(result).not.toContain('admin');
      expect(result).not.toContain('config');
      expect(result).not.toContain('local');
    });

    it('should throw when not configured', async () => {
      const unconfigured = await makeDriver({ MONGO_HOST: undefined });
      await expect(unconfigured.listDatabases()).rejects.toThrow(
        'MongoDB driver is not configured',
      );
    });

    it('should pass connection overrides to MongoClient URI', async () => {
      await driver.listDatabases({ host: 'remote', port: '27018' });
      expect(mongodb.MongoClient).toHaveBeenCalledWith(
        expect.stringContaining('remote:27018'),
      );
    });
  });

  describe('getDatabaseInfo', () => {
    it('should return database size and collection list', async () => {
      const result = await driver.getDatabaseInfo('stubrix');
      expect(result.database).toBe('stubrix');
      expect(result.totalSize).toContain('MB');
      expect(result.tables).toHaveLength(2);
      expect(result.tables[0].name).toBe('USERS');
    });

    it('should throw when not configured', async () => {
      const unconfigured = await makeDriver({ MONGO_HOST: undefined });
      await expect(unconfigured.getDatabaseInfo('stubrix')).rejects.toThrow(
        'MongoDB driver is not configured',
      );
    });
  });

  describe('executeQuery', () => {
    it('should execute a find query and return results', async () => {
      const query = JSON.stringify({
        collection: 'USERS',
        filter: { name: 'Alice' },
      });
      const result = await driver.executeQuery(query);
      expect(result).toHaveLength(1);
    });

    it('should throw when query JSON is missing collection field', async () => {
      const query = JSON.stringify({ filter: { name: 'Alice' } });
      await expect(driver.executeQuery(query)).rejects.toThrow(
        'Query must be JSON with a "collection" string field',
      );
    });

    it('should throw when query is not valid JSON', async () => {
      await expect(driver.executeQuery('not-json')).rejects.toThrow();
    });

    it('should throw when not configured', async () => {
      const unconfigured = await makeDriver({ MONGO_HOST: undefined });
      await expect(
        unconfigured.executeQuery(JSON.stringify({ collection: 'test' })),
      ).rejects.toThrow('MongoDB driver is not configured');
    });
  });

  describe('createSnapshot', () => {
    it('should throw error when not configured', async () => {
      const unconfigured = await makeDriver({ MONGO_HOST: undefined });
      await expect(
        unconfigured.createSnapshot('test', '/tmp/snapshot.archive.gz'),
      ).rejects.toThrow('MongoDB driver is not configured');
    });

    it('should use local mongodump when tools are available', async () => {
      child_process.execFileSync.mockReturnValue(Buffer.alloc(0));
      child_process.execFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _opts: unknown,
          cb: (err: null, stdout: string, stderr: string) => void,
        ) => cb(null, '', ''),
      );

      await driver.createSnapshot('testdb', '/tmp/snap.archive.gz');

      const calls = child_process.execFile.mock.calls as [
        string,
        string[],
        unknown,
        unknown,
      ][];
      const dumpCall = calls.find(([cmd]) => cmd === 'mongodump');
      expect(dumpCall).toBeDefined();
      expect(dumpCall![1]).toContain('--gzip');
      expect(dumpCall![1]).toContain('--archive=/tmp/snap.archive.gz');
    });
  });

  describe('restoreSnapshot', () => {
    it('should throw error when not configured', async () => {
      const unconfigured = await makeDriver({ MONGO_HOST: undefined });
      await expect(
        unconfigured.restoreSnapshot('test', '/tmp/snapshot.archive.gz'),
      ).rejects.toThrow('MongoDB driver is not configured');
    });

    it('should pass --drop flag to local mongorestore', async () => {
      child_process.execFileSync.mockReturnValue(Buffer.alloc(0));
      child_process.execFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _opts: unknown,
          cb: (err: null, stdout: string, stderr: string) => void,
        ) => cb(null, '', ''),
      );

      await driver.restoreSnapshot('testdb', '/tmp/snap.archive.gz');

      const calls = child_process.execFile.mock.calls as [
        string,
        string[],
        unknown,
        unknown,
      ][];
      const restoreCall = calls.find(([cmd]) => cmd === 'mongorestore');
      expect(restoreCall).toBeDefined();
      expect(restoreCall![1]).toContain('--drop');
      expect(restoreCall![1]).toContain('--gzip');
    });
  });

  describe('createSnapshot (Docker path)', () => {
    it('should use localhost URI and no --add-host when using docker exec', async () => {
      child_process.execFileSync.mockImplementation(() => {
        throw new Error('not found');
      });

      let finishCb: (() => void) | null = null;
      const mockWriteStream = {
        close: jest.fn(),
        on: jest.fn().mockImplementation((event: string, cb: () => void) => {
          if (event === 'finish') finishCb = cb;
          return mockWriteStream;
        }),
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);

      const mockStdout = { pipe: jest.fn() };
      const mockStderr = {
        on: jest.fn().mockReturnThis(),
      };
      let closeCallback: ((code: number) => void) | null = null;
      const mockChild = {
        stdout: mockStdout,
        stderr: mockStderr,
        on: jest
          .fn()
          .mockImplementation((event: string, cb: (code: number) => void) => {
            if (event === 'close') closeCallback = cb;
          }),
      };
      child_process.spawn.mockReturnValue(mockChild);

      const snapshotPromise = driver.createSnapshot(
        'testdb',
        '/tmp/snap.archive.gz',
      );
      if (closeCallback) (closeCallback as (code: number) => void)(0);
      if (finishCb) (finishCb as () => void)();
      await snapshotPromise;

      const spawnArgs = child_process.spawn.mock.calls[0] as [string, string[]];
      expect(spawnArgs[0]).toBe('docker');
      expect(spawnArgs[1]).toContain('exec');
      expect(spawnArgs[1]).not.toContain('--add-host');
      expect(spawnArgs[1]).not.toContain(
        '--add-host=host.docker.internal:host-gateway',
      );
      const uriArg = spawnArgs[1].find((a: string) => a.startsWith('--uri='));
      expect(uriArg).toBeDefined();
      expect(uriArg).toContain('localhost');
      expect(uriArg).not.toContain('host.docker.internal');
    });

    it('should use localhost even when MONGO_HOST is 127.0.0.1', async () => {
      const driver127 = await makeDriver({ MONGO_HOST: '127.0.0.1' });

      child_process.execFileSync.mockImplementation(() => {
        throw new Error('not found');
      });

      let finishCb2: (() => void) | null = null;
      const mockWriteStream = {
        close: jest.fn(),
        on: jest.fn().mockImplementation((event: string, cb: () => void) => {
          if (event === 'finish') finishCb2 = cb;
          return mockWriteStream;
        }),
      };
      fs.createWriteStream.mockReturnValue(mockWriteStream);

      const mockStdout = { pipe: jest.fn() };
      const mockStderr = { on: jest.fn().mockReturnThis() };
      let closeCb: ((code: number) => void) | null = null;
      const mockChild = {
        stdout: mockStdout,
        stderr: mockStderr,
        on: jest
          .fn()
          .mockImplementation((event: string, cb: (code: number) => void) => {
            if (event === 'close') closeCb = cb;
          }),
      };
      child_process.spawn.mockReturnValue(mockChild);

      const p = driver127.createSnapshot('testdb', '/tmp/snap.archive.gz');
      if (closeCb) (closeCb as (code: number) => void)(0);
      if (finishCb2) (finishCb2 as () => void)();
      await p;

      const spawnArgs = child_process.spawn.mock.calls[0] as [string, string[]];
      const uriArg = spawnArgs[1].find((a: string) => a.startsWith('--uri='));
      expect(uriArg).toContain('localhost');
      expect(uriArg).not.toContain('127.0.0.1');
    });
  });
});
