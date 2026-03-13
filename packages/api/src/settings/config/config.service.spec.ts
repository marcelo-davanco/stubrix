import { createHash } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SettingsConfigService } from './config.service';
import { ConfigDatabaseService } from '../database/config-database.service';
import { ServiceRegistryService } from '../registry/service-registry.service';
import { existsSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DB_DIR = join(__dirname, '..', '..', '..', 'tmp-test-config-svc');
const TEST_DB_PATH = join(TEST_DB_DIR, 'test-config.db');

function cleanupTestDb() {
  try {
    if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
    if (existsSync(TEST_DB_PATH + '-wal')) unlinkSync(TEST_DB_PATH + '-wal');
    if (existsSync(TEST_DB_PATH + '-shm')) unlinkSync(TEST_DB_PATH + '-shm');
    if (existsSync(TEST_DB_DIR)) rmSync(TEST_DB_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

describe('SettingsConfigService', () => {
  let service: SettingsConfigService;
  let configDb: ConfigDatabaseService;
  let module: TestingModule;

  beforeEach(async () => {
    cleanupTestDb();
    process.env.CONFIG_DB_PATH = TEST_DB_PATH;

    module = await Test.createTestingModule({
      providers: [
        ConfigDatabaseService,
        ServiceRegistryService,
        SettingsConfigService,
      ],
    }).compile();

    configDb = module.get<ConfigDatabaseService>(ConfigDatabaseService);
    service = module.get<SettingsConfigService>(SettingsConfigService);

    await module.init();
  });

  afterEach(async () => {
    await module.close();
    cleanupTestDb();
    delete process.env.CONFIG_DB_PATH;
  });

  // ─── getServiceConfig ─────────────────────────────────────────

  it('should return all configs for a service', () => {
    const result = service.getServiceConfig('postgres');

    expect(result.serviceId).toBe('postgres');
    expect(result.serviceName).toMatch(/PostgreSQL/i);
    expect(result.schema.length).toBeGreaterThan(0);
    expect(result.configs.length).toBeGreaterThan(0);
  });

  it('should mask sensitive values in response', () => {
    // Mark a config as sensitive
    configDb.setConfig('postgres', 'PG_PASSWORD', 'secret123', {
      is_sensitive: 1,
      data_type: 'string',
    });

    const result = service.getServiceConfig('postgres');
    const sensitiveEntry = result.configs.find((c) => c.key === 'PG_PASSWORD');

    expect(sensitiveEntry).toBeDefined();
    expect(sensitiveEntry!.isSensitive).toBe(true);
    expect(sensitiveEntry!.maskedValue).toBe('••••••••');
    expect(sensitiveEntry!.value).toBe('');
  });

  it('should return schema fields for service', () => {
    const result = service.getServiceConfig('postgres');
    expect(result.schema.length).toBeGreaterThan(0);
    expect(result.schema[0]).toHaveProperty('key');
    expect(result.schema[0]).toHaveProperty('label');
  });

  // ─── getEffectiveConfig ───────────────────────────────────────

  it('should return database value as source when set', () => {
    configDb.setConfig('postgres', 'PG_PORT', '5555', {
      is_sensitive: 0,
      data_type: 'number',
    });

    const result = service.getEffectiveConfig('postgres');
    const portEntry = result.configs.find((c) => c.key === 'PG_PORT');

    expect(portEntry).toBeDefined();
    expect(portEntry!.source).toBe('database');
    expect(portEntry!.value).toBe('5555');
  });

  it('should show env var override in effective config', () => {
    process.env['POSTGRES_PG_PORT'] = '9999';

    try {
      const result = service.getEffectiveConfig('postgres');
      const portEntry = result.configs.find((c) => c.key === 'PG_PORT');

      expect(portEntry).toBeDefined();
      expect(portEntry!.source).toBe('env');
      expect(portEntry!.value).toBe('9999');
      expect(portEntry!.envValue).toBe('9999');
      expect(result.overrideCount).toBeGreaterThanOrEqual(0);
    } finally {
      delete process.env['POSTGRES_PG_PORT'];
    }
  });

  it('should return default source when no db or env value', () => {
    // Delete the seeded value so source falls back to default
    configDb.deleteConfig('postgres', 'PG_PORT');

    const result = service.getEffectiveConfig('postgres');
    const portEntry = result.configs.find((c) => c.key === 'PG_PORT');

    expect(portEntry).toBeDefined();
    expect(portEntry!.source).toBe('default');
    expect(portEntry!.defaultValue).toBeDefined();
  });

  // ─── updateConfig ─────────────────────────────────────────────

  it('should update config and track in history', () => {
    const result = service.updateConfig('postgres', [
      { key: 'PG_PORT', value: '5433' },
    ]);

    expect(result.serviceId).toBe('postgres');
    expect(result.updated).toBe(1);
    expect(result.changes[0].key).toBe('PG_PORT');
    expect(result.changes[0].newValue).toBe('5433');

    const row = configDb.getConfig('postgres', 'PG_PORT');
    expect(row!.value).toBe('5433');

    const history = configDb.getHistory('postgres', 5);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].new_value).toBe('5433');
  });

  it('should reject unknown config key', () => {
    expect(() =>
      service.updateConfig('postgres', [
        { key: 'NONEXISTENT_KEY', value: 'foo' },
      ]),
    ).toThrow(BadRequestException);
  });

  it('should reject invalid port number (out of range)', () => {
    expect(() =>
      service.updateConfig('postgres', [{ key: 'PG_PORT', value: '99999' }]),
    ).toThrow(BadRequestException);
  });

  it('should compute checksum on update', () => {
    service.updateConfig('postgres', [{ key: 'PG_PORT', value: '5434' }]);

    const row = configDb.getConfig('postgres', 'PG_PORT');
    expect(row!.checksum).toBeDefined();
    expect(row!.checksum).toHaveLength(64); // SHA-256 hex
  });

  it('should track old value in history on update', () => {
    service.updateConfig('postgres', [{ key: 'PG_PORT', value: '5000' }]);
    service.updateConfig('postgres', [{ key: 'PG_PORT', value: '5001' }]);

    const history = configDb.getHistory('postgres', 10);
    const updateEntry = history.find(
      (h) => h.new_value === '5001' && h.key === 'PG_PORT',
    );
    expect(updateEntry!.old_value).toBe('5000');
  });

  // ─── resetConfig ─────────────────────────────────────────────

  it('should reset single key to default', () => {
    service.updateConfig('postgres', [{ key: 'PG_PORT', value: '9999' }]);

    const result = service.resetConfig('postgres', ['PG_PORT']);

    expect(result.serviceId).toBe('postgres');
    expect(result.reset).toBe(1);
    expect(result.keys).toContain('PG_PORT');

    const history = configDb.getHistory('postgres', 20);
    const resetEntry = history.find(
      (h) => h.action === 'reset' && h.key === 'PG_PORT',
    );
    expect(resetEntry).toBeDefined();
  });

  it('should reset all keys to defaults', () => {
    service.updateConfig('postgres', [{ key: 'PG_PORT', value: '8888' }]);

    const result = service.resetConfig('postgres');

    expect(result.reset).toBeGreaterThan(0);

    const row = configDb.getConfig('postgres', 'PG_PORT');
    expect(row!.value).not.toBe('8888');
  });

  // ─── getConfigHistory ─────────────────────────────────────────

  it('should paginate history results', () => {
    for (let i = 0; i < 5; i++) {
      service.updateConfig('postgres', [
        { key: 'PG_PORT', value: String(5400 + i) },
      ]);
    }

    const page1 = service.getConfigHistory('postgres', 2, 0);
    const page2 = service.getConfigHistory('postgres', 2, 2);

    expect(page1.entries.length).toBe(2);
    expect(page2.entries.length).toBe(2);
    expect(page1.entries[0].new_value).not.toBe(page2.entries[0].new_value);
    expect(page1.total).toBeGreaterThanOrEqual(5);
  });

  // ─── rollbackConfig ───────────────────────────────────────────

  it('should rollback to previous value', () => {
    service.updateConfig('postgres', [{ key: 'PG_PORT', value: '5100' }]);
    service.updateConfig('postgres', [{ key: 'PG_PORT', value: '5200' }]);

    interface HistoryRow {
      id?: number;
      key: string;
      old_value?: string;
      new_value?: string;
    }
    const history = configDb.getHistory('postgres', 10) as HistoryRow[];
    const entry = history.find(
      (h) => h.new_value === '5200' && h.key === 'PG_PORT',
    );
    expect(entry?.id).toBeDefined();

    const result = service.rollbackConfig('postgres', entry!.id!);

    expect(result.serviceId).toBe('postgres');
    expect(result.key).toBe('PG_PORT');
    expect(result.rolledBackTo).toBe('5100');

    const row = configDb.getConfig('postgres', 'PG_PORT');
    expect(row!.value).toBe('5100');

    const rollbackHistory = configDb.getHistory('postgres', 20);
    const rollbackEntry = rollbackHistory.find(
      (h) => h.action === 'rollback' && h.key === 'PG_PORT',
    );
    expect(rollbackEntry).toBeDefined();
  });

  it('should throw on rollback with unknown historyId', () => {
    expect(() => service.rollbackConfig('postgres', 99999)).toThrow(
      BadRequestException,
    );
  });

  // ─── checksum integrity ───────────────────────────────────────

  it('should compute and verify checksums', () => {
    service.updateConfig('postgres', [{ key: 'PG_PORT', value: '5440' }]);

    const row = configDb.getConfig('postgres', 'PG_PORT');
    const expected = createHash('sha256').update('5440').digest('hex');
    expect(row!.checksum).toBe(expected);
  });

  // ─── bulk update ─────────────────────────────────────────────

  it('should handle bulk updates', () => {
    const result = service.updateConfig('postgres', [
      { key: 'PG_PORT', value: '5450' },
      { key: 'PG_DATABASE', value: 'mydb' },
    ]);

    expect(result.updated).toBe(2);
    expect(result.changes).toHaveLength(2);
  });

  it('should reject bulk update if any key is invalid', () => {
    expect(() =>
      service.updateConfig('postgres', [
        { key: 'PG_PORT', value: '5460' },
        { key: 'INVALID_KEY', value: 'bad' },
      ]),
    ).toThrow(BadRequestException);

    const row = configDb.getConfig('postgres', 'PG_PORT');
    expect(row?.value).not.toBe('5460');
  });
});
