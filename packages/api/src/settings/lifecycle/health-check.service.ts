import { Injectable, Logger } from '@nestjs/common';
import { createConnection } from 'net';
import type { HealthStatus } from '@stubrix/shared';
import { ConfigDatabaseService } from '../database/config-database.service';

export interface HealthCheckResult {
  serviceId: string;
  status: HealthStatus;
  responseTime?: number;
  details?: string;
  checkedAt: string;
}

interface HttpCheckConfig {
  type: 'http';
  url: string;
  auth?: { username: string; password: string };
}

interface TcpCheckConfig {
  type: 'tcp';
  host: string;
  port: number;
}

type CheckConfig = HttpCheckConfig | TcpCheckConfig;

const HEALTH_CHECK_MAP_LOCAL: Record<string, CheckConfig> = {
  wiremock: { type: 'http', url: 'http://localhost:8081/__admin/settings' },
  'wiremock-record': {
    type: 'http',
    url: 'http://localhost:8081/__admin/settings',
  },
  mockoon: { type: 'tcp', host: 'localhost', port: 8081 },
  'mockoon-proxy': { type: 'tcp', host: 'localhost', port: 8081 },
  postgres: { type: 'tcp', host: 'localhost', port: 5442 },
  mysql: { type: 'tcp', host: 'localhost', port: 3307 },
  adminer: { type: 'http', url: 'http://localhost:8084/' },
  cloudbeaver: { type: 'http', url: 'http://localhost:8083/' },
  localstack: { type: 'http', url: 'http://localhost:4566/_localstack/health' },
  minio: { type: 'http', url: 'http://localhost:9000/minio/health/live' },
  keycloak: { type: 'http', url: 'http://localhost:8180/realms/master' },
  zitadel: { type: 'http', url: 'http://localhost:8085/' },
  prometheus: { type: 'http', url: 'http://localhost:9091/-/ready' },
  grafana: { type: 'http', url: 'http://localhost:3000/api/health' },
  jaeger: { type: 'http', url: 'http://localhost:16686/api/services' },
  redpanda: { type: 'http', url: 'http://localhost:8082/topics' },
  'redpanda-console': { type: 'http', url: 'http://localhost:8080/' },
  rabbitmq: {
    type: 'http',
    url: 'http://localhost:15672/api/healthchecks/node',
    auth: { username: 'guest', password: 'guest' },
  },
  gripmock: { type: 'http', url: 'http://localhost:4771/' },
  'pact-broker': {
    type: 'http',
    url: 'http://localhost:9292/diagnostic/status/heartbeat',
  },
  toxiproxy: { type: 'http', url: 'http://localhost:8474/version' },
  chromadb: { type: 'http', url: 'http://localhost:8000/api/v2/heartbeat' },
  openrag: { type: 'http', url: 'http://localhost:8888/health' },
  hoppscotch: { type: 'tcp', host: 'localhost', port: 3100 },
};

const HEALTH_CHECK_MAP_DOCKER: Record<string, CheckConfig> = {
  wiremock: { type: 'http', url: 'http://wiremock:8081/__admin/settings' },
  'wiremock-record': {
    type: 'http',
    url: 'http://wiremock-record:8081/__admin/settings',
  },
  mockoon: { type: 'tcp', host: 'mockoon', port: 8081 },
  'mockoon-proxy': { type: 'tcp', host: 'mockoon-proxy', port: 8081 },
  postgres: { type: 'tcp', host: 'db-postgres', port: 5432 },
  mysql: { type: 'tcp', host: 'db-mysql', port: 3306 },
  adminer: { type: 'http', url: 'http://adminer:8080/' },
  cloudbeaver: { type: 'http', url: 'http://cloudbeaver:8978/' },
  localstack: {
    type: 'http',
    url: 'http://localstack:4566/_localstack/health',
  },
  minio: { type: 'http', url: 'http://minio:9000/minio/health/live' },
  keycloak: { type: 'http', url: 'http://keycloak:8080/realms/master' },
  zitadel: { type: 'http', url: 'http://zitadel:8080/' },
  prometheus: { type: 'http', url: 'http://prometheus:9090/-/ready' },
  grafana: { type: 'http', url: 'http://grafana:3000/api/health' },
  jaeger: { type: 'http', url: 'http://jaeger:16686/api/services' },
  redpanda: { type: 'http', url: 'http://redpanda:8082/topics' },
  'redpanda-console': { type: 'http', url: 'http://redpanda-console:8080/' },
  rabbitmq: {
    type: 'http',
    url: 'http://rabbitmq:15672/api/healthchecks/node',
    auth: { username: 'guest', password: 'guest' },
  },
  gripmock: { type: 'http', url: 'http://gripmock:4771/' },
  'pact-broker': {
    type: 'http',
    url: 'http://pact-broker:9292/diagnostic/status/heartbeat',
  },
  toxiproxy: { type: 'http', url: 'http://toxiproxy:8474/version' },
  chromadb: { type: 'http', url: 'http://chromadb:8000/api/v2/heartbeat' },
  openrag: { type: 'http', url: 'http://openrag:8000/health' },
  hoppscotch: { type: 'tcp', host: 'hoppscotch', port: 3000 },
};

const HEALTH_CHECK_MAP: Record<string, CheckConfig> =
  process.env.NODE_ENV === 'production'
    ? HEALTH_CHECK_MAP_DOCKER
    : HEALTH_CHECK_MAP_LOCAL;

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly httpTimeout: number;
  private readonly tcpTimeout: number;
  private monitoringTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly configDb: ConfigDatabaseService) {
    this.httpTimeout = 5000;
    this.tcpTimeout = 3000;
  }

  async checkHealth(serviceId: string): Promise<HealthCheckResult> {
    const config = HEALTH_CHECK_MAP[serviceId];
    const checkedAt = new Date().toISOString();

    if (!config) {
      return {
        serviceId,
        status: 'unknown',
        checkedAt,
        details: 'No check configured',
      };
    }

    const start = Date.now();
    try {
      if (config.type === 'http') {
        await this.httpCheck(config.url, config.auth);
      } else {
        await this.tcpCheck(config.host, config.port);
      }
      const responseTime = Date.now() - start;
      return { serviceId, status: 'healthy', responseTime, checkedAt };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { serviceId, status: 'unhealthy', checkedAt, details: message };
    }
  }

  async checkAllEnabled(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();
    const services = this.configDb
      .getAllServices()
      .filter((s) => s.enabled === 1);

    await Promise.all(
      services.map(async (s) => {
        const result = await this.checkHealth(s.id);
        results.set(s.id, result);
      }),
    );

    return results;
  }

  startMonitoring(intervalMs?: number): void {
    const interval =
      intervalMs ?? parseInt(process.env.HEALTH_CHECK_INTERVAL ?? '30000', 10);

    if (interval <= 0) {
      this.logger.log('Health monitoring disabled (interval=0)');
      return;
    }

    if (this.monitoringTimer) {
      this.stopMonitoring();
    }

    this.logger.log(`Starting health monitoring every ${interval}ms`);
    void this.runMonitoringCycle();
    this.monitoringTimer = setInterval(() => {
      void this.runMonitoringCycle();
    }, interval);
  }

  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
      this.logger.log('Health monitoring stopped');
    }
  }

  private async runMonitoringCycle(): Promise<void> {
    const services = this.configDb
      .getAllServices()
      .filter((s) => s.enabled === 1);
    for (const service of services) {
      try {
        const result = await this.checkHealth(service.id);
        if (result.status !== service.health_status) {
          this.configDb.updateHealthStatus(service.id, result.status);
          this.logger.debug(
            `Health changed: ${service.id} ${service.health_status} → ${result.status}`,
          );
        }
      } catch (err: unknown) {
        this.logger.warn(
          `Monitor cycle error for ${service.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  private async httpCheck(
    url: string,
    auth?: { username: string; password: string },
  ): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.httpTimeout);

    const headers: Record<string, string> = {};
    if (auth) {
      const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString(
        'base64',
      );
      headers['Authorization'] = `Basic ${encoded}`;
    }

    try {
      const res = await fetch(url, { signal: controller.signal, headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  private tcpCheck(host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host, port });

      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`TCP timeout connecting to ${host}:${port}`));
      }, this.tcpTimeout);

      socket.once('connect', () => {
        clearTimeout(timer);
        socket.end();
        resolve();
      });

      socket.once('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }
}
