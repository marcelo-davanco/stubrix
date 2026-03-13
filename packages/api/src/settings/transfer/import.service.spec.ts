import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { existsSync, rmSync, unlinkSync } from 'fs';
import { join } from 'path';
import { ImportService } from './import.service';
import { ExportService } from './export.service';
import { BackupService } from '../backup/backup.service';
import { ConfigDatabaseService } from '../database/config-database.service';
import { ServiceRegistryService } from '../registry/service-registry.service';
import { CryptoService } from '../crypto/crypto.service';

const TEST_DB_DIR = join(__dirname, '..', '..', '..', 'tmp-test-import');
const TEST_DB_PATH = join(TEST_DB_DIR, 'test-import.db');
const TEST_BACKUP_DIR = join(TEST_DB_DIR, 'backups');

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

describe('ImportService', () => {
  let importService: ImportService;
  let exportService: ExportService;
  let configDb: ConfigDatabaseService;
  let cryptoService: CryptoService;
  let module: TestingModule;

  beforeEach(async () => {
    cleanupTestDb();
    process.env.CONFIG_DB_PATH = TEST_DB_PATH;
    process.env.BACKUP_DIR = TEST_BACKUP_DIR;
    process.env.CRYPTO_BCRYPT_ROUNDS = '4';

    module = await Test.createTestingModule({
      providers: [
        ConfigDatabaseService,
        ServiceRegistryService,
        CryptoService,
        BackupService,
        ExportService,
        ImportService,
      ],
    }).compile();

    configDb = module.get<ConfigDatabaseService>(ConfigDatabaseService);
    cryptoService = module.get<CryptoService>(CryptoService);
    exportService = module.get<ExportService>(ExportService);
    importService = module.get<ImportService>(ImportService);

    await module.init();
  });

  afterEach(async () => {
    cryptoService.lockSession();
    await module.close();
    cleanupTestDb();
    delete process.env.CONFIG_DB_PATH;
    delete process.env.BACKUP_DIR;
    delete process.env.CRYPTO_BCRYPT_ROUNDS;
  });

  // ─── parseImportFile ─────────────────────────────────────────

  it('should parse valid JSON import file', async () => {
    const exported = await exportService.exportConfigs({
      serviceIds: ['postgres'],
    });
    const parsed = await importService.parseImportFile(exported.content);

    expect(parsed.meta.format).toBe('stubrix-config-export');
    expect(parsed.services['postgres']).toBeDefined();
    expect(parsed.validationErrors).toHaveLength(0);
  });

  it('should parse valid YAML import file', async () => {
    const exported = await exportService.exportConfigs({
      serviceIds: ['postgres'],
      format: 'yaml',
    });
    const parsed = await importService.parseImportFile(exported.content);

    expect(parsed.meta.format).toBe('stubrix-config-export');
    expect(parsed.services['postgres']).toBeDefined();
  });

  it('should reject incompatible format', async () => {
    const badContent = JSON.stringify({
      meta: { format: 'unknown-format', version: '1.0.0', encrypted: false },
      services: {},
    });

    await expect(importService.parseImportFile(badContent)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should flag unknown service as warning', async () => {
    const content = JSON.stringify({
      meta: {
        format: 'stubrix-config-export',
        version: '1.0.0',
        encrypted: false,
        checksum: '',
      },
      services: {
        'non-existent-service': {
          name: 'Ghost',
          category: 'unknown',
          enabled: false,
          configs: { KEY: { value: 'val', dataType: 'string' } },
        },
      },
    });

    const parsed = await importService.parseImportFile(content);
    expect(
      parsed.warnings.some((w) => w.includes('non-existent-service')),
    ).toBe(true);
  });

  // ─── previewImport ────────────────────────────────────────────

  it('should preview changes correctly', async () => {
    const exported = await exportService.exportConfigs({
      serviceIds: ['postgres'],
    });
    const parsed = await importService.parseImportFile(exported.content);

    // Modify current state after export
    configDb.setConfig('postgres', 'PG_PORT', '9999', { data_type: 'number' });

    const preview = importService.previewImport(parsed, {
      conflictStrategy: 'overwrite',
    });

    const pgSvc = preview.services.find((s) => s.serviceId === 'postgres');
    expect(pgSvc).toBeDefined();
    const portChange = pgSvc!.changes.find((c) => c.key === 'PG_PORT');
    expect(portChange).toBeDefined();
    expect(portChange!.action).toBe('update');
  });

  it('should skip redacted values in preview', async () => {
    const exported = await exportService.exportConfigs({
      serviceIds: ['postgres'],
      includeSensitive: false,
    });
    const parsed = await importService.parseImportFile(exported.content);
    const preview = importService.previewImport(parsed, {
      conflictStrategy: 'overwrite',
    });

    const pgSvc = preview.services.find((s) => s.serviceId === 'postgres');
    const passwordChange = pgSvc?.changes.find((c) => c.key === 'PG_PASSWORD');
    expect(passwordChange?.action).toBe('skip');
    expect(passwordChange?.reason).toMatch(/redacted/i);
  });

  // ─── applyImport — overwrite ──────────────────────────────────

  it('should apply with overwrite strategy', async () => {
    const exported = await exportService.exportConfigs({
      serviceIds: ['postgres'],
    });

    // Modify after export
    configDb.setConfig('postgres', 'PG_PORT', '7777', { data_type: 'number' });

    const parsed = await importService.parseImportFile(exported.content);
    const result = await importService.applyImport(parsed, {
      conflictStrategy: 'overwrite',
      createAutoBackup: false,
    });

    expect(result.configsUpdated).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);

    const row = configDb.getConfig('postgres', 'PG_PORT');
    expect(row?.value).not.toBe('7777');
  });

  it('should skip existing values with skip strategy', async () => {
    const exported = await exportService.exportConfigs({
      serviceIds: ['postgres'],
    });
    const parsed = await importService.parseImportFile(exported.content);

    const result = await importService.applyImport(parsed, {
      conflictStrategy: 'skip',
      createAutoBackup: false,
    });

    // All configs exist, so all should be skipped
    expect(result.configsSkipped).toBeGreaterThan(0);
    expect(result.configsUpdated).toBe(0);
  });

  it('should create auto-backup before import', async () => {
    const exported = await exportService.exportConfigs({
      serviceIds: ['postgres'],
    });
    const parsed = await importService.parseImportFile(exported.content);

    const result = await importService.applyImport(parsed, {
      conflictStrategy: 'overwrite',
      createAutoBackup: true,
    });

    expect(result.autoBackupId).toBeDefined();
  });

  it('should track all changes in config_history with source import', async () => {
    const exported = await exportService.exportConfigs({
      serviceIds: ['postgres'],
    });
    // Change a value before re-importing
    configDb.setConfig('postgres', 'PG_PORT', '5555', { data_type: 'number' });

    const parsed = await importService.parseImportFile(exported.content);
    await importService.applyImport(parsed, {
      conflictStrategy: 'overwrite',
      createAutoBackup: false,
    });

    const history = configDb.getHistory('postgres', 10);
    const importEntry = history.find(
      (h) => h.source === 'import' && h.key === 'PG_PORT',
    );
    expect(importEntry).toBeDefined();
  });

  it('should handle unknown services gracefully', async () => {
    const content = JSON.stringify({
      meta: {
        format: 'stubrix-config-export',
        version: '1.0.0',
        encrypted: false,
        checksum: '',
      },
      services: {
        'ghost-service': {
          name: 'Ghost',
          category: 'unknown',
          enabled: false,
          configs: { KEY: { value: 'val', dataType: 'string' } },
        },
      },
    });

    const parsed = await importService.parseImportFile(content);
    const result = await importService.applyImport(parsed, {
      conflictStrategy: 'overwrite',
      createAutoBackup: false,
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].serviceId).toBe('ghost-service');
  });

  // ─── Encrypted import ─────────────────────────────────────────

  it('should decrypt encrypted export and import correctly', async () => {
    await cryptoService.setupMasterPassword('StrongPass1');

    const exported = await exportService.exportConfigs({
      serviceIds: ['postgres'],
      encrypted: true,
      includeSensitive: true,
      masterPassword: 'StrongPass1',
    });

    cryptoService.lockSession();

    const parsed = await importService.parseImportFile(
      exported.content,
      'StrongPass1',
    );

    expect(parsed.services['postgres']).toBeDefined();
    expect(parsed.validationErrors).toHaveLength(0);
  });

  it('should reject incorrect password for encrypted import', async () => {
    await cryptoService.setupMasterPassword('StrongPass1');

    const exported = await exportService.exportConfigs({
      serviceIds: ['postgres'],
      encrypted: true,
      masterPassword: 'StrongPass1',
    });

    cryptoService.lockSession();

    await expect(
      importService.parseImportFile(exported.content, 'WrongPass99'),
    ).rejects.toThrow(BadRequestException);
  });
});
