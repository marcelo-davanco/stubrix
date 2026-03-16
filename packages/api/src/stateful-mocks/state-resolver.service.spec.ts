import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { StateResolverService } from './state-resolver.service';
import { DriverRegistryService } from '../databases/drivers/driver-registry.service';
import type { DatabaseDriverInterface } from '../databases/drivers/database-driver.interface';

const makeDriver = (
  overrides: Partial<DatabaseDriverInterface> = {},
): DatabaseDriverInterface => ({
  engine: 'postgres',
  isConfigured: jest.fn().mockReturnValue(true),
  healthCheck: jest.fn().mockResolvedValue(true),
  listDatabases: jest.fn().mockResolvedValue([]),
  getDatabaseInfo: jest.fn().mockResolvedValue({}),
  executeQuery: jest.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]),
  ...overrides,
});

describe('StateResolverService', () => {
  let service: StateResolverService;
  let drivers: DeepMocked<DriverRegistryService>;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        StateResolverService,
        {
          provide: DriverRegistryService,
          useValue: createMock<DriverRegistryService>(),
        },
      ],
    }).compile();

    service = module.get<StateResolverService>(StateResolverService);
    drivers = module.get<DeepMocked<DriverRegistryService>>(
      DriverRegistryService,
    );
  });

  afterEach(async () => {
    service.invalidateCache();
    await module.close();
  });

  // ─── resolve() ───────────────────────────────────────────────

  describe('resolve()', () => {
    it('should execute query and return result with rows', async () => {
      drivers.get.mockReturnValue(makeDriver());

      const result = await service.resolve({
        stateEngine: 'postgres',
        stateQuery: 'SELECT * FROM users',
      });

      expect(result.rows).toEqual([{ id: 1, name: 'Alice' }]);
      expect(result.rowCount).toBe(1);
      expect(result.fromCache).toBe(false);
      expect(result.queryTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw BadRequestException when driver is not registered', async () => {
      drivers.get.mockReturnValue(undefined);

      await expect(
        service.resolve({
          stateEngine: 'sqlite',
          stateQuery: 'SELECT 1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ServiceUnavailableException when driver is not configured', async () => {
      drivers.get.mockReturnValue(
        makeDriver({ isConfigured: jest.fn().mockReturnValue(false) }),
      );

      await expect(
        service.resolve({ stateEngine: 'postgres', stateQuery: 'SELECT 1' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw BadRequestException when driver has no executeQuery method', async () => {
      drivers.get.mockReturnValue(makeDriver({ executeQuery: undefined }));

      await expect(
        service.resolve({ stateEngine: 'postgres', stateQuery: 'SELECT 1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should wrap unexpected driver errors in ServiceUnavailableException', async () => {
      drivers.get.mockReturnValue(
        makeDriver({
          executeQuery: jest
            .fn()
            .mockRejectedValue(new Error('DB connection lost')),
        }),
      );

      await expect(
        service.resolve({ stateEngine: 'postgres', stateQuery: 'SELECT 1' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should re-throw BadRequestException from executeQuery as-is', async () => {
      drivers.get.mockReturnValue(
        makeDriver({
          executeQuery: jest
            .fn()
            .mockRejectedValue(new BadRequestException('Invalid query')),
        }),
      );

      await expect(
        service.resolve({ stateEngine: 'postgres', stateQuery: 'SELECT 1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should re-throw ServiceUnavailableException from executeQuery as-is', async () => {
      drivers.get.mockReturnValue(
        makeDriver({
          executeQuery: jest
            .fn()
            .mockRejectedValue(
              new ServiceUnavailableException('DB overloaded'),
            ),
        }),
      );

      await expect(
        service.resolve({ stateEngine: 'postgres', stateQuery: 'SELECT 1' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  // ─── caching ─────────────────────────────────────────────────

  describe('resolve() — caching', () => {
    it('should return cached result on second call with same params and ttl > 0', async () => {
      const executeQuery = jest.fn().mockResolvedValue([{ id: 1 }]);
      drivers.get.mockReturnValue(makeDriver({ executeQuery }));

      await service.resolve({
        stateEngine: 'postgres',
        stateQuery: 'SELECT * FROM users',
        cacheTtlSeconds: 60,
      });

      const cached = await service.resolve({
        stateEngine: 'postgres',
        stateQuery: 'SELECT * FROM users',
        cacheTtlSeconds: 60,
      });

      expect(executeQuery).toHaveBeenCalledTimes(1);
      expect(cached.fromCache).toBe(true);
    });

    it('should NOT use cache when cacheTtlSeconds is 0', async () => {
      const executeQuery = jest.fn().mockResolvedValue([]);
      drivers.get.mockReturnValue(makeDriver({ executeQuery }));

      await service.resolve({
        stateEngine: 'postgres',
        stateQuery: 'SELECT 1',
        cacheTtlSeconds: 0,
      });
      await service.resolve({
        stateEngine: 'postgres',
        stateQuery: 'SELECT 1',
        cacheTtlSeconds: 0,
      });

      expect(executeQuery).toHaveBeenCalledTimes(2);
    });

    it('should return fresh result after cache TTL expires', async () => {
      jest.useFakeTimers();
      const executeQuery = jest.fn().mockResolvedValue([{ id: 1 }]);
      drivers.get.mockReturnValue(makeDriver({ executeQuery }));

      await service.resolve({
        stateEngine: 'postgres',
        stateQuery: 'SELECT * FROM users',
        cacheTtlSeconds: 1,
      });

      jest.advanceTimersByTime(2000);

      await service.resolve({
        stateEngine: 'postgres',
        stateQuery: 'SELECT * FROM users',
        cacheTtlSeconds: 1,
      });

      expect(executeQuery).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('should differentiate cache keys by query params', async () => {
      const executeQuery = jest.fn().mockResolvedValue([]);
      drivers.get.mockReturnValue(makeDriver({ executeQuery }));

      await service.resolve({
        stateEngine: 'postgres',
        stateQuery: 'SELECT * FROM users WHERE id = :id',
        queryParams: { id: 1 },
        cacheTtlSeconds: 60,
      });
      await service.resolve({
        stateEngine: 'postgres',
        stateQuery: 'SELECT * FROM users WHERE id = :id',
        queryParams: { id: 2 },
        cacheTtlSeconds: 60,
      });

      expect(executeQuery).toHaveBeenCalledTimes(2);
    });
  });

  // ─── invalidateCache() ───────────────────────────────────────

  describe('invalidateCache()', () => {
    it('should clear all cache entries when called without pattern', async () => {
      const executeQuery = jest.fn().mockResolvedValue([]);
      drivers.get.mockReturnValue(makeDriver({ executeQuery }));

      await service.resolve({
        stateEngine: 'postgres',
        stateQuery: 'SELECT 1',
        cacheTtlSeconds: 60,
      });
      service.invalidateCache();
      await service.resolve({
        stateEngine: 'postgres',
        stateQuery: 'SELECT 1',
        cacheTtlSeconds: 60,
      });

      expect(executeQuery).toHaveBeenCalledTimes(2);
    });

    it('should not clear entries when pattern does not match any hash key', async () => {
      // Cache keys are SHA-256 hex digests. Plain-text words ("postgres") cannot
      // appear as substrings of a hex string (hex is [0-9a-f] only, and
      // "postgres" contains 'p', 'g', 's' which are not hex digits).
      // Therefore the cache is untouched and the second call still hits cache.
      const executeQuery = jest.fn().mockResolvedValue([]);
      drivers.get.mockReturnValue(makeDriver({ executeQuery }));

      await service.resolve({
        stateEngine: 'postgres',
        stateQuery: 'SELECT 1',
        cacheTtlSeconds: 60,
      });

      service.invalidateCache('postgres');

      await service.resolve({
        stateEngine: 'postgres',
        stateQuery: 'SELECT 1',
        cacheTtlSeconds: 60,
      });

      // Pattern never matches the hex key → cache not cleared → only 1 real call
      expect(executeQuery).toHaveBeenCalledTimes(1);
    });
  });

  // ─── sanitizeQuery() — tested via resolve() ──────────────────

  describe('sanitizeQuery() — forbidden write operations', () => {
    const forbidden = [
      'DROP TABLE users',
      'TRUNCATE users',
      'DELETE FROM users',
      'INSERT INTO users VALUES (1)',
      'UPDATE users SET x=1',
      'ALTER TABLE users ADD COLUMN y INT',
      'CREATE TABLE x (id INT)',
    ];

    it.each(forbidden)(
      'should throw BadRequestException for: %s',
      async (query) => {
        drivers.get.mockReturnValue(makeDriver());

        await expect(
          service.resolve({ stateEngine: 'postgres', stateQuery: query }),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('should allow valid SELECT queries through sanitization', async () => {
      const executeQuery = jest.fn().mockResolvedValue([]);
      drivers.get.mockReturnValue(makeDriver({ executeQuery }));

      await expect(
        service.resolve({
          stateEngine: 'postgres',
          stateQuery: 'SELECT id, name FROM users WHERE active = true',
        }),
      ).resolves.not.toThrow();
    });

    it('should trim whitespace from query before execution', async () => {
      const executeQuery = jest.fn().mockResolvedValue([]);
      drivers.get.mockReturnValue(makeDriver({ executeQuery }));

      await service.resolve({
        stateEngine: 'postgres',
        stateQuery: '   SELECT 1   ',
      });

      expect(executeQuery).toHaveBeenCalledWith('SELECT 1', {});
    });
  });

  // ─── executeWithTimeout() — via resolve() ────────────────────

  describe('executeWithTimeout() — query timeout', () => {
    it('should throw ServiceUnavailableException when query exceeds timeout', async () => {
      const neverResolves = new Promise<Record<string, unknown>[]>(() => {
        // intentionally never resolves
      });
      drivers.get.mockReturnValue(
        makeDriver({ executeQuery: jest.fn().mockReturnValue(neverResolves) }),
      );

      await expect(
        service.resolve({
          stateEngine: 'postgres',
          stateQuery: 'SELECT 1',
          queryTimeoutMs: 10,
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    }, 500);

    it('should include engine name in timeout error message', async () => {
      const neverResolves = new Promise<Record<string, unknown>[]>(() => {});
      drivers.get.mockReturnValue(
        makeDriver({ executeQuery: jest.fn().mockReturnValue(neverResolves) }),
      );

      await expect(
        service.resolve({
          stateEngine: 'postgres',
          stateQuery: 'SELECT 1',
          queryTimeoutMs: 10,
        }),
      ).rejects.toThrow('postgres');
    }, 500);
  });
});
