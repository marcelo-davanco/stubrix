import { Injectable, Logger } from '@nestjs/common';
import { StateResolverService } from './state-resolver.service';
import { TemplateEngineService } from './template-engine.service';
import type { StatefulMock } from './stateful-mocks.service';
import type { TemplateContext } from './template-engine.service';

export interface ProxyRequest {
  method: string;
  url: string;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: unknown;
}

export interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  resolvedFromState: boolean;
  stateQueryTimeMs?: number;
  fromCache?: boolean;
}

@Injectable()
export class WireMockTransformerProxyService {
  private readonly logger = new Logger(WireMockTransformerProxyService.name);

  constructor(
    private readonly stateResolver: StateResolverService,
    private readonly templateEngine: TemplateEngineService,
  ) {}

  async resolve(
    mock: StatefulMock,
    request: ProxyRequest,
  ): Promise<ProxyResponse> {
    const { stateConfig, response } = mock;
    const defaultStatus = response?.status ?? 200;
    const defaultHeaders = response?.headers ?? {
      'Content-Type': 'application/json',
    };

    try {
      const stateResult = await this.stateResolver.resolve({
        stateEngine: stateConfig.stateEngine,
        stateDatabase: stateConfig.stateDatabase,
        stateQuery: stateConfig.stateQuery,
        queryParams: this.extractQueryParams(request),
        queryTimeoutMs: stateConfig.queryTimeoutMs ?? 5000,
        cacheTtlSeconds: stateConfig.cacheTtlSeconds ?? 0,
      });

      const requestContext: TemplateContext['request'] = {
        method: request.method,
        url: request.url,
        query: request.query,
        headers: request.headers,
        body: request.body,
      };

      const context = this.templateEngine.buildContext(
        stateResult,
        requestContext,
      );
      const renderedBody = this.templateEngine.render(
        stateConfig.stateTemplate,
        context,
      );

      return {
        status: defaultStatus,
        headers: { 'Content-Type': 'application/json', ...defaultHeaders },
        body: renderedBody,
        resolvedFromState: true,
        stateQueryTimeMs: stateResult.queryTimeMs,
        fromCache: stateResult.fromCache,
      };
    } catch (err) {
      this.logger.warn(
        `State resolution failed for mock '${mock.id}', falling back to static response. Reason: ${(err as Error).message}`,
      );

      const fallbackBody =
        response?.fallbackBody ?? '{"error":"state_unavailable"}';
      return {
        status: defaultStatus,
        headers: { 'Content-Type': 'application/json', ...defaultHeaders },
        body: fallbackBody,
        resolvedFromState: false,
      };
    }
  }

  private extractQueryParams(request: ProxyRequest): Record<string, unknown> {
    try {
      const url = new URL(request.url, 'http://localhost');
      const params: Record<string, unknown> = {};
      url.searchParams.forEach((value, key) => {
        if (
          key !== '__proto__' &&
          key !== 'constructor' &&
          key !== 'prototype'
        ) {
          params[key] = value;
        }
      });
      return params;
    } catch {
      return request.query ?? {};
    }
  }
}
