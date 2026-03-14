import { Test, TestingModule } from '@nestjs/testing';
import { existsSync, rmSync, unlinkSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { ExportService } from './export.service';
import type { ExportPayload } from './export.service';
import { ConfigDatabaseService } from '../database/config-database.service';
import { ServiceRegistryService } from '../registry/service-registry.service';
import { CryptoService } from '../crypto/crypto.service';

const TEST_DB_DIR = join(__dirname, '..', '..', '..', 'tmp-test-export');
const TEST_DB_PATH = join(TEST_DB_DIR, 'test-export.db');

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

describe('ExportService', () => {
  let service: ExportService;
  let cryptoService: CryptoService;
  let module: TestingModule;

  beforeEach(async () => {
    cleanupTestDb();
    process.env.CONFIG_DB_PATH = TEST_DB_PATH;
    process.env.CRYPTO_BCRYPT_ROUNDS = '4';

    module = await Test.createTestingModule({
      providers: [
        ConfigDatabaseService,
        ServiceRegistryService,
        CryptoService,
        ExportService,
      ],
    }).compile();

    cryptoService = module.get<CryptoService>(CryptoService);
    service = module.get<ExportService>(ExportService);

    await module.init();
  });

  afterEach(async () => {
    cryptoService.lockSession();
    await module.close();
    cleanupTestDb();
    delete process.env.CONFIG_DB_PATH;
    delete process.env.CRYPTO_BCRYPT_ROUNDS;
  });

  it('should export all services as JSON', async () => {
    const result = await service.exportConfigs({});

    expect(result.content).toBeDefined();
    expect(result.contentType).toBe('application/json');
    expect(result.filename).toMatch(/\.json$/);
    expect(result.servicesExported).toBeGreaterThan(0);

    const parsed = JSON.parse(result.content) as ExportPayload;
    expect(parsed.meta.format).toBe('stubrix-config-export');
    expect(parsed.meta.scope).toBe('full');
    expect(parsed.services).toBeDefined();
  });

  it('should export selected services only', async () => {
    const result = await service.exportConfigs({ serviceIds: ['postgres'] });

    expect(result.servicesExported).toBe(1);
    const parsed = JSON.parse(result.content) as ExportPayload;
    expect(result.servicesExported).toBe(1);
    const keys = Object.keys(parsed.services ?? {});
    expect(keys).toEqual(['postgres']);
    expect(parsed.meta.scope).toBe('partial');
  });

  it('should redact sensitive values by default', async () => {
    const result = await service.exportConfigs({ serviceIds: ['postgres'] });

    const parsed = JSON.parse(result.content) as ExportPayload;
    const pgConfigs = parsed.services?.['postgres']?.configs as Record<
      string,
      unknown
    >;
    expect(result.sensitiveRedacted).toBeGreaterThan(0);
    expect(pgConfigs['PG_PASSWORD']).toBe('[REDACTED]');
  });

  it('should include sensitive values when opted in with active session', async () => {
    await cryptoService.setupMasterPassword('StrongPass1');

    const result = await service.exportConfigs({
      serviceIds: ['postgres'],
      includeSensitive: true,
    });

    const parsed = JSON.parse(result.content) as ExportPayload;
    const pgConfigs = parsed.services?.['postgres']?.configs as Record<
      string,
      unknown
    >;
    expect(pgConfigs['PG_PASSWORD']).not.toBe('[REDACTED]');
    expect(result.sensitiveRedacted).toBe(0);
  });

  it('should export as YAML format', async () => {
    const result = await service.exportConfigs({
      serviceIds: ['postgres'],
      format: 'yaml',
    });

    expect(result.contentType).toBe('application/x-yaml');
    expect(result.filename).toMatch(/\.yaml$/);

    const parsed = yaml.load(result.content) as ExportPayload;
    expect(parsed.meta.format).toBe('stubrix-config-export');
  });

  it('should encrypt export with master password', async () => {
    await cryptoService.setupMasterPassword('StrongPass1');

    const result = await service.exportConfigs({
      serviceIds: ['postgres'],
      encrypted: true,
      masterPassword: 'StrongPass1',
    });

    expect(result.filename).toMatch(/\.enc\.json$/);
    const parsed = JSON.parse(result.content) as ExportPayload;
    expect(parsed.meta.encrypted).toBe(true);
    expect(parsed.payload).toMatch(/^enc:v1:/);
    expect(parsed.services).toBeUndefined();
  });

  it('should include checksum in export', async () => {
    const result = await service.exportConfigs({ serviceIds: ['postgres'] });
    const parsed = JSON.parse(result.content) as ExportPayload;
    expect(parsed.meta.checksum).toMatch(/^sha256:/);
  });

  it('should throw when encrypted without masterPassword', async () => {
    await expect(service.exportConfigs({ encrypted: true })).rejects.toThrow();
  });
});
