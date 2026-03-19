/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MongodbDriver } from './mongodb.driver';

jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
  spawnSync: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(Buffer.alloc(0)),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const child_process = require('child_process') as {
  execFileSync: jest.Mock;
  spawnSync: jest.Mock;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  writeFileSync: jest.Mock;
  existsSync: jest.Mock;
  readFileSync: jest.Mock;
};

describe('MongodbDriver', () => {
  let driver: MongodbDriver;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongodbDriver,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                MONGO_HOST: 'localhost',
                MONGO_PORT: '27017',
                MONGO_USER: 'stubrix',
                MONGO_PASSWORD: 'stubrix',
                MONGO_DATABASE: 'stubrix',
                MONGO_CONTAINER: 'stubrix-mongodb',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    driver = module.get<MongodbDriver>(MongodbDriver);
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
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MongodbDriver,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'MONGO_HOST') return undefined;
                return 'stubrix';
              }),
            },
          },
        ],
      }).compile();

      const unconfiguredDriver = module.get<MongodbDriver>(MongodbDriver);
      expect(unconfiguredDriver.isConfigured()).toBe(false);
    });
  });

  describe('buildUri', () => {
    it('should build URI with default credentials', () => {
      const uri = (driver as any).buildUri();
      expect(uri).toContain('mongodb://');
      expect(uri).toContain('stubrix');
      expect(uri).toContain('localhost:27017');
      expect(uri).toContain('authSource=admin');
    });

    it('should build URI with custom database', () => {
      const uri = (driver as any).buildUri('customdb');
      expect(uri).toContain('/customdb');
    });

    it('should build URI with connection overrides', () => {
      const overrides = {
        host: 'remotehost',
        port: '27018',
        username: 'admin',
        password: 'secret',
      };
      const uri = (driver as any).buildUri('testdb', overrides);
      expect(uri).toContain('remotehost:27018');
      expect(uri).toContain('admin');
      expect(uri).toContain('/testdb');
    });

    it('should URL-encode username and password', () => {
      const overrides = {
        username: 'user@domain',
        password: 'p@ss:word',
      };
      const uri = (driver as any).buildUri(undefined, overrides);
      expect(uri).toContain(encodeURIComponent('user@domain'));
      expect(uri).toContain(encodeURIComponent('p@ss:word'));
    });
  });

  describe('createSnapshot', () => {
    it('should throw error when not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MongodbDriver,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const unconfiguredDriver = module.get<MongodbDriver>(MongodbDriver);
      await expect(
        unconfiguredDriver.createSnapshot('test', '/tmp/snapshot.archive.gz'),
      ).rejects.toThrow('MongoDB driver is not configured');
    });
  });

  describe('restoreSnapshot', () => {
    it('should throw error when not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MongodbDriver,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const unconfiguredDriver = module.get<MongodbDriver>(MongodbDriver);
      await expect(
        unconfiguredDriver.restoreSnapshot('test', '/tmp/snapshot.archive.gz'),
      ).rejects.toThrow('MongoDB driver is not configured');
    });

    it('should pass maxBuffer to local mongorestore', async () => {
      // hasMongodumpLocal returns true (execFileSync does not throw for --version)
      child_process.execFileSync.mockImplementation(() => Buffer.alloc(0));

      await driver.restoreSnapshot('testdb', '/tmp/snap.archive.gz');

      const restoreCall = child_process.execFileSync.mock.calls.find(
        (call: string[]) => call[0] === 'mongorestore',
      ) as [string, string[], Record<string, unknown>] | undefined;
      expect(restoreCall).toBeDefined();
      expect(restoreCall![2]).toEqual(
        expect.objectContaining({ maxBuffer: 512 * 1024 * 1024 }),
      );
    });
  });

  describe('createSnapshot (Docker path)', () => {
    it('should replace 127.0.0.1 in URI when using Docker exec', async () => {
      const module127: TestingModule = await Test.createTestingModule({
        providers: [
          MongodbDriver,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                const config: Record<string, string> = {
                  MONGO_HOST: '127.0.0.1',
                  MONGO_PORT: '27017',
                  MONGO_USER: 'stubrix',
                  MONGO_PASSWORD: 'stubrix',
                  MONGO_DATABASE: 'stubrix',
                  MONGO_CONTAINER: 'stubrix-mongodb',
                };
                return config[key];
              }),
            },
          },
        ],
      }).compile();

      const driver127 = module127.get<MongodbDriver>(MongodbDriver);

      // hasMongodumpLocal returns false (execFileSync throws for --version)
      child_process.execFileSync.mockImplementation(() => {
        throw new Error('not found');
      });

      child_process.spawnSync.mockReturnValue({
        stdout: Buffer.from('archive-data'),
        stderr: Buffer.alloc(0),
        status: 0,
        signal: null,
        pid: 0,
        output: [],
        error: undefined,
      });

      await driver127.createSnapshot('testdb', '/tmp/snap.archive.gz');

      const dockerCall = child_process.spawnSync.mock.calls[0] as [
        string,
        string[],
      ];
      const uriArg = dockerCall[1].find((a: string) => a.startsWith('--uri='));
      expect(uriArg).toBeDefined();
      expect(uriArg).toContain('host.docker.internal');
      expect(uriArg).not.toContain('127.0.0.1');
    });

    it('should warn instead of throw when mongodump produces empty stdout', async () => {
      // hasMongodumpLocal returns false
      child_process.execFileSync.mockImplementation(() => {
        throw new Error('not found');
      });

      child_process.spawnSync.mockReturnValue({
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
        status: 0,
        signal: null,
        pid: 0,
        output: [],
        error: undefined,
      });

      // Should NOT throw
      await expect(
        driver.createSnapshot('emptydb', '/tmp/empty.archive.gz'),
      ).resolves.not.toThrow();

      // Verify writeFileSync was still called
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/tmp/empty.archive.gz',
        expect.anything(),
      );
    });
  });
});
