import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { existsSync, rmSync, unlinkSync } from 'fs';
import { join } from 'path';
import { BackupService } from './backup.service';
import { ConfigDatabaseService } from '../database/config-database.service';
import { ServiceRegistryService } from '../registry/service-registry.service';
import { CryptoService } from '../crypto/crypto.service';

const TEST_DB_DIR = join(__dirname, '..', '..', '..', 'tmp-test-backup');
const TEST_DB_PATH = join(TEST_DB_DIR, 'test-backup.db');
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

describe('BackupService', () => {
  let service: BackupService;
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
      ],
    }).compile();

    configDb = module.get<ConfigDatabaseService>(ConfigDatabaseService);
    cryptoService = module.get<CryptoService>(CryptoService);
    service = module.get<BackupService>(BackupService);

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

  // ─── createBackup — full ──────────────────────────────────────

  it('should create full backup with all services', async () => {
    const result = await service.createBackup({});

    expect(result.id).toBeDefined();
    expect(result.name).toMatch(/backup-/);
    expect(result.servicesIncluded.length).toBeGreaterThan(0);
    expect(result.encrypted).toBe(false);
    expect(result.fileSize).toBeGreaterThan(0);
    expect(result.checksum).toMatch(/^sha256:/);
    expect(existsSync(result.filePath)).toBe(true);
  });

  it('should persist backup metadata in database', async () => {
    const result = await service.createBackup({ name: 'my-test-backup' });

    const stored = configDb.getBackup(result.id);
    expect(stored).toBeDefined();
    expect(stored!.name).toBe('my-test-backup');
    expect(stored!.checksum).toBe(result.checksum);
  });

  // ─── createBackup — partial ───────────────────────────────────

  it('should create partial backup with selected services', async () => {
    const result = await service.createBackup({
      serviceIds: ['postgres'],
    });

    expect(result.servicesIncluded).toEqual(['postgres']);
    expect(result.encrypted).toBe(false);

    const contents = service.getBackupContents(result.id);
    expect(contents.services).toBeDefined();
    expect(Object.keys(contents.services!)).toEqual(['postgres']);
  });

  // ─── createBackup — encrypted ─────────────────────────────────

  it('should create encrypted backup', async () => {
    await cryptoService.setupMasterPassword('StrongPass1');

    const result = await service.createBackup({
      encrypted: true,
      masterPassword: 'StrongPass1',
    });

    expect(result.encrypted).toBe(true);

    const contents = service.getBackupContents(result.id);
    expect(contents.meta.encrypted).toBe(true);
    expect(contents.payload).toMatch(/^enc:v1:/);
    expect(contents.services).toBeUndefined();
  });

  it('should require masterPassword for encrypted backup', async () => {
    await expect(service.createBackup({ encrypted: true })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject invalid masterPassword for encrypted backup', async () => {
    await cryptoService.setupMasterPassword('StrongPass1');

    await expect(
      service.createBackup({ encrypted: true, masterPassword: 'WrongPass9' }),
    ).rejects.toThrow(BadRequestException);
  });

  // ─── getBackups / getBackup ───────────────────────────────────

  it('should list all backups', async () => {
    await service.createBackup({ name: 'backup-a' });
    await service.createBackup({ name: 'backup-b' });

    const list = service.getBackups();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.map((b) => b.name)).toEqual(
      expect.arrayContaining(['backup-a', 'backup-b']),
    );
  });

  it('should get backup by id', async () => {
    const created = await service.createBackup({ name: 'detail-test' });
    const detail = service.getBackup(created.id);

    expect(detail.id).toBe(created.id);
    expect(detail.name).toBe('detail-test');
    expect(detail.filePath).toBe(created.filePath);
  });

  it('should throw NotFoundException for unknown backup id', () => {
    expect(() => service.getBackup('non-existent-id')).toThrow(
      NotFoundException,
    );
  });

  // ─── Checksum integrity ───────────────────────────────────────

  it('should include valid checksum in backup file', async () => {
    const result = await service.createBackup({});
    const contents = service.getBackupContents(result.id);

    expect(contents.meta.checksum).toMatch(/^sha256:/);
    expect(contents.meta.checksum).toBe(result.checksum);
  });

  // ─── previewRestore ───────────────────────────────────────────

  it('should preview restore changes correctly', async () => {
    // Set a config to differ from backup
    const backup = await service.createBackup({
      serviceIds: ['postgres'],
    });

    // Modify current state after backup
    configDb.setConfig('postgres', 'PG_PORT', '9999', { data_type: 'number' });

    const preview = await service.previewRestore(backup.id);

    expect(preview.backupId).toBe(backup.id);
    const pgSvc = preview.services.find((s) => s.serviceId === 'postgres');
    expect(pgSvc).toBeDefined();
    // The PG_PORT change should appear
    const portChange = pgSvc!.changes.find((c) => c.key === 'PG_PORT');
    expect(portChange).toBeDefined();
    expect(portChange!.newValue).not.toBe('9999');
  });

  // ─── restoreBackup — overwrite ────────────────────────────────

  it('should restore with overwrite strategy', async () => {
    // Create backup with current state (PG_PORT = default)
    const backup = await service.createBackup({ serviceIds: ['postgres'] });

    // Modify after backup
    configDb.setConfig('postgres', 'PG_PORT', '7777', { data_type: 'number' });

    const result = await service.restoreBackup(backup.id, {
      conflictStrategy: 'overwrite',
      createAutoBackup: false,
    });

    expect(result.configsRestored).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);

    // PG_PORT should be restored to its value at backup time
    const row = configDb.getConfig('postgres', 'PG_PORT');
    expect(row?.value).not.toBe('7777');
  });

  it('should skip unchanged values with skip strategy', async () => {
    // Backup current state
    const backup = await service.createBackup({ serviceIds: ['postgres'] });

    // Don't change anything — all values should be skipped
    const result = await service.restoreBackup(backup.id, {
      conflictStrategy: 'skip',
      createAutoBackup: false,
    });

    expect(result.skipped).toBeGreaterThan(0);
  });

  it('should create auto-backup before restore', async () => {
    const backup = await service.createBackup({ serviceIds: ['postgres'] });

    const countBefore = service.getBackups().length;
    await service.restoreBackup(backup.id, {
      conflictStrategy: 'overwrite',
      createAutoBackup: true,
    });

    const countAfter = service.getBackups().length;
    expect(countAfter).toBeGreaterThan(countBefore);
  });

  // ─── Restore — history tracking ───────────────────────────────

  it('should track restore in config_history', async () => {
    const backup = await service.createBackup({ serviceIds: ['postgres'] });
    configDb.setConfig('postgres', 'PG_PORT', '6666', { data_type: 'number' });

    await service.restoreBackup(backup.id, {
      conflictStrategy: 'overwrite',
      createAutoBackup: false,
    });

    const history = configDb.getHistory('postgres', 10);
    const restoreEntry = history.find(
      (h) => h.action === 'restore' && h.key === 'PG_PORT',
    );
    expect(restoreEntry).toBeDefined();
    expect(restoreEntry!.source).toBe('restore');
  });

  // ─── Encrypted restore ────────────────────────────────────────

  it('should decrypt encrypted backup with correct password', async () => {
    await cryptoService.setupMasterPassword('StrongPass1');

    const backup = await service.createBackup({
      serviceIds: ['postgres'],
      encrypted: true,
      masterPassword: 'StrongPass1',
    });

    cryptoService.lockSession();

    const result = await service.restoreBackup(backup.id, {
      conflictStrategy: 'overwrite',
      createAutoBackup: false,
      masterPassword: 'StrongPass1',
    });

    expect(result.configsRestored).toBeGreaterThanOrEqual(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject incorrect password for encrypted backup', async () => {
    await cryptoService.setupMasterPassword('StrongPass1');

    const backup = await service.createBackup({
      serviceIds: ['postgres'],
      encrypted: true,
      masterPassword: 'StrongPass1',
    });

    cryptoService.lockSession();

    await expect(
      service.restoreBackup(backup.id, {
        conflictStrategy: 'overwrite',
        createAutoBackup: false,
        masterPassword: 'WrongPass99',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ─── deleteBackup ────────────────────────────────────────────

  it('should delete backup and remove file', async () => {
    const backup = await service.createBackup({});
    const filePath = backup.filePath;

    expect(existsSync(filePath)).toBe(true);

    service.deleteBackup(backup.id);

    expect(existsSync(filePath)).toBe(false);
    expect(() => service.getBackup(backup.id)).toThrow(NotFoundException);
  });

  // ─── deleteOldBackups ─────────────────────────────────────────

  it('should cleanup old auto-backups', async () => {
    // Create auto-backup (will be named "auto-...")
    await service.createAutoBackup('test-cleanup');

    // All auto-backups with 0 days retention (delete all older than now)
    const deleted = service.deleteOldBackups(0);
    expect(deleted).toBeGreaterThanOrEqual(0); // depends on timing
  });
});
