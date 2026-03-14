import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { resolve, join } from 'path';

const execFileAsync = promisify(execFile);

export interface DockerResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ContainerInfo {
  name: string;
  service: string;
  status: 'running' | 'stopped' | 'restarting' | 'exited';
  health?: 'healthy' | 'unhealthy' | 'starting';
  ports: string[];
  uptime: string;
}

export type ContainerStatus = ContainerInfo['status'] | 'unknown';

@Injectable()
export class DockerComposeService {
  private readonly logger = new Logger(DockerComposeService.name);
  private readonly composePath: string;
  private readonly projectName: string;
  private readonly timeout: number;

  constructor() {
    this.composePath = resolve(
      process.env.COMPOSE_FILE_PATH ??
        join(__dirname, '..', '..', '..', '..', '..', 'docker-compose.yml'),
    );
    this.projectName = process.env.COMPOSE_PROJECT_NAME ?? 'mocks-servers';
    this.timeout = parseInt(process.env.DOCKER_TIMEOUT ?? '60000', 10);
  }

  async startProfile(profile: string): Promise<DockerResult> {
    return this.run([
      'compose',
      '-f',
      this.composePath,
      '-p',
      this.projectName,
      '--profile',
      profile,
      'up',
      '-d',
      '--no-recreate',
    ]);
  }

  async stopProfile(profile: string): Promise<DockerResult> {
    return this.run([
      'compose',
      '-f',
      this.composePath,
      '-p',
      this.projectName,
      '--profile',
      profile,
      'stop',
    ]);
  }

  async restartService(serviceName: string): Promise<DockerResult> {
    return this.run([
      'compose',
      '-f',
      this.composePath,
      '-p',
      this.projectName,
      'restart',
      serviceName,
    ]);
  }

  async getRunningContainers(): Promise<ContainerInfo[]> {
    const result = await this.run([
      'compose',
      '-f',
      this.composePath,
      '-p',
      this.projectName,
      'ps',
      '--format',
      'json',
    ]);

    if (!result.success || !result.stdout.trim()) {
      return [];
    }

    try {
      const lines = result.stdout
        .trim()
        .split('\n')
        .filter((l) => l.trim());
      const containers: ContainerInfo[] = [];

      for (const line of lines) {
        const raw = JSON.parse(line) as Record<string, unknown>;
        containers.push(this.parseContainerJson(raw));
      }

      return containers;
    } catch {
      this.logger.warn('Failed to parse docker compose ps output');
      return [];
    }
  }

  async getContainerStatus(serviceName: string): Promise<ContainerStatus> {
    const containers = await this.getRunningContainers();
    const container = containers.find((c) => c.service === serviceName);
    return container?.status ?? 'unknown';
  }

  async getContainerLogs(serviceName: string, tail = 100): Promise<string> {
    const result = await this.run([
      'compose',
      '-f',
      this.composePath,
      '-p',
      this.projectName,
      'logs',
      '--tail',
      String(tail),
      '--no-color',
      serviceName,
    ]);
    return result.stdout;
  }

  async isContainerHealthy(serviceName: string): Promise<boolean> {
    const containers = await this.getRunningContainers();
    const container = containers.find((c) => c.service === serviceName);
    if (!container) return false;
    return container.status === 'running' && container.health !== 'unhealthy';
  }

  private async run(args: string[]): Promise<DockerResult> {
    this.logger.debug(`docker ${args.join(' ')}`);

    try {
      const { stdout, stderr } = await execFileAsync('docker', args, {
        timeout: this.timeout,
      });

      return { success: true, stdout, stderr, exitCode: 0 };
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException & {
        stdout?: string;
        stderr?: string;
        code?: number;
      };

      this.logger.warn(
        `docker ${args[0]} ${args[1] ?? ''} failed: ${error.message}`,
      );

      return {
        success: false,
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? error.message,
        exitCode: error.code ?? 1,
      };
    }
  }

  private parseContainerJson(raw: Record<string, unknown>): ContainerInfo {
    const str = (key: string, fallback: string, key2?: string): string => {
      const val = raw[key] ?? (key2 ? raw[key2] : undefined) ?? fallback;
      return typeof val === 'string' ? val : fallback;
    };

    const statusStr = str('Status', '', 'status').toLowerCase();
    const stateStr = str('State', '', 'state').toLowerCase();

    let status: ContainerInfo['status'] = 'stopped';
    if (stateStr === 'running' || statusStr.startsWith('up')) {
      status = 'running';
    } else if (stateStr === 'restarting') {
      status = 'restarting';
    } else if (stateStr === 'exited' || statusStr.startsWith('exited')) {
      status = 'exited';
    }

    const healthStr = str('Health', '', 'health').toLowerCase();
    let health: ContainerInfo['health'];
    if (healthStr === 'healthy') health = 'healthy';
    else if (healthStr === 'unhealthy') health = 'unhealthy';
    else if (healthStr === 'starting') health = 'starting';

    const portsRaw = raw['Ports'] ?? raw['ports'];
    const ports = Array.isArray(portsRaw)
      ? (portsRaw as string[])
      : typeof portsRaw === 'string' && portsRaw
        ? [portsRaw]
        : [];

    return {
      name: str('Name', '', 'name'),
      service: str('Service', '', 'service'),
      status,
      health,
      ports,
      uptime: str('RunningFor', '', 'uptime'),
    };
  }
}
