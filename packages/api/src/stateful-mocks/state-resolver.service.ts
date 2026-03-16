import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { DriverRegistryService } from '../databases/drivers/driver-registry.service';
import type { StateEngine } from './dto/create-stateful-mock.dto';

export interface StateQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  queryTimeMs: number;
  fromCache: boolean;
}

interface CacheEntry {
  result: StateQueryResult;
  expiresAt: number;
}

@Injectable()
export class StateResolverService {
  private readonly logger = new Logger(StateResolverService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly drivers: DriverRegistryService) {}

  async resolve(params: {
    stateEngine: StateEngine;
    stateDatabase?: string;
    stateQuery: string;
    queryParams?: Record<string, unknown>;
    queryTimeoutMs?: number;
    cacheTtlSeconds?: number;
  }): Promise<StateQueryResult> {
    const {
      stateEngine,
      stateQuery,
      queryParams = {},
      queryTimeoutMs = 5000,
      cacheTtlSeconds = 0,
    } = params;

    const cacheKey = this.buildCacheKey(stateEngine, stateQuery, queryParams);

    if (cacheTtlSeconds > 0) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    const driver = this.drivers.get(stateEngine);
    if (!driver) {
      throw new BadRequestException(
        `Database engine '${stateEngine}' is not available`,
      );
    }

    if (!driver.isConfigured()) {
      throw new ServiceUnavailableException(
        `Database engine '${stateEngine}' is not configured`,
      );
    }

    const sanitized = this.sanitizeQuery(stateQuery);
    const start = Date.now();

    try {
      if (!driver.executeQuery) {
        throw new BadRequestException(
          `Database engine '${stateEngine}' does not support query execution`,
        );
      }

      const rows = await this.executeWithTimeout(
        driver.executeQuery(sanitized, queryParams),
        queryTimeoutMs,
        stateEngine,
      );

      const result: StateQueryResult = {
        rows,
        rowCount: rows.length,
        queryTimeMs: Date.now() - start,
        fromCache: false,
      };

      if (cacheTtlSeconds > 0) {
        this.setCache(cacheKey, result, cacheTtlSeconds);
      }

      return result;
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      this.logger.error(`State query failed on '${stateEngine}'`, err);
      throw new ServiceUnavailableException(
        `Failed to resolve state from '${stateEngine}': ${(err as Error).message}`,
      );
    }
  }

  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) this.cache.delete(key);
    }
  }

  private sanitizeQuery(query: string): string {
    const trimmed = query.trim();
    const upper = trimmed.toUpperCase();
    const forbidden = [
      'DROP ',
      'TRUNCATE ',
      'DELETE ',
      'INSERT ',
      'UPDATE ',
      'ALTER ',
      'CREATE ',
    ];
    for (const kw of forbidden) {
      if (upper.includes(kw)) {
        throw new BadRequestException(
          `Write operations are not allowed in state queries. Found: ${kw.trim()}`,
        );
      }
    }
    return trimmed;
  }

  private buildCacheKey(
    engine: string,
    query: string,
    params: Record<string, unknown>,
  ): string {
    return createHash('sha256')
      .update(`${engine}:${query}:${JSON.stringify(params)}`)
      .digest('hex');
  }

  private getFromCache(key: string): StateQueryResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return { ...entry.result, fromCache: true };
  }

  private setCache(
    key: string,
    result: StateQueryResult,
    ttlSeconds: number,
  ): void {
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    engine: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new ServiceUnavailableException(
            `State query timed out after ${timeoutMs}ms on engine '${engine}'`,
          ),
        );
      }, timeoutMs);

      promise
        .then((v) => {
          clearTimeout(timer);
          resolve(v);
        })
        .catch((e) => {
          clearTimeout(timer);
          reject(e);
        });
    });
  }
}
