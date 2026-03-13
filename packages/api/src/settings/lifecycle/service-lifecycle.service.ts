import { Injectable, Logger } from '@nestjs/common';
import type { HealthStatus, ServiceCategory } from '@stubrix/shared';
import { ConfigDatabaseService } from '../database/config-database.service';
import { ServiceRegistryService } from '../registry/service-registry.service';
import { DockerComposeService } from './docker-compose.service';
import { HealthCheckService } from './health-check.service';
import type {
  EnableServiceDto,
  DisableServiceDto,
} from '../dto/enable-service.dto';

export interface ServiceActionResult {
  serviceId: string;
  action: 'enable' | 'disable' | 'restart';
  success: boolean;
  message: string;
  affectedServices?: string[];
  healthStatus?: HealthStatus;
}

export interface ServiceStatus {
  serviceId: string;
  name: string;
  category: ServiceCategory;
  enabled: boolean;
  containerStatus: 'running' | 'stopped' | 'unknown';
  healthStatus: HealthStatus;
  ports: string[];
  externalUrl?: string;
  uptime?: string;
}

@Injectable()
export class ServiceLifecycleService {
  private readonly logger = new Logger(ServiceLifecycleService.name);

  constructor(
    private readonly configDb: ConfigDatabaseService,
    private readonly registry: ServiceRegistryService,
    private readonly docker: DockerComposeService,
    private readonly health: HealthCheckService,
  ) {}

  async enableService(
    serviceId: string,
    options?: EnableServiceDto,
  ): Promise<ServiceActionResult> {
    const enableDeps = options?.enableDependencies !== false;
    const skipHealthCheck = options?.skipHealthCheck === true;
    const timeout = options?.timeout ?? 60000;

    const row = this.configDb.getService(serviceId);
    if (!row) {
      return this.errorResult(
        serviceId,
        'enable',
        `Service "${serviceId}" not found`,
      );
    }

    if (row.enabled === 1) {
      return this.errorResult(
        serviceId,
        'enable',
        `Service "${serviceId}" is already enabled`,
      );
    }

    const affectedServices: string[] = [];

    // Auto-enable dependencies
    if (enableDeps) {
      const deps = this.registry.getDependencies(serviceId);
      for (const depId of deps) {
        const depRow = this.configDb.getService(depId);
        if (depRow && depRow.enabled !== 1) {
          this.logger.log(`Auto-enabling dependency: ${depId}`);
          const depResult = await this.enableService(depId, {
            enableDependencies: true,
            timeout,
          });
          if (!depResult.success) {
            return this.errorResult(
              serviceId,
              'enable',
              `Failed to enable dependency "${depId}": ${depResult.message}`,
            );
          }
          affectedServices.push(depId);
        }
      }
    }

    // Mark as enabled in SQLite
    this.configDb.updateServiceStatus(serviceId, true);
    this.configDb.updateHealthStatus(serviceId, 'unknown');

    // Start Docker container via profile
    const def = this.registry.getService(serviceId);
    if (def.dockerProfile) {
      const result = await this.docker.startProfile(def.dockerProfile);
      if (!result.success) {
        this.configDb.updateServiceStatus(serviceId, false);
        return this.errorResult(
          serviceId,
          'enable',
          `Docker start failed: ${result.stderr || result.stdout}`,
        );
      }
    }

    // Wait for healthy
    let healthStatus: HealthStatus = 'unknown';
    if (!skipHealthCheck && def.dockerProfile) {
      healthStatus = await this.waitForHealthy(serviceId, timeout);
      this.configDb.updateHealthStatus(serviceId, healthStatus);
    }

    this.logger.log(`Enabled service: ${serviceId} (health: ${healthStatus})`);

    return {
      serviceId,
      action: 'enable',
      success: true,
      message: `Service "${serviceId}" enabled successfully`,
      affectedServices:
        affectedServices.length > 0 ? affectedServices : undefined,
      healthStatus,
    };
  }

  async disableService(
    serviceId: string,
    options?: DisableServiceDto,
  ): Promise<ServiceActionResult> {
    const force = options?.force === true;
    const disableDependents = options?.disableDependents === true;

    const row = this.configDb.getService(serviceId);
    if (!row) {
      return this.errorResult(
        serviceId,
        'disable',
        `Service "${serviceId}" not found`,
      );
    }

    if (row.enabled !== 1) {
      return this.errorResult(
        serviceId,
        'disable',
        `Service "${serviceId}" is not enabled`,
      );
    }

    // Check dependents
    const { allowed, blockedBy } = this.registry.canDisable(serviceId);

    if (!allowed && !force && !disableDependents) {
      return this.errorResult(
        serviceId,
        'disable',
        `Cannot disable "${serviceId}": enabled dependents: ${blockedBy.join(', ')}`,
      );
    }

    const affectedServices: string[] = [];

    // Cascade disable dependents first
    if (!allowed && disableDependents) {
      for (const depId of blockedBy) {
        this.logger.log(`Cascade disabling dependent: ${depId}`);
        const depResult = await this.disableService(depId, { force: true });
        if (depResult.success) {
          affectedServices.push(depId);
        }
      }
    }

    // Stop Docker container
    const def = this.registry.getService(serviceId);
    if (def.dockerProfile) {
      const result = await this.docker.stopProfile(def.dockerProfile);
      if (!result.success) {
        this.logger.warn(
          `Docker stop failed for ${serviceId}: ${result.stderr}`,
        );
      }
    }

    // Update SQLite
    this.configDb.updateServiceStatus(serviceId, false);
    this.configDb.updateHealthStatus(serviceId, 'disabled' as HealthStatus);

    this.logger.log(`Disabled service: ${serviceId}`);

    return {
      serviceId,
      action: 'disable',
      success: true,
      message: `Service "${serviceId}" disabled successfully`,
      affectedServices:
        affectedServices.length > 0 ? affectedServices : undefined,
      healthStatus: 'disabled' as HealthStatus,
    };
  }

  async restartService(serviceId: string): Promise<ServiceActionResult> {
    const row = this.configDb.getService(serviceId);
    if (!row) {
      return this.errorResult(
        serviceId,
        'restart',
        `Service "${serviceId}" not found`,
      );
    }

    const def = this.registry.getService(serviceId);

    if (!def.dockerService) {
      return this.errorResult(
        serviceId,
        'restart',
        `Service "${serviceId}" has no Docker service configured`,
      );
    }

    this.configDb.updateHealthStatus(serviceId, 'unknown');

    const result = await this.docker.restartService(def.dockerService);
    if (!result.success) {
      return this.errorResult(
        serviceId,
        'restart',
        `Docker restart failed: ${result.stderr || result.stdout}`,
      );
    }

    const healthStatus = await this.waitForHealthy(serviceId, 60000);
    this.configDb.updateHealthStatus(serviceId, healthStatus);

    this.logger.log(
      `Restarted service: ${serviceId} (health: ${healthStatus})`,
    );

    return {
      serviceId,
      action: 'restart',
      success: true,
      message: `Service "${serviceId}" restarted successfully`,
      healthStatus,
    };
  }

  async getServiceStatus(serviceId: string): Promise<ServiceStatus> {
    const svc = this.registry.getService(serviceId);
    const row = this.configDb.getService(serviceId);

    let containerStatus: ServiceStatus['containerStatus'] = 'unknown';
    const ports: string[] = [];
    let uptime: string | undefined;

    if (svc.dockerService) {
      try {
        const containers = await this.docker.getRunningContainers();
        const container = containers.find(
          (c) => c.service === svc.dockerService,
        );
        if (container) {
          containerStatus =
            container.status === 'running' ? 'running' : 'stopped';
          ports.push(...container.ports);
          uptime = container.uptime;
        } else if (row?.enabled === 1) {
          containerStatus = 'stopped';
        }
      } catch {
        containerStatus = 'unknown';
      }
    }

    return {
      serviceId,
      name: svc.name,
      category: svc.category,
      enabled: row?.enabled === 1,
      containerStatus,
      healthStatus: (row?.health_status as HealthStatus) ?? 'unknown',
      ports,
      externalUrl: svc.externalUrl,
      uptime,
    };
  }

  async getAllStatuses(): Promise<ServiceStatus[]> {
    const services = this.registry.getAllServices();
    return Promise.all(services.map((s) => this.getServiceStatus(s.id)));
  }

  private async waitForHealthy(
    serviceId: string,
    timeoutMs: number,
  ): Promise<HealthStatus> {
    const pollInterval = 2000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const result = await this.health.checkHealth(serviceId);
      if (result.status === 'healthy') {
        return 'healthy';
      }
      await this.sleep(pollInterval);
    }

    this.logger.warn(`Health check timed out for ${serviceId}`);
    return 'unhealthy';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private errorResult(
    serviceId: string,
    action: ServiceActionResult['action'],
    message: string,
  ): ServiceActionResult {
    this.logger.warn(`[${action}] ${message}`);
    return { serviceId, action, success: false, message };
  }
}
