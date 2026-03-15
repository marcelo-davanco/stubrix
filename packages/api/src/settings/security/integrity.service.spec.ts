import { Test, TestingModule } from '@nestjs/testing';
import { IntegrityService } from './integrity.service';
import { ConfigDatabaseService } from '../database/config-database.service';
import { existsSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DB_DIR = join(__dirname, '..', '..', '..', 'tmp-test-integrity');
const TEST_DB_PATH = join(TEST_DB_DIR, 'test-integrity.db');

describe('IntegrityService', () => {
  let service: IntegrityService;
  let configDb: ConfigDatabaseService;
  let module: TestingModule;

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

  beforeEach(async () => {
    cleanupTestDb();
    process.env.CONFIG_DB_PATH = TEST_DB_PATH;

    module = await Test.createTestingModule({
      providers: [ConfigDatabaseService, IntegrityService],
    }).compile();

    configDb = module.get<ConfigDatabaseService>(ConfigDatabaseService);
    service = module.get<IntegrityService>(IntegrityService);
    await module.init();
  });

  afterEach(async () => {
    await module.close();
    cleanupTestDb();
    delete process.env.CONFIG_DB_PATH;
  });

  describe('computeChecksum', () => {
    it('should return 64-char hex string for any input', () => {
      const cs = service.computeChecksum('hello');
      expect(cs).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(cs)).toBe(true);
    });

    it('should produce deterministic checksums', () => {
      expect(service.computeChecksum('abc')).toBe(
        service.computeChecksum('abc'),
      );
    });

    it('should produce different checksums for different values', () => {
      expect(service.computeChecksum('a')).not.toBe(
        service.computeChecksum('b'),
      );
    });
  });

  describe('verifyAll — empty database', () => {
    it('should report healthy with no configs', () => {
      const report = service.verifyAll();
      expect(report.healthy).toBe(true);
      expect(report.totalEntries).toBe(0);
      expect(report.corrupted).toHaveLength(0);
      expect(report.missing).toHaveLength(0);
    });
  });

  describe('verifyAll — with data', () => {
    beforeEach(() => {
      configDb.upsertService({
        id: 'svc1',
        name: 'Service 1',
        category: 'mock-engines',
        docker_profile: 'svc1',
        docker_service: 'svc1',
        default_port: 8080,
        external_url: undefined,
        enabled: 0,
        auto_start: 0,
        health_status: 'unknown',
        last_health_check: undefined,
      });
    });

    it('should detect missing checksum', () => {
      configDb.setConfig('svc1', 'port', '8080', { checksum: undefined });
      const report = service.verifyAll();
      expect(report.missing).toHaveLength(1);
      expect(report.missing[0].key).toBe('port');
      expect(report.healthy).toBe(false);
    });

    it('should detect corrupted checksum', () => {
      configDb.setConfig('svc1', 'port', '8080', { checksum: 'bad-checksum' });
      const report = service.verifyAll();
      expect(report.corrupted).toHaveLength(1);
      expect(report.corrupted[0].type).toBe('mismatch');
      expect(report.healthy).toBe(false);
    });

    it('should verify correct checksum as healthy', () => {
      const checksum = service.computeChecksum('8080');
      configDb.setConfig('svc1', 'port', '8080', { checksum });
      const report = service.verifyAll();
      expect(report.verified).toBe(1);
      expect(report.healthy).toBe(true);
    });
  });

  describe('repairChecksums', () => {
    beforeEach(() => {
      configDb.upsertService({
        id: 'svc2',
        name: 'Service 2',
        category: 'databases',
        docker_profile: 'svc2',
        docker_service: 'svc2',
        default_port: 5432,
        external_url: undefined,
        enabled: 0,
        auto_start: 0,
        health_status: 'unknown',
        last_health_check: undefined,
      });
    });

    it('should repair missing and corrupted checksums', () => {
      configDb.setConfig('svc2', 'port', '5432', { checksum: undefined });
      configDb.setConfig('svc2', 'host', 'localhost', { checksum: 'wrong' });

      const repair = service.repairChecksums();
      expect(repair.repaired).toBe(2);

      const report = service.verifyAll();
      expect(report.healthy).toBe(true);
    });

    it('should not re-repair already valid entries', () => {
      const cs = service.computeChecksum('5432');
      configDb.setConfig('svc2', 'port', '5432', { checksum: cs });

      const repair = service.repairChecksums();
      expect(repair.repaired).toBe(0);
    });
  });
});
