import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ServiceUnavailableException } from '@nestjs/common';
import {
  WireMockTransformerProxyService,
  ProxyRequest,
} from './wiremock-transformer-proxy.service';
import { StateResolverService } from './state-resolver.service';
import { TemplateEngineService } from './template-engine.service';
import { CreateStatefulMockDtoBuilder } from '../test/builders';
import type { StatefulMock } from './stateful-mocks.service';

function makeMock(overrides: Partial<StatefulMock> = {}): StatefulMock {
  const dto = CreateStatefulMockDtoBuilder.create()
    .withStateConfig({
      stateEngine: 'postgres',
      stateQuery: 'SELECT * FROM users',
      stateTemplate: '{"users": {{json state.rows}}}',
    })
    .withResponse({ status: 200 })
    .build();

  return {
    id: 'mock-id',
    name: dto.name,
    description: dto.description,
    request: dto.request,
    stateConfig: dto.stateConfig,
    response: { status: 200, headers: {} },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const BASE_REQUEST: ProxyRequest = {
  method: 'GET',
  url: 'http://localhost/api/users',
  query: {},
  headers: { Accept: 'application/json' },
  body: undefined,
};

const STATE_RESULT = {
  rows: [{ id: 1, name: 'Alice' }],
  rowCount: 1,
  queryTimeMs: 5,
  fromCache: false,
};

describe('WireMockTransformerProxyService', () => {
  let service: WireMockTransformerProxyService;
  let stateResolver: DeepMocked<StateResolverService>;
  let templateEngine: DeepMocked<TemplateEngineService>;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        WireMockTransformerProxyService,
        {
          provide: StateResolverService,
          useValue: createMock<StateResolverService>(),
        },
        {
          provide: TemplateEngineService,
          useValue: createMock<TemplateEngineService>(),
        },
      ],
    }).compile();

    service = module.get<WireMockTransformerProxyService>(
      WireMockTransformerProxyService,
    );
    stateResolver =
      module.get<DeepMocked<StateResolverService>>(StateResolverService);
    templateEngine = module.get<DeepMocked<TemplateEngineService>>(
      TemplateEngineService,
    );
  });

  afterEach(async () => {
    await module.close();
  });

  // ─── resolve() — happy path ───────────────────────────────────

  describe('resolve() — success', () => {
    it('should resolve state, render template and return structured response', async () => {
      stateResolver.resolve.mockResolvedValue(STATE_RESULT);
      templateEngine.buildContext.mockReturnValue({
        state: STATE_RESULT,
        request: { method: 'GET', url: '/api/users' },
      });
      templateEngine.render.mockReturnValue(
        '{"users":[{"id":1,"name":"Alice"}]}',
      );

      const result = await service.resolve(makeMock(), BASE_REQUEST);

      expect(result.resolvedFromState).toBe(true);
      expect(result.status).toBe(200);
      expect(result.body).toBe('{"users":[{"id":1,"name":"Alice"}]}');
      expect(result.stateQueryTimeMs).toBe(5);
      expect(result.fromCache).toBe(false);
    });

    it('should pass fromCache=true when result came from cache', async () => {
      stateResolver.resolve.mockResolvedValue({
        ...STATE_RESULT,
        fromCache: true,
      });
      templateEngine.buildContext.mockReturnValue({
        state: STATE_RESULT,
        request: { method: 'GET', url: '/api/users' },
      });
      templateEngine.render.mockReturnValue('{}');

      const result = await service.resolve(makeMock(), BASE_REQUEST);

      expect(result.fromCache).toBe(true);
    });

    it('should merge mock response headers with default Content-Type', async () => {
      stateResolver.resolve.mockResolvedValue(STATE_RESULT);
      templateEngine.buildContext.mockReturnValue({
        state: STATE_RESULT,
        request: { method: 'GET', url: '/api/users' },
      });
      templateEngine.render.mockReturnValue('{}');

      const mock = makeMock({
        response: {
          status: 201,
          headers: { 'X-Custom': 'header-value' },
        },
      });

      const result = await service.resolve(mock, BASE_REQUEST);

      expect(result.status).toBe(201);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['X-Custom']).toBe('header-value');
    });

    it('should default status to 200 when response is undefined', async () => {
      stateResolver.resolve.mockResolvedValue(STATE_RESULT);
      templateEngine.buildContext.mockReturnValue({
        state: STATE_RESULT,
        request: { method: 'GET', url: '/api/users' },
      });
      templateEngine.render.mockReturnValue('{}');

      const mock = makeMock({ response: undefined });
      const result = await service.resolve(mock, BASE_REQUEST);

      expect(result.status).toBe(200);
    });

    it('should pass query params extracted from request URL to stateResolver', async () => {
      stateResolver.resolve.mockResolvedValue(STATE_RESULT);
      templateEngine.buildContext.mockReturnValue({
        state: STATE_RESULT,
        request: { method: 'GET', url: '/api/users' },
      });
      templateEngine.render.mockReturnValue('{}');

      const requestWithQuery: ProxyRequest = {
        ...BASE_REQUEST,
        url: 'http://localhost/api/users?page=2&limit=10',
      };

      await service.resolve(makeMock(), requestWithQuery);

      expect(stateResolver.resolve).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParams: expect.objectContaining({ page: '2', limit: '10' }),
        }),
      );
    });
  });

  // ─── resolve() — fallback path ────────────────────────────────

  describe('resolve() — fallback on error', () => {
    it('should return fallback body when stateResolver throws', async () => {
      stateResolver.resolve.mockRejectedValue(
        new ServiceUnavailableException('DB down'),
      );
      const mock = makeMock({
        response: { status: 200, fallbackBody: '{"error":"db_down"}' },
      });

      const result = await service.resolve(mock, BASE_REQUEST);

      expect(result.resolvedFromState).toBe(false);
      expect(result.body).toBe('{"error":"db_down"}');
    });

    it('should use default fallback body when mock has none', async () => {
      stateResolver.resolve.mockRejectedValue(new Error('Connection refused'));
      const mock = makeMock({ response: { status: 200 } });

      const result = await service.resolve(mock, BASE_REQUEST);

      expect(result.resolvedFromState).toBe(false);
      expect(result.body).toBe('{"error":"state_unavailable"}');
    });

    it('should preserve original status on fallback', async () => {
      stateResolver.resolve.mockRejectedValue(new Error('Timeout'));
      const mock = makeMock({ response: { status: 503 } });

      const result = await service.resolve(mock, BASE_REQUEST);

      expect(result.status).toBe(503);
    });

    it('should return fallback when templateEngine.render throws', async () => {
      stateResolver.resolve.mockResolvedValue(STATE_RESULT);
      templateEngine.buildContext.mockReturnValue({
        state: STATE_RESULT,
        request: { method: 'GET', url: '/api/users' },
      });
      templateEngine.render.mockImplementation(() => {
        throw new Error('Template syntax error');
      });

      const result = await service.resolve(makeMock(), BASE_REQUEST);

      expect(result.resolvedFromState).toBe(false);
    });
  });

  // ─── extractQueryParams() — edge cases ───────────────────────

  describe('extractQueryParams() — URL parsing', () => {
    it('should fall back to request.query when URL cannot be parsed', async () => {
      // 'http://[unclosed-bracket' has an invalid host (unclosed IPv6 bracket)
      // → new URL() throws TypeError → catch branch returns request.query
      stateResolver.resolve.mockResolvedValue(STATE_RESULT);
      templateEngine.buildContext.mockReturnValue({
        state: STATE_RESULT,
        request: { method: 'GET', url: 'http://[unclosed' },
      });
      templateEngine.render.mockReturnValue('{}');

      const requestWithInvalidUrl: ProxyRequest = {
        method: 'GET',
        url: 'http://[unclosed',
        query: { fallback: 'value' },
      };

      await service.resolve(makeMock(), requestWithInvalidUrl);

      expect(stateResolver.resolve).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParams: expect.objectContaining({ fallback: 'value' }),
        }),
      );
    });

    it('should extract no params from URL without query string', async () => {
      stateResolver.resolve.mockResolvedValue(STATE_RESULT);
      templateEngine.buildContext.mockReturnValue({
        state: STATE_RESULT,
        request: { method: 'GET', url: '/api/users' },
      });
      templateEngine.render.mockReturnValue('{}');

      await service.resolve(makeMock(), {
        ...BASE_REQUEST,
        url: 'http://localhost/api/users',
      });

      expect(stateResolver.resolve).toHaveBeenCalledWith(
        expect.objectContaining({ queryParams: {} }),
      );
    });

    it('should pass stateConfig values (timeout, cacheTtl) to stateResolver', async () => {
      stateResolver.resolve.mockResolvedValue(STATE_RESULT);
      templateEngine.buildContext.mockReturnValue({
        state: STATE_RESULT,
        request: { method: 'GET', url: '/api/users' },
      });
      templateEngine.render.mockReturnValue('{}');

      const mock = makeMock({
        stateConfig: {
          stateEngine: 'postgres',
          stateQuery: 'SELECT 1',
          stateTemplate: '{}',
          queryTimeoutMs: 3000,
          cacheTtlSeconds: 30,
        },
      });

      await service.resolve(mock, BASE_REQUEST);

      expect(stateResolver.resolve).toHaveBeenCalledWith(
        expect.objectContaining({
          queryTimeoutMs: 3000,
          cacheTtlSeconds: 30,
        }),
      );
    });
  });
});
