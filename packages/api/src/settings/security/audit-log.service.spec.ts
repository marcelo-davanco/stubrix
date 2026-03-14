import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { ConfigDatabaseService } from '../database/config-database.service';
import { existsSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DB_DIR = join(__dirname, '..', '..', '..', 'tmp-test-audit');
const TEST_DB_PATH = join(TEST_DB_DIR, 'test-audit.db');

describe('AuditLogService', () => {
  let service: AuditLogService;
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

  function seedService(id: string) {
    configDb.upsertService({
      id,
      name: `Service ${id}`,
      category: 'mock-engines',
      docker_profile: id,
      docker_service: id,
      default_port: 8080,
      external_url: undefined,
      enabled: 0,
      health_status: 'unknown',
      last_health_check: undefined,
    });
  }

  beforeEach(async () => {
    cleanupTestDb();
    process.env.CONFIG_DB_PATH = TEST_DB_PATH;

    module = await Test.createTestingModule({
      providers: [ConfigDatabaseService, AuditLogService],
    }).compile();

    configDb = module.get<ConfigDatabaseService>(ConfigDatabaseService);
    service = module.get<AuditLogService>(AuditLogService);
    await module.init();
  });

  afterEach(async () => {
    await module.close();
    cleanupTestDb();
    delete process.env.CONFIG_DB_PATH;
  });

  describe('getAuditLog', () => {
    it('should return empty log for new database', () => {
      const result = service.getAuditLog();
      expect(result.entries).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return history entries with service name', () => {
      seedService('svc1');
      configDb.addHistory({
        service_id: 'svc1',
        key: 'port',
        old_value: '8080',
        new_value: '9090',
        action: 'UPDATE',
        source: 'manual',
      });

      const result = service.getAuditLog();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].serviceName).toBe('Service svc1');
      expect(result.entries[0].action).toBe('UPDATE');
    });

    it('should mask sensitive values in keys containing "password"', () => {
      seedService('svc2');
      configDb.addHistory({
        service_id: 'svc2',
        key: 'admin_password',
        old_value: 'old-secret',
        new_value: 'new-secret',
        action: 'UPDATE',
        source: 'manual',
      });

      const result = service.getAuditLog();
      expect(result.entries[0].oldValue).toBe('•••');
      expect(result.entries[0].newValue).toBe('•••');
    });

    it('should not mask non-sensitive values', () => {
      seedService('svc3');
      configDb.addHistory({
        service_id: 'svc3',
        key: 'port',
        old_value: '8080',
        new_value: '9090',
        action: 'UPDATE',
        source: 'manual',
      });

      const result = service.getAuditLog();
      expect(result.entries[0].oldValue).toBe('8080');
      expect(result.entries[0].newValue).toBe('9090');
    });

    it('should filter by serviceId', () => {
      seedService('alpha');
      seedService('beta');
      configDb.addHistory({
        service_id: 'alpha',
        key: 'x',
        old_value: undefined,
        new_value: '1',
        action: 'SET',
        source: 'manual',
      });
      configDb.addHistory({
        service_id: 'beta',
        key: 'y',
        old_value: undefined,
        new_value: '2',
        action: 'SET',
        source: 'manual',
      });

      const result = service.getAuditLog({ serviceId: 'alpha' });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].serviceId).toBe('alpha');
    });

    it('should filter by action', () => {
      seedService('svc4');
      configDb.addHistory({
        service_id: 'svc4',
        key: 'a',
        old_value: undefined,
        new_value: '1',
        action: 'SET',
        source: 'manual',
      });
      configDb.addHistory({
        service_id: 'svc4',
        key: 'b',
        old_value: '1',
        new_value: undefined,
        action: 'DELETE',
        source: 'manual',
      });

      const result = service.getAuditLog({ action: 'DELETE' });
      expect(result.entries.every((e) => e.action === 'DELETE')).toBe(true);
    });

    it('should support pagination', () => {
      seedService('svc5');
      for (let i = 0; i < 10; i++) {
        configDb.addHistory({
          service_id: 'svc5',
          key: `key${i}`,
          old_value: undefined,
          new_value: String(i),
          action: 'SET',
          source: 'manual',
        });
      }

      const page1 = service.getAuditLog({ limit: 3, offset: 0 });
      const page2 = service.getAuditLog({ limit: 3, offset: 3 });
      expect(page1.entries).toHaveLength(3);
      expect(page2.entries).toHaveLength(3);
      expect(page1.entries[0].key).not.toBe(page2.entries[0].key);
    });
  });

  describe('getAuditStats', () => {
    it('should return zero stats for empty database', () => {
      const stats = service.getAuditStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.actionBreakdown).toEqual({});
    });

    it('should count actions correctly', () => {
      seedService('s1');
      configDb.addHistory({
        service_id: 's1',
        key: 'a',
        old_value: undefined,
        new_value: '1',
        action: 'SET',
        source: 'manual',
      });
      configDb.addHistory({
        service_id: 's1',
        key: 'b',
        old_value: undefined,
        new_value: '2',
        action: 'SET',
        source: 'manual',
      });
      configDb.addHistory({
        service_id: 's1',
        key: 'c',
        old_value: '1',
        new_value: undefined,
        action: 'DELETE',
        source: 'manual',
      });

      const stats = service.getAuditStats();
      expect(stats.totalEntries).toBe(3);
      expect(stats.actionBreakdown['SET']).toBe(2);
      expect(stats.actionBreakdown['DELETE']).toBe(1);
    });
  });
});
