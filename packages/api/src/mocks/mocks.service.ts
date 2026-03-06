import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { WireMockClientService } from '../common/wiremock-client.service';
import { ProjectsService } from '../projects/projects.service';
import type { Mock, MockListItem, MockDetail } from '@stubrix/shared';
import { CreateMockDto } from './dto/create-mock.dto';
import { UpdateMockDto } from './dto/update-mock.dto';

@Injectable()
export class MocksService {
  private readonly mappingsDir: string;
  private readonly filesDir: string;

  constructor(
    private readonly config: ConfigService,
    private readonly wireMock: WireMockClientService,
    private readonly projects: ProjectsService,
  ) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ??
      path.join(process.cwd(), '../../mocks');
    this.mappingsDir = path.join(mocksDir, 'mappings');
    this.filesDir = path.join(mocksDir, '__files');
  }

  findAll(projectId: string): MockListItem[] {
    this.projects.findOne(projectId);
    if (!fs.existsSync(this.mappingsDir)) return [];

    return fs
      .readdirSync(this.mappingsDir)
      .filter((f) => f.endsWith('.json'))
      .flatMap((filename) => {
        try {
          const raw = fs.readFileSync(
            path.join(this.mappingsDir, filename),
            'utf-8',
          );
          const mapping = JSON.parse(raw) as Mock;
          const mappingProject = mapping?.metadata?.project ?? 'default';
          if (mappingProject !== projectId) return [];
          return [this.toListItem(filename, mapping, projectId)];
        } catch {
          return [];
        }
      });
  }

  findOne(projectId: string, id: string): MockDetail {
    this.projects.findOne(projectId);

    const files = fs.existsSync(this.mappingsDir)
      ? fs.readdirSync(this.mappingsDir).filter((f) => f.endsWith('.json'))
      : [];

    for (const filename of files) {
      try {
        const raw = fs.readFileSync(
          path.join(this.mappingsDir, filename),
          'utf-8',
        );
        const mapping = JSON.parse(raw) as Mock;
        if (mapping.id !== id) continue;

        const mappingProject = mapping?.metadata?.project ?? 'default';
        if (mappingProject !== projectId) {
          throw new NotFoundException(
            `Mock '${id}' not found in project '${projectId}'`,
          );
        }

        const listItem = this.toListItem(filename, mapping, projectId);
        let body: string | undefined;
        if (mapping.response.bodyFileName) {
          const bodyPath = path.join(
            this.filesDir,
            mapping.response.bodyFileName,
          );
          if (fs.existsSync(bodyPath)) {
            body = fs.readFileSync(bodyPath, 'utf-8');
          }
        }
        return { ...listItem, mapping, body };
      } catch (e) {
        if (e instanceof NotFoundException) throw e;
        throw e;
      }
    }

    throw new NotFoundException(`Mock '${id}' not found`);
  }

  async create(projectId: string, dto: CreateMockDto): Promise<MockDetail> {
    this.projects.findOne(projectId);

    const hasUrl =
      dto.request.url ??
      dto.request.urlPattern ??
      dto.request.urlPath ??
      dto.request.urlPathPattern;
    if (!hasUrl) {
      throw new BadRequestException(
        'At least one URL field (url, urlPattern, urlPath, urlPathPattern) is required',
      );
    }

    const id = uuidv4();
    const method = (dto.request.method ?? 'GET').toLowerCase();
    const rawUrl = dto.request.url ?? dto.request.urlPattern ?? dto.request.urlPath ?? dto.request.urlPathPattern!;
    const urlSlug = String(rawUrl)
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .slice(0, 40);
    const filename = `${urlSlug}_${method}_${id}.json`;

    const mapping: Mock = {
      id,
      request: dto.request,
      response: dto.response,
      metadata: { project: projectId },
    };

    fs.mkdirSync(this.mappingsDir, { recursive: true });
    fs.writeFileSync(
      path.join(this.mappingsDir, filename),
      JSON.stringify(mapping, null, 2),
    );

    try {
      await this.wireMock.post('/mappings', mapping);
    } catch {
      // WireMock may not be running; file saved regardless
    }

    return this.findOne(projectId, id);
  }

  async update(
    projectId: string,
    id: string,
    dto: UpdateMockDto,
  ): Promise<MockDetail> {
    const existing = this.findOne(projectId, id);
    const updated: Mock = {
      ...existing.mapping,
      request: dto.request ?? existing.mapping.request,
      response: dto.response ?? existing.mapping.response,
      metadata: { project: projectId },
    };

    const filePath = path.join(this.mappingsDir, existing.filename);
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));

    try {
      await this.wireMock.put(`/mappings/${id}`, updated);
    } catch {
      // WireMock may not be running
    }

    return this.findOne(projectId, id);
  }

  async remove(projectId: string, id: string): Promise<void> {
    const existing = this.findOne(projectId, id);
    const filePath = path.join(this.mappingsDir, existing.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    try {
      await this.wireMock.delete(`/mappings/${id}`);
    } catch {
      // WireMock may not be running
    }
  }

  private toListItem(
    filename: string,
    mapping: Mock,
    projectId: string,
  ): MockListItem {
    const url =
      mapping.request.url ??
      mapping.request.urlPattern ??
      mapping.request.urlPath ??
      mapping.request.urlPathPattern ??
      '(unknown)';

    return {
      id: mapping.id,
      filename,
      projectId,
      request: { method: mapping.request.method, url },
      response: {
        status: mapping.response.status,
        hasBodyFile: !!mapping.response.bodyFileName,
        bodyFileName: mapping.response.bodyFileName,
        bodyPreview: mapping.response.body?.slice(0, 100),
      },
    };
  }
}
