import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { StatefulMocksService } from './stateful-mocks.service';
import { TemplateEngineService } from './template-engine.service';
import { StateResolverService } from './state-resolver.service';
import { WireMockTransformerProxyService } from './wiremock-transformer-proxy.service';
import { ConfigService } from '@nestjs/config';
import type { CreateStatefulMockDto } from './dto/create-stateful-mock.dto';

const mockConfigService = {
  get: jest.fn().mockReturnValue(undefined),
};

const mockTemplateEngine = {
  validate: jest.fn().mockReturnValue({ valid: true }),
  render: jest.fn().mockReturnValue('{"users":[]}'),
  buildContext: jest.fn().mockReturnValue({ state: { rows: [], rowCount: 0, queryTimeMs: 0, fromCache: false }, request: {} }),
};

const mockStateResolver = {
  resolve: jest.fn(),
  invalidateCache: jest.fn(),
};

const mockProxy = {
  resolve: jest.fn(),
};

const validCreateDto: CreateStatefulMockDto = {
  name: 'List Users',
  description: 'Returns users from DB',
  request: { method: 'GET', urlPath: '/api/users' },
  stateConfig: {
    stateEngine: 'postgres',
    stateQuery: 'SELECT * FROM users',
    stateTemplate: '{ "users": {{json state.rows}}, "count": {{state.rowCount}} }',
  },
  response: { status: 200 },
};

describe('StatefulMocksService', () => {
  let service: StatefulMocksService;
  let storageDir: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatefulMocksService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TemplateEngineService, useValue: mockTemplateEngine },
        { provide: StateResolverService, useValue: mockStateResolver },
        { provide: WireMockTransformerProxyService, useValue: mockProxy },
      ],
    }).compile();

    service = module.get<StatefulMocksService>(StatefulMocksService);
    storageDir = (service as unknown as { storageDir: string }).storageDir;
    fs.mkdirSync(storageDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(storageDir)) {
      for (const f of fs.readdirSync(storageDir)) {
        fs.unlinkSync(`${storageDir}/${f}`);
      }
    }
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('should create a stateful mock and persist it to disk', () => {
      const result = service.create(validCreateDto);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('List Users');
      expect(result.stateConfig.stateEngine).toBe('postgres');
      expect(result.createdAt).toBeDefined();
      expect(fs.existsSync(`${storageDir}/${result.id}.json`)).toBe(true);
    });

    it('should throw BadRequestException when template is invalid', () => {
      mockTemplateEngine.validate.mockReturnValueOnce({ valid: false, error: 'Unexpected token' });

      expect(() => service.create(validCreateDto)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no URL field is provided', () => {
      const dto: CreateStatefulMockDto = {
        ...validCreateDto,
        request: { method: 'GET' },
      };
      expect(() => service.create(dto)).toThrow(BadRequestException);
    });
  });

  describe('findAll()', () => {
    it('should return empty array when no mocks exist', () => {
      expect(service.findAll()).toEqual([]);
    });

    it('should return all persisted mocks', () => {
      service.create(validCreateDto);
      service.create({ ...validCreateDto, name: 'Mock 2' });

      const results = service.findAll();
      expect(results).toHaveLength(2);
    });
  });

  describe('findOne()', () => {
    it('should return the mock by id', () => {
      const created = service.create(validCreateDto);
      const found = service.findOne(created.id);
      expect(found.id).toBe(created.id);
    });

    it('should throw NotFoundException for unknown id', () => {
      expect(() => service.findOne('non-existent-id')).toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('should update name and description', () => {
      const created = service.create(validCreateDto);
      const updated = service.update(created.id, { name: 'Updated Name', description: 'New desc' });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('New desc');
      expect(updated.stateConfig.stateEngine).toBe('postgres');
    });

    it('should throw BadRequestException when updating with invalid template', () => {
      const created = service.create(validCreateDto);
      mockTemplateEngine.validate.mockReturnValueOnce({ valid: false, error: 'Bad template' });

      expect(() =>
        service.update(created.id, {
          stateConfig: { ...validCreateDto.stateConfig, stateTemplate: '{{#bad' },
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw NotFoundException when mock does not exist', () => {
      expect(() => service.update('unknown', { name: 'X' })).toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('should delete the mock file from disk', () => {
      const created = service.create(validCreateDto);
      service.remove(created.id);
      expect(fs.existsSync(`${storageDir}/${created.id}.json`)).toBe(false);
    });

    it('should throw NotFoundException for unknown id', () => {
      expect(() => service.remove('bad-id')).toThrow(NotFoundException);
    });

    it('should invalidate cache on removal', () => {
      const created = service.create(validCreateDto);
      service.remove(created.id);
      expect(mockStateResolver.invalidateCache).toHaveBeenCalledWith(created.id);
    });
  });

  describe('test()', () => {
    it('should call proxy.resolve and return structured response', async () => {
      const created = service.create(validCreateDto);
      mockProxy.resolve.mockResolvedValueOnce({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: '{"users":[]}',
        resolvedFromState: true,
        stateQueryTimeMs: 12,
        fromCache: false,
      });

      const result = await service.test(created.id);
      expect(result.resolvedFromState).toBe(true);
      expect(result.response.body).toBe('{"users":[]}');
      expect(result.stateQueryTimeMs).toBe(12);
    });
  });

  describe('preview()', () => {
    it('should return template and sample context', () => {
      const created = service.create(validCreateDto);
      const preview = service.preview(created.id);

      expect(preview.template).toBe(validCreateDto.stateConfig.stateTemplate);
      expect(preview.sampleContext).toBeDefined();
    });
  });
});
