import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MongodbDriver } from './mongodb.driver';

describe('MongodbDriver', () => {
  let driver: MongodbDriver;

  beforeEach(async () => {
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
  });
});
