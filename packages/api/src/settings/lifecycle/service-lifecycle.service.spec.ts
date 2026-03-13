/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceLifecycleService } from './service-lifecycle.service';
import { ServiceRegistryService } from '../registry/service-registry.service';
import { ConfigDatabaseService } from '../database/config-database.service';
import { DockerComposeService } from './docker-compose.service';
import { HealthCheckService } from './health-check.service';
import type { DockerResult } from './docker-compose.service';
import type { HealthCheckResult } from './health-check.service';
import { existsSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DB_DIR = join(__dirname, '..', '..', '..', 'tmp-test-lifecycle');
const TEST_DB_PATH = join(TEST_DB_DIR, 'test-lifecycle.db');

const makeDockerResult = (success: boolean, stderr = ''): DockerResult => ({
  success,
  stdout: '',
  stderr,
  exitCode: success ? 0 : 1,
});

const makeHealthResult = (
  serviceId: string,
  status: HealthCheckResult['status'],
): HealthCheckResult => ({
  serviceId,
  status,
  checkedAt: new Date().toISOString(),
});

describe('ServiceLifecycleService', () => {
  let service: ServiceLifecycleService;
  let configDb: ConfigDatabaseService;
  let registry: ServiceRegistryService;
  let docker: jest.Mocked<DockerComposeService>;
  let health: jest.Mocked<HealthCheckService>;
  let module: TestingModule;

  beforeEach(async () => {
    cleanupTestDb();
    process.env.CONFIG_DB_PATH = TEST_DB_PATH;

    const dockerMock: Partial<jest.Mocked<DockerComposeService>> = {
      startProfile: jest.fn().mockResolvedValue(makeDockerResult(true)),
      stopProfile: jest.fn().mockResolvedValue(makeDockerResult(true)),
      restartService: jest.fn().mockResolvedValue(makeDockerResult(true)),
      getRunningContainers: jest.fn().mockResolvedValue([]),
      getContainerStatus: jest.fn().mockResolvedValue('unknown'),
      getContainerLogs: jest.fn().mockResolvedValue(''),
      isContainerHealthy: jest.fn().mockResolvedValue(true),
    };

    const healthMock: Partial<jest.Mocked<HealthCheckService>> = {
      checkHealth: jest
        .fn()
        .mockResolvedValue(makeHealthResult('unknown', 'healthy')),
      checkAllEnabled: jest.fn().mockResolvedValue(new Map()),
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        ConfigDatabaseService,
        ServiceRegistryService,
        { provide: DockerComposeService, useValue: dockerMock },
        { provide: HealthCheckService, useValue: healthMock },
        ServiceLifecycleService,
      ],
    }).compile();

    configDb = module.get<ConfigDatabaseService>(ConfigDatabaseService);
    registry = module.get<ServiceRegistryService>(ServiceRegistryService);
    docker = module.get(DockerComposeService);
    health = module.get(HealthCheckService);
    service = module.get<ServiceLifecycleService>(ServiceLifecycleService);

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
      // ignore
    }
  }

  // ─── Enable ───────────────────────────────────────────────────

  it('should enable a service with no dependencies', async () => {
    health.checkHealth.mockResolvedValue(
      makeHealthResult('wiremock', 'healthy'),
    );

    const result = await service.enableService('wiremock');

    const startProfile = docker.startProfile;
    expect(result.success).toBe(true);
    expect(result.action).toBe('enable');
    expect(result.healthStatus).toBe('healthy');
    expect(startProfile).toHaveBeenCalledWith('wiremock');

    const row = configDb.getService('wiremock');
    expect(row!.enabled).toBe(1);
  });

  it('should return error when enabling already-enabled service', async () => {
    configDb.updateServiceStatus('wiremock', true);

    const result = await service.enableService('wiremock');

    const startProfile = docker.startProfile;
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/already enabled/i);
    expect(startProfile).not.toHaveBeenCalled();
  });

  it('should return error for unknown service', async () => {
    const result = await service.enableService('nonexistent');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not found/i);
  });

  it('should auto-enable dependencies when enabling pact-broker', async () => {
    health.checkHealth.mockResolvedValue(makeHealthResult('any', 'healthy'));

    const result = await service.enableService('pact-broker', {
      enableDependencies: true,
    });

    expect(result.success).toBe(true);
    expect(result.affectedServices).toContain('postgres');

    const pgRow = configDb.getService('postgres');
    expect(pgRow!.enabled).toBe(1);

    const pactRow = configDb.getService('pact-broker');
    expect(pactRow!.enabled).toBe(1);
  });

  it('should not auto-enable dependencies when enableDependencies=false', async () => {
    health.checkHealth.mockResolvedValue(
      makeHealthResult('pact-broker', 'healthy'),
    );

    const result = await service.enableService('pact-broker', {
      enableDependencies: false,
    });

    expect(result.success).toBe(true);
    expect(result.affectedServices).toBeUndefined();

    const pgRow = configDb.getService('postgres');
    expect(pgRow!.enabled).toBe(0);
  });

  it('should return error when Docker start fails', async () => {
    docker.startProfile.mockResolvedValue(
      makeDockerResult(false, 'daemon not running'),
    );

    const result = await service.enableService('wiremock');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/docker start failed/i);

    const row = configDb.getService('wiremock');
    expect(row!.enabled).toBe(0);
  });

  it('should skip health check when skipHealthCheck=true', async () => {
    const result = await service.enableService('wiremock', {
      skipHealthCheck: true,
    });

    const checkHealth = health.checkHealth;
    expect(result.success).toBe(true);
    expect(checkHealth).not.toHaveBeenCalled();
  });

  // ─── Disable ──────────────────────────────────────────────────

  it('should disable a service with no enabled dependents', async () => {
    configDb.updateServiceStatus('postgres', true);

    const result = await service.disableService('postgres');

    expect(result.success).toBe(true);
    expect(result.action).toBe('disable');
    expect(docker.stopProfile).toHaveBeenCalledWith('postgres');

    const row = configDb.getService('postgres');
    expect(row!.enabled).toBe(0);
  });

  it('should return error when disabling already-disabled service', async () => {
    const result = await service.disableService('postgres');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not enabled/i);
  });

  it('should block disabling postgres when pact-broker is enabled', async () => {
    configDb.updateServiceStatus('postgres', true);
    configDb.updateServiceStatus('pact-broker', true);

    const result = await service.disableService('postgres');

    const stopProfile = docker.stopProfile;
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/pact-broker/);
    expect(stopProfile).not.toHaveBeenCalled();
  });

  it('should force-disable with dependents when force=true', async () => {
    configDb.updateServiceStatus('postgres', true);
    configDb.updateServiceStatus('pact-broker', true);

    const result = await service.disableService('postgres', { force: true });

    expect(result.success).toBe(true);
    const row = configDb.getService('postgres');
    expect(row!.enabled).toBe(0);
  });

  it('should cascade disable dependents when disableDependents=true', async () => {
    configDb.updateServiceStatus('postgres', true);
    configDb.updateServiceStatus('pact-broker', true);

    const result = await service.disableService('postgres', {
      disableDependents: true,
    });

    expect(result.success).toBe(true);
    expect(result.affectedServices).toContain('pact-broker');

    const pactRow = configDb.getService('pact-broker');
    expect(pactRow!.enabled).toBe(0);

    const pgRow = configDb.getService('postgres');
    expect(pgRow!.enabled).toBe(0);
  });

  // ─── Restart ──────────────────────────────────────────────────

  it('should restart a running service', async () => {
    configDb.updateServiceStatus('wiremock', true);
    health.checkHealth.mockResolvedValue(
      makeHealthResult('wiremock', 'healthy'),
    );

    const result = await service.restartService('wiremock');

    const restartService = docker.restartService;
    expect(result.success).toBe(true);
    expect(result.action).toBe('restart');
    expect(restartService).toHaveBeenCalledWith('wiremock');
    expect(result.healthStatus).toBe('healthy');
  });

  it('should return error when restarting unknown service', async () => {
    const result = await service.restartService('nonexistent');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not found/i);
  });

  it('should handle Docker restart failure gracefully', async () => {
    configDb.updateServiceStatus('wiremock', true);
    docker.restartService.mockResolvedValue(
      makeDockerResult(false, 'container not running'),
    );

    const result = await service.restartService('wiremock');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/docker restart failed/i);
  });

  // ─── Status ───────────────────────────────────────────────────

  it('should return status for all services', async () => {
    const statuses = await service.getAllStatuses();
    expect(statuses).toHaveLength(24);
    expect(statuses.every((s) => s.serviceId)).toBe(true);
  });

  it('should return correct enabled state in status', async () => {
    configDb.updateServiceStatus('postgres', true);

    const status = await service.getServiceStatus('postgres');
    expect(status.enabled).toBe(true);
    expect(status.serviceId).toBe('postgres');
    expect(status.name).toMatch(/PostgreSQL/i);
  });

  it('should reflect container running status when Docker returns containers', async () => {
    configDb.updateServiceStatus('postgres', true);
    docker.getRunningContainers.mockResolvedValue([
      {
        name: 'stubrix-postgres',
        service: 'db-postgres',
        status: 'running',
        ports: ['5442:5432'],
        uptime: '2 hours ago',
      },
    ]);

    const status = await service.getServiceStatus('postgres');
    expect(status.containerStatus).toBe('running');
    expect(status.ports).toContain('5442:5432');
  });

  // ─── Health monitoring ────────────────────────────────────────

  it('should update health status on periodic check result', async () => {
    configDb.updateServiceStatus('wiremock', true);
    health.checkHealth.mockResolvedValue(
      makeHealthResult('wiremock', 'unhealthy'),
    );

    // Simulate what the monitoring cycle does
    const result = await health.checkHealth('wiremock');
    configDb.updateHealthStatus('wiremock', result.status);

    const row = configDb.getService('wiremock');
    expect(row!.health_status).toBe('unhealthy');
  });

  it('should use registry to validate unknown services in enable flow', async () => {
    const getServiceSpy = jest.spyOn(registry, 'getService');

    await service.enableService('wiremock', { skipHealthCheck: true });

    expect(getServiceSpy).toHaveBeenCalledWith('wiremock');
  });
});
