import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { WireMockClientService } from '../common/wiremock-client.service';
import { ProjectsService } from '../projects/projects.service';
import {
  RecordingState,
  StartRecordingDto,
  RecordingStopResult,
  SnapshotResult,
} from '@stubrix/shared';

@Injectable()
export class RecordingService {
  private readonly mappingsDir: string;

  constructor(
    private readonly config: ConfigService,
    private readonly wireMock: WireMockClientService,
    private readonly projects: ProjectsService,
  ) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ??
      path.join(process.cwd(), '../../mocks');
    this.mappingsDir = path.join(mocksDir, 'mappings');
  }

  async getStatus(projectId: string): Promise<RecordingState> {
    this.projects.findOne(projectId);

    try {
      const status = await this.wireMock.get<{
        status: string;
        request?: { targetBaseUrl?: string };
      }>('/recordings/status');
      const active = status.status === 'Recording';
      return {
        active,
        projectId: null,
        proxyTarget: active ? (status.request?.targetBaseUrl ?? null) : null,
        startedAt: null,
        requestsRecorded: 0,
      };
    } catch {
      return {
        active: false,
        projectId: null,
        proxyTarget: null,
        startedAt: null,
        requestsRecorded: 0,
      };
    }
  }

  async start(
    projectId: string,
    dto: StartRecordingDto,
  ): Promise<RecordingState> {
    const project = this.projects.findOne(projectId);
    const proxyTarget = dto.proxyTarget ?? project.proxyTarget;

    if (!proxyTarget) {
      throw new BadRequestException(
        `No proxy target defined for project '${projectId}'. Provide proxyTarget in body or configure it on the project.`,
      );
    }

    await this.wireMock.post('/recordings/start', {
      targetBaseUrl: proxyTarget,
      captureHeaders: { 'Content-Type': {} },
      requestBodyPattern: {
        matcher: 'equalToJson',
        ignoreArrayOrder: true,
        ignoreExtraElements: true,
      },
      persist: true,
      extractBodyCriteria: { textSizeThreshold: '0 kb' },
    });

    return {
      active: true,
      projectId,
      proxyTarget,
      startedAt: new Date().toISOString(),
      requestsRecorded: 0,
    };
  }

  async stop(projectId: string): Promise<RecordingStopResult> {
    this.projects.findOne(projectId);

    const result = await this.wireMock.post<{
      mappings?: Array<{ id?: string }>;
    }>('/recordings/stop', {});
    const newMocks = result.mappings?.length ?? 0;
    const mappingIds = (result.mappings ?? [])
      .map((m) => m.id)
      .filter(Boolean) as string[];

    this.injectProjectMetadata(projectId, mappingIds);

    return {
      message: 'Recording stopped',
      projectId,
      newMocks,
      files: [],
    };
  }

  async snapshot(projectId: string): Promise<SnapshotResult> {
    this.projects.findOne(projectId);

    const result = await this.wireMock.post<{
      mappings?: Array<{ id?: string }>;
    }>('/recordings/snapshot', {
      persist: true,
    });
    const newMocks = result.mappings?.length ?? 0;
    const mappingIds = (result.mappings ?? [])
      .map((m) => m.id)
      .filter(Boolean) as string[];

    this.injectProjectMetadata(projectId, mappingIds);

    return { message: 'Snapshot taken', projectId, newMocks };
  }

  private injectProjectMetadata(projectId: string, mappingIds: string[]): void {
    if (!fs.existsSync(this.mappingsDir) || mappingIds.length === 0) return;

    const files = fs
      .readdirSync(this.mappingsDir)
      .filter((f) => f.endsWith('.json'));

    for (const filename of files) {
      try {
        const filePath = path.join(this.mappingsDir, filename);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const mapping = JSON.parse(raw) as {
          id?: string;
          metadata?: { project?: string };
        };

        if (!mapping.id || !mappingIds.includes(mapping.id)) continue;
        if (mapping.metadata?.project) continue;

        mapping.metadata = { ...(mapping.metadata ?? {}), project: projectId };
        fs.writeFileSync(filePath, JSON.stringify(mapping, null, 2));
      } catch {
        // skip
      }
    }
  }
}
