import { Test, TestingModule } from '@nestjs/testing';
import { ServiceRegistryService } from './service-registry.service';
import { ConfigDatabaseService } from '../database/config-database.service';
import { SERVICE_DEFINITIONS } from './service-definitions';
import { existsSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DB_DIR = join(__dirname, '..', '..', '..', 'tmp-test-registry');
const TEST_DB_PATH = join(TEST_DB_DIR, 'test-registry.db');

describe('ServiceRegistryService', () => {
  let registry: ServiceRegistryService;
  let configDb: ConfigDatabaseService;
  let module: TestingModule;

  beforeEach(async () => {
    cleanupTestDb();
    process.env.CONFIG_DB_PATH = TEST_DB_PATH;

    module = await Test.createTestingModule({
      providers: [ConfigDatabaseService, ServiceRegistryService],
    }).compile();

    configDb = module.get<ConfigDatabaseService>(ConfigDatabaseService);
    registry = module.get<ServiceRegistryService>(ServiceRegistryService);
    await module.init();
  });

  afterEach(async () => {
    await module.close();
    cleanupTestDb();
    delete process.env.CONFIG_DB_PATH;
  });

  function cleanupTestDb() {
    try {
      if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
      if (existsSync(TEST_DB_PATH + '-wal')) unlinkSync(TEST_DB_PATH + '-wal');
      if (existsSync(TEST_DB_PATH + '-shm')) unlinkSync(TEST_DB_PATH + '-shm');
      if (existsSync(TEST_DB_DIR)) rmSync(TEST_DB_DIR, { recursive: true });
    } catch {
      // ignore cleanup errors
    }
  }

  // ─── Seeding ──────────────────────────────────────────────────

  it('should seed all 24 services on first init', () => {
    const services = registry.getAllServices();
    expect(services).toHaveLength(SERVICE_DEFINITIONS.length);
    expect(services.length).toBe(24);
  });

  it('should seed all services as disabled with unknown health', () => {
    const services = registry.getAllServices();
    for (const svc of services) {
      expect(svc.enabled).toBe(false);
      expect(svc.healthStatus).toBe('unknown');
    }
  });

  it('should seed default config values for each service', () => {
    const pgConfigs = configDb.getServiceConfigs('postgres');
    expect(pgConfigs.length).toBeGreaterThan(0);

    const pgHost = configDb.getConfig('postgres', 'PG_HOST');
    expect(pgHost).toBeDefined();
    expect(pgHost!.value).toBe('db-postgres');
  });

  it('should not overwrite existing configs on re-seed', () => {
    // Modify a config value
    configDb.setConfig('postgres', 'PG_HOST', 'custom-host', {
      data_type: 'string',
    });

    // Re-init (simulates restart)
    registry.onModuleInit();

    const pgHost = configDb.getConfig('postgres', 'PG_HOST');
    expect(pgHost!.value).toBe('custom-host');
  });

  it('should add new config fields on re-seed without overwriting existing', () => {
    const initialConfigs = configDb.getServiceConfigs('postgres');
    const initialCount = initialConfigs.length;

    // Re-init should not duplicate
    registry.onModuleInit();

    const afterConfigs = configDb.getServiceConfigs('postgres');
    expect(afterConfigs.length).toBe(initialCount);
  });

  // ─── Query ────────────────────────────────────────────────────

  it('should return services grouped by category', () => {
    const mockEngines = registry.getServicesByCategory('mock-engines');
    expect(mockEngines.length).toBe(4);
    expect(mockEngines.every((s) => s.category === 'mock-engines')).toBe(true);
  });

  it('should return all 14 categories with service counts', () => {
    const categories = registry.getCategories();
    expect(categories.length).toBe(14);

    const mockEnginesCat = categories.find(
      (c) => c.category === 'mock-engines',
    );
    expect(mockEnginesCat).toBeDefined();
    expect(mockEnginesCat!.label).toBe('Mock Engines');
    expect(mockEnginesCat!.count).toBe(4);
  });

  it('should get a single service by id', () => {
    const svc = registry.getService('wiremock');
    expect(svc.id).toBe('wiremock');
    expect(svc.name).toBe('WireMock');
    expect(svc.category).toBe('mock-engines');
    expect(svc.dockerProfile).toBe('wiremock');
  });

  it('should throw for unknown service id', () => {
    expect(() => registry.getService('nonexistent')).toThrow();
  });

  // ─── Dependencies ─────────────────────────────────────────────

  it('should resolve dependency chain (pact-broker → postgres)', () => {
    const deps = registry.getDependencies('pact-broker');
    expect(deps).toContain('postgres');
  });

  it('should find dependents (postgres ← pact-broker, hoppscotch, adminer)', () => {
    const dependents = registry.getDependents('postgres');
    expect(dependents).toContain('pact-broker');
    expect(dependents).toContain('hoppscotch');
    expect(dependents).toContain('adminer');
  });

  it('should allow disabling postgres when no dependents are enabled', () => {
    const result = registry.canDisable('postgres');
    expect(result.allowed).toBe(true);
    expect(result.blockedBy).toHaveLength(0);
  });

  it('should prevent disabling postgres when pact-broker is enabled', () => {
    configDb.updateServiceStatus('pact-broker', true);

    const result = registry.canDisable('postgres');
    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toContain('pact-broker');
  });

  it('should resolve grafana → prometheus dependency', () => {
    const deps = registry.getDependencies('grafana');
    expect(deps).toContain('prometheus');
  });

  it('should resolve openrag → chromadb dependency', () => {
    const deps = registry.getDependencies('openrag');
    expect(deps).toContain('chromadb');
  });

  it('should resolve redpanda-console → redpanda dependency', () => {
    const deps = registry.getDependencies('redpanda-console');
    expect(deps).toContain('redpanda');
  });

  // ─── Config Schema ────────────────────────────────────────────

  it('should return config schema for a service', () => {
    const schema = registry.getConfigSchema('postgres');
    expect(schema.length).toBeGreaterThan(0);

    const portField = schema.find((f) => f.key === 'PG_PORT');
    expect(portField).toBeDefined();
    expect(portField!.dataType).toBe('number');
    expect(portField!.validation?.min).toBe(1);
    expect(portField!.validation?.max).toBe(65535);
  });

  it('should return default config values', () => {
    const defaults = registry.getDefaultConfig('postgres');
    expect(defaults['PG_HOST']).toBe('db-postgres');
    expect(defaults['PG_PORT']).toBe(5432);
    expect(defaults['PG_USER']).toBe('postgres');
  });

  it('should mark sensitive fields correctly', () => {
    const schema = registry.getConfigSchema('postgres');
    const passwordField = schema.find((f) => f.key === 'PG_PASSWORD');
    expect(passwordField).toBeDefined();
    expect(passwordField!.sensitive).toBe(true);

    const hostField = schema.find((f) => f.key === 'PG_HOST');
    expect(hostField!.sensitive).toBeFalsy();
  });

  // ─── Validation ───────────────────────────────────────────────

  it('should validate config values against schema', () => {
    const result = registry.validateConfig('postgres', {
      PG_HOST: 'localhost',
      PG_PORT: 5432,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid port numbers (too low)', () => {
    const result = registry.validateConfig('postgres', {
      PG_PORT: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'PG_PORT')).toBe(true);
  });

  it('should reject invalid port numbers (too high)', () => {
    const result = registry.validateConfig('postgres', {
      PG_PORT: 70000,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'PG_PORT')).toBe(true);
  });

  it('should reject non-numeric values for number fields', () => {
    const result = registry.validateConfig('postgres', {
      PG_PORT: 'not-a-number',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'PG_PORT')).toBe(true);
  });

  it('should return empty schema for unknown service', () => {
    const schema = registry.getConfigSchema('nonexistent');
    expect(schema).toHaveLength(0);
  });
});
