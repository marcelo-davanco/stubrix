import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { CreateStatefulMockDto } from './dto/create-stateful-mock.dto';
import { UpdateStatefulMockDto } from './dto/update-stateful-mock.dto';
import { TemplateEngineService } from './template-engine.service';
import { StateResolverService } from './state-resolver.service';
import { WireMockTransformerProxyService } from './wiremock-transformer-proxy.service';
import type { ProxyRequest } from './wiremock-transformer-proxy.service';
import type { StateEngine } from './dto/create-stateful-mock.dto';

export interface StatefulMock {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  request: {
    method: string;
    url?: string;
    urlPattern?: string;
    urlPath?: string;
    urlPathPattern?: string;
    headers?: Record<string, unknown>;
    bodyPatterns?: unknown[];
  };
  stateConfig: {
    stateEngine: StateEngine;
    stateDatabase?: string;
    stateQuery: string;
    stateTemplate: string;
    queryTimeoutMs?: number;
    cacheTtlSeconds?: number;
  };
  response?: {
    status: number;
    headers?: Record<string, string>;
    fallbackBody?: string;
  };
}

@Injectable()
export class StatefulMocksService {
  private readonly logger = new Logger(StatefulMocksService.name);
  private readonly storageDir: string;

  constructor(
    private readonly config: ConfigService,
    private readonly templateEngine: TemplateEngineService,
    private readonly stateResolver: StateResolverService,
    private readonly proxy: WireMockTransformerProxyService,
  ) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ??
      path.join(process.cwd(), '../../mocks');
    this.storageDir = path.join(mocksDir, 'stateful');
    fs.mkdirSync(this.storageDir, { recursive: true });
  }

  findAll(): StatefulMock[] {
    if (!fs.existsSync(this.storageDir)) return [];
    return fs
      .readdirSync(this.storageDir)
      .filter((f) => f.endsWith('.json'))
      .flatMap((filename) => {
        try {
          const raw = fs.readFileSync(path.join(this.storageDir, filename), 'utf-8');
          return [JSON.parse(raw) as StatefulMock];
        } catch {
          return [];
        }
      });
  }

  findOne(id: string): StatefulMock {
    const filePath = path.join(this.storageDir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Stateful mock '${id}' not found`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as StatefulMock;
  }

  create(dto: CreateStatefulMockDto): StatefulMock {
    const validation = this.templateEngine.validate(dto.stateConfig.stateTemplate);
    if (!validation.valid) {
      throw new BadRequestException(
        `Invalid Handlebars template: ${validation.error}`,
      );
    }

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

    const now = new Date().toISOString();
    const mock: StatefulMock = {
      id: uuidv4(),
      name: dto.name,
      description: dto.description,
      createdAt: now,
      updatedAt: now,
      request: dto.request,
      stateConfig: dto.stateConfig,
      response: dto.response,
    };

    this.save(mock);
    this.logger.log(`Created stateful mock '${mock.name}' (${mock.id})`);
    return mock;
  }

  update(id: string, dto: UpdateStatefulMockDto): StatefulMock {
    const existing = this.findOne(id);

    if (dto.stateConfig?.stateTemplate) {
      const validation = this.templateEngine.validate(dto.stateConfig.stateTemplate);
      if (!validation.valid) {
        throw new BadRequestException(
          `Invalid Handlebars template: ${validation.error}`,
        );
      }
    }

    const updated: StatefulMock = {
      ...existing,
      name: dto.name ?? existing.name,
      description: dto.description ?? existing.description,
      request: dto.request ?? existing.request,
      stateConfig: dto.stateConfig
        ? { ...existing.stateConfig, ...dto.stateConfig }
        : existing.stateConfig,
      response: dto.response ?? existing.response,
      updatedAt: new Date().toISOString(),
    };

    this.save(updated);
    return updated;
  }

  remove(id: string): void {
    const filePath = path.join(this.storageDir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Stateful mock '${id}' not found`);
    }
    fs.unlinkSync(filePath);
    this.stateResolver.invalidateCache(id);
  }

  async test(id: string, request?: ProxyRequest): Promise<{
    response: { status: number; headers: Record<string, string>; body: string };
    resolvedFromState: boolean;
    stateQueryTimeMs?: number;
    fromCache?: boolean;
  }> {
    const mock = this.findOne(id);
    const proxyRequest: ProxyRequest = request ?? {
      method: mock.request.method,
      url: mock.request.url ?? mock.request.urlPath ?? '/test',
    };

    const result = await this.proxy.resolve(mock, proxyRequest);
    return {
      response: {
        status: result.status,
        headers: result.headers,
        body: result.body,
      },
      resolvedFromState: result.resolvedFromState,
      stateQueryTimeMs: result.stateQueryTimeMs,
      fromCache: result.fromCache,
    };
  }

  preview(id: string): { template: string; sampleContext: Record<string, unknown> } {
    const mock = this.findOne(id);
    const sampleContext = {
      state: {
        rows: [{ id: 1, name: 'Sample Row', active: true }],
        rowCount: 1,
        queryTimeMs: 0,
        fromCache: false,
      },
      request: {
        method: mock.request.method,
        url: mock.request.url ?? mock.request.urlPath ?? '/preview',
        query: {},
        headers: {},
      },
    };

    const renderedBody = this.templateEngine.render(
      mock.stateConfig.stateTemplate,
      sampleContext,
    );

    return { template: mock.stateConfig.stateTemplate, sampleContext: { ...sampleContext, renderedBody } };
  }

  private save(mock: StatefulMock): void {
    const filePath = path.join(this.storageDir, `${mock.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(mock, null, 2));
  }
}
