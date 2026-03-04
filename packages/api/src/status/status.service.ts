import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { WireMockClientService } from '../common/wiremock-client.service';
import { ProjectsService } from '../projects/projects.service';
import { StatusResponse, MocksByProject } from '@stubrix/shared';

@Injectable()
export class StatusService {
  private readonly mocksDir: string;
  private readonly startTime = Date.now();

  constructor(
    private readonly config: ConfigService,
    private readonly wireMock: WireMockClientService,
    private readonly projects: ProjectsService,
  ) {
    this.mocksDir = this.config.get<string>('MOCKS_DIR') ?? path.join(process.cwd(), '../../mocks');
  }

  async getStatus(): Promise<StatusResponse> {
    const engine = (this.config.get<string>('MOCK_ENGINE') ?? 'wiremock') as 'wiremock' | 'mockoon';
    const port = parseInt(this.config.get<string>('MOCK_PORT') ?? '8081', 10);
    const controlPort = parseInt(this.config.get<string>('CONTROL_PORT') ?? '9090', 10);
    const proxyTarget = this.config.get<string>('PROXY_TARGET') ?? null;

    let engineStatus: 'running' | 'stopped' | 'error' = 'stopped';
    let recordMode = false;

    try {
      await this.wireMock.get('/settings');
      engineStatus = 'running';
      const settings = await this.wireMock.get<{ record?: boolean; proxyBaseUrl?: string }>('/recordings/status');
      recordMode = !!(settings as { status?: string }).status && (settings as { status?: string }).status === 'Recording';
    } catch {
      engineStatus = 'stopped';
    }

    const { total, byProject } = this.countMocksByProject();
    const allProjects = this.projects.findAll();

    const mappingsDir = path.join(this.mocksDir, 'mappings');
    const filesDir = path.join(this.mocksDir, '__files');
    const bodyFiles = fs.existsSync(filesDir) ? fs.readdirSync(filesDir).length : 0;

    return {
      engine,
      engineStatus,
      port,
      controlPort,
      recordMode,
      proxyTarget,
      mocks: { total, bodyFiles, byProject },
      projects: allProjects.length,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  private countMocksByProject(): { total: number; byProject: MocksByProject } {
    const mappingsDir = path.join(this.mocksDir, 'mappings');
    const byProject: MocksByProject = { default: 0 };

    if (!fs.existsSync(mappingsDir)) return { total: 0, byProject };

    const files = fs.readdirSync(mappingsDir).filter((f) => f.endsWith('.json'));
    let total = 0;

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(mappingsDir, file), 'utf-8');
        const mapping = JSON.parse(raw) as { metadata?: { project?: string } };
        const project = mapping?.metadata?.project ?? 'default';
        byProject[project] = (byProject[project] ?? 0) + 1;
        total++;
      } catch {
        // skip invalid files
      }
    }

    return { total, byProject };
  }
}
