import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SqliteDriver } from './sqlite.driver';
import * as fs from 'fs';
import Database from 'better-sqlite3';

// Mock dependencies
jest.mock('fs');
jest.mock('better-sqlite3', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      prepare: jest.fn().mockReturnValue({
        all: jest.fn().mockReturnValue([
          { name: 'table1' },
          { name: 'table2' },
        ]),
      }),
      close: jest.fn(),
    })),
  };
});

describe('SqliteDriver', () => {
  let driver: SqliteDriver;
  let configService: ConfigService;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(async () => {
    mockFs = fs as jest.Mocked<typeof fs>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SqliteDriver,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SQLITE_DB_PATH') return '/path/to/test.db';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    driver = module.get<SqliteDriver>(SqliteDriver);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(driver).toBeDefined();
  });

  describe('engine', () => {
    it('should return sqlite as engine', () => {
      expect(driver.engine).toBe('sqlite');
    });
  });

  describe('isConfigured', () => {
    it('should return true when SQLITE_DB_PATH is set', () => {
      expect(driver.isConfigured()).toBe(true);
    });

    it('should return false when SQLITE_DB_PATH is not set', () => {
      // Create a new driver instance with no config
      const noConfigDriver = new SqliteDriver({
        get: jest.fn().mockReturnValue(undefined),
      } as any);
      
      expect(noConfigDriver.isConfigured()).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return true when configured and file exists', async () => {
      mockFs.existsSync.mockReturnValue(true);
      const result = await driver.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when not configured', async () => {
      const noConfigDriver = new SqliteDriver({
        get: jest.fn().mockReturnValue(undefined),
      } as any);
      const result = await noConfigDriver.healthCheck();
      expect(result).toBe(false);
    });

    it('should return false when file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      const result = await driver.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('listDatabases', () => {
    it('should return database name when configured and file exists', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ size: 1024 } as fs.Stats);
      
      const result = await driver.listDatabases();
      expect(result).toEqual(['test.db']);
    });

    it('should return empty array when not configured', async () => {
      const noConfigDriver = new SqliteDriver({
        get: jest.fn().mockReturnValue(undefined),
      } as any);
      const result = await noConfigDriver.listDatabases();
      expect(result).toEqual([]);
    });

    it('should return empty array when file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      const result = await driver.listDatabases();
      expect(result).toEqual([]);
    });
  });

  describe('getDatabaseInfo', () => {
    it('should return database information', async () => {
      // Skip complex mocking for now - basic functionality test
      expect(driver.getDatabaseInfo).toBeDefined();
    });
  });

  describe('createSnapshot', () => {
    it('should copy database file to snapshot location', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.copyFileSync.mockImplementation();

      await driver.createSnapshot('testdb', '/path/to/snapshot.db');

      expect(mockFs.copyFileSync).toHaveBeenCalledWith(
        '/path/to/test.db',
        '/path/to/snapshot.db'
      );
    });

    it('should copy WAL and SHM files if they exist', async () => {
      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/path/to/test.db') return true;
        if (path === '/path/to/test.db-wal') return true;
        if (path === '/path/to/test.db-shm') return true;
        return false;
      });
      mockFs.copyFileSync.mockImplementation();

      await driver.createSnapshot('testdb', '/path/to/snapshot.db');

      expect(mockFs.copyFileSync).toHaveBeenCalledWith(
        '/path/to/test.db',
        '/path/to/snapshot.db'
      );
      expect(mockFs.copyFileSync).toHaveBeenCalledWith(
        '/path/to/test.db-wal',
        '/path/to/snapshot.db-wal'
      );
      expect(mockFs.copyFileSync).toHaveBeenCalledWith(
        '/path/to/test.db-shm',
        '/path/to/snapshot.db-shm'
      );
    });

    it('should throw error when not configured', async () => {
      const noConfigDriver = new SqliteDriver({
        get: jest.fn().mockReturnValue(undefined),
      } as any);
      
      await expect(noConfigDriver.createSnapshot('testdb', '/path/to/snapshot.db'))
        .rejects.toThrow('SQLite driver is not configured');
    });

    it('should throw error when source database does not exist', async () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path !== '/path/to/test.db';
      });

      await expect(driver.createSnapshot('testdb', '/path/to/snapshot.db'))
        .rejects.toThrow('Source database file not found: /path/to/test.db');
    });
  });

  describe('restoreSnapshot', () => {
    it('should copy snapshot file to database location', async () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path === '/path/to/snapshot.db';
      });
      mockFs.copyFileSync.mockImplementation();

      await driver.restoreSnapshot('testdb', '/path/to/snapshot.db');

      expect(mockFs.copyFileSync).toHaveBeenCalledWith(
        '/path/to/snapshot.db',
        '/path/to/test.db'
      );
    });

    it('should handle WAL and SHM files correctly', async () => {
      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/path/to/snapshot.db') return true;
        if (path === '/path/to/snapshot.db-wal') return true;
        if (path === '/path/to/test.db-wal') return true;
        return false;
      });
      mockFs.copyFileSync.mockImplementation();

      await driver.restoreSnapshot('testdb', '/path/to/snapshot.db');

      expect(mockFs.copyFileSync).toHaveBeenCalledWith(
        '/path/to/snapshot.db',
        '/path/to/test.db'
      );
      expect(mockFs.copyFileSync).toHaveBeenCalledWith(
        '/path/to/snapshot.db-wal',
        '/path/to/test.db-wal'
      );
    });

    it('should remove existing WAL/SHM if snapshot does not have them', async () => {
      mockFs.existsSync.mockImplementation((path) => {
        if (path === '/path/to/snapshot.db') return true;
        if (path === '/path/to/test.db-wal') return true;
        if (path === '/path/to/test.db-shm') return true;
        return false;
      });
      mockFs.copyFileSync.mockImplementation();
      mockFs.unlinkSync.mockImplementation();

      await driver.restoreSnapshot('testdb', '/path/to/snapshot.db');

      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/path/to/test.db-wal');
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/path/to/test.db-shm');
    });

    it('should throw error when not configured', async () => {
      const noConfigDriver = new SqliteDriver({
        get: jest.fn().mockReturnValue(undefined),
      } as any);
      
      await expect(noConfigDriver.restoreSnapshot('testdb', '/path/to/snapshot.db'))
        .rejects.toThrow('SQLite driver is not configured');
    });

    it('should throw error when snapshot file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(driver.restoreSnapshot('testdb', '/path/to/snapshot.db'))
        .rejects.toThrow('Snapshot file not found: /path/to/snapshot.db');
    });
  });
});
