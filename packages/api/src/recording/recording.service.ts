import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { Minimatch } from 'minimatch';
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
  private readonly logger = new Logger(RecordingService.name);

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

  /**
   * Check if a URL should be recorded based on include/exclude patterns
   */
  private shouldRecordUrl(
    url: string,
    includePatterns?: string[],
    excludePatterns?: string[],
  ): boolean {
    // Extract path from URL (remove query string and fragment)
    const urlPath = new URL(url).pathname;

    // If exclude patterns are defined, check if URL matches any exclude pattern
    if (excludePatterns && excludePatterns.length > 0) {
      for (const pattern of excludePatterns) {
        const mm = new Minimatch(pattern);
        if (mm.match(urlPath)) {
          this.logger.debug(
            `URL excluded by pattern: ${urlPath} matches ${pattern}`,
          );
          return false;
        }
      }
    }

    // If include patterns are defined, check if URL matches any include pattern
    if (includePatterns && includePatterns.length > 0) {
      for (const pattern of includePatterns) {
        const mm = new Minimatch(pattern);
        if (mm.match(urlPath)) {
          this.logger.debug(
            `URL included by pattern: ${urlPath} matches ${pattern}`,
          );
          return true;
        }
      }
      // If include patterns are defined but none match, exclude the URL
      this.logger.debug(
        `URL excluded: ${urlPath} doesn't match any include patterns`,
      );
      return false;
    }

    // If no patterns are defined, record everything
    return true;
  }

  /**
   * Filter mappings based on URL patterns after recording stops
   */
  private async filterMappings(
    mappingIds: string[],
    includePatterns?: string[],
    excludePatterns?: string[],
  ): Promise<string[]> {
    if (!includePatterns?.length && !excludePatterns?.length) {
      return mappingIds;
    }

    this.logger.log(`Filtering ${mappingIds.length} mappings with patterns...`);

    const filteredIds: string[] = [];

    for (const mappingId of mappingIds) {
      try {
        // Get the mapping details from WireMock
        const mapping = await this.wireMock.get<{
          request?: {
            url?: string;
            urlPattern?: string | { urlPattern?: string };
          };
        }>(`/mappings/${mappingId}`);
        const requestUrl = mapping.request?.url ?? mapping.request?.urlPattern;

        if (!requestUrl) {
          this.logger.warn(
            `Mapping ${mappingId} has no URL pattern, keeping by default`,
          );
          filteredIds.push(mappingId);
          continue;
        }

        // Handle different URL pattern types
        let urlToCheck: string;
        if (typeof requestUrl === 'string') {
          urlToCheck = requestUrl;
        } else if (
          typeof requestUrl === 'object' &&
          typeof requestUrl.urlPattern === 'string'
        ) {
          urlToCheck = requestUrl.urlPattern;
        } else {
          this.logger.warn(
            `Mapping ${mappingId} has unsupported URL pattern type, keeping by default`,
          );
          filteredIds.push(mappingId);
          continue;
        }

        // Convert WireMock patterns to standard URLs for matching
        // WireMock uses patterns like "/api/users/**" which we can test directly
        const shouldKeep = this.shouldRecordUrl(
          `http://example.com${urlToCheck}`,
          includePatterns,
          excludePatterns,
        );

        if (shouldKeep) {
          filteredIds.push(mappingId);
        } else {
          // Delete the mapping that doesn't match filters
          await this.wireMock.delete(`/mappings/${mappingId}`);
          this.logger.debug(
            `Deleted mapping ${mappingId} due to filter: ${urlToCheck}`,
          );
        }
      } catch (error) {
        this.logger.error(`Error processing mapping ${mappingId}:`, error);
        // Keep mapping if there's an error to avoid data loss
        filteredIds.push(mappingId);
      }
    }

    this.logger.log(
      `Filtered mappings: ${mappingIds.length} → ${filteredIds.length} (${mappingIds.length - filteredIds.length} removed)`,
    );
    return filteredIds;
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

    // Log filter configuration
    if (dto.includePatterns?.length || dto.excludePatterns?.length) {
      this.logger.log(`Starting recording with filters:`, {
        includePatterns: dto.includePatterns,
        excludePatterns: dto.excludePatterns,
      });
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
      includePatterns: dto.includePatterns,
      excludePatterns: dto.excludePatterns,
    };
  }

  async stop(
    projectId: string,
    includePatterns?: string[],
    excludePatterns?: string[],
  ): Promise<RecordingStopResult> {
    this.projects.findOne(projectId);

    const result = await this.wireMock.post<{
      mappings?: Array<{ id?: string }>;
    }>('/recordings/stop', {});
    const newMocks = result.mappings?.length ?? 0;
    const mappingIds = (result.mappings ?? [])
      .map((m) => m.id)
      .filter(Boolean) as string[];

    // Apply filters if provided
    const filteredMappingIds = await this.filterMappings(
      mappingIds,
      includePatterns,
      excludePatterns,
    );
    this.injectProjectMetadata(projectId, filteredMappingIds);

    const filteredCount = mappingIds.length - filteredMappingIds.length;

    return {
      message:
        filteredCount > 0
          ? `Recording stopped and filtered: ${newMocks} recorded, ${filteredCount} removed by filters`
          : 'Recording stopped',
      projectId,
      newMocks: filteredMappingIds.length,
      files: [],
    };
  }

  async snapshot(
    projectId: string,
    includePatterns?: string[],
    excludePatterns?: string[],
  ): Promise<SnapshotResult> {
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

    // Apply filters if provided
    const filteredMappingIds = await this.filterMappings(
      mappingIds,
      includePatterns,
      excludePatterns,
    );
    this.injectProjectMetadata(projectId, filteredMappingIds);

    const filteredCount = mappingIds.length - filteredMappingIds.length;

    return {
      message:
        filteredCount > 0
          ? `Snapshot taken and filtered: ${newMocks} recorded, ${filteredCount} removed by filters`
          : 'Snapshot taken',
      projectId,
      newMocks: filteredMappingIds.length,
    };
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
