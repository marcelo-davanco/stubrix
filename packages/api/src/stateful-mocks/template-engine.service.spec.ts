import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TemplateEngineService } from './template-engine.service';
import type { TemplateContext } from './template-engine.service';

const sampleContext: TemplateContext = {
  state: {
    rows: [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
    ],
    rowCount: 2,
    queryTimeMs: 8,
    fromCache: false,
  },
  request: {
    method: 'GET',
    url: '/api/users',
    query: { page: '1' },
    headers: { accept: 'application/json' },
  },
};

describe('TemplateEngineService', () => {
  let service: TemplateEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateEngineService],
    }).compile();

    service = module.get<TemplateEngineService>(TemplateEngineService);
  });

  describe('render()', () => {
    it('should render state.rows via {{json}} helper', () => {
      const template = '{{json state.rows}}';
      const result = service.render(template, sampleContext);
      expect(JSON.parse(result)).toEqual(sampleContext.state.rows);
    });

    it('should render state.rowCount', () => {
      const result = service.render('{{state.rowCount}}', sampleContext);
      expect(result).toBe('2');
    });

    it('should render request.method', () => {
      const result = service.render('{{request.method}}', sampleContext);
      expect(result).toBe('GET');
    });

    it('should render {{pick}} helper — first element', () => {
      const result = service.render('{{json (pick state.rows 0)}}', sampleContext);
      const parsed = JSON.parse(result);
      expect(parsed.name).toBe('Alice');
    });

    it('should render {{first}} helper', () => {
      const result = service.render('{{json (first state.rows)}}', sampleContext);
      const parsed = JSON.parse(result);
      expect(parsed.name).toBe('Alice');
    });

    it('should render {{last}} helper', () => {
      const result = service.render('{{json (last state.rows)}}', sampleContext);
      const parsed = JSON.parse(result);
      expect(parsed.name).toBe('Bob');
    });

    it('should render full JSON object template', () => {
      const template = '{ "users": {{json state.rows}}, "count": {{state.rowCount}} }';
      const result = service.render(template, sampleContext);
      const parsed = JSON.parse(result);
      expect(parsed.count).toBe(2);
      expect(parsed.users).toHaveLength(2);
    });

    it('should render with empty rows context', () => {
      const emptyCtx: TemplateContext = { ...sampleContext, state: { ...sampleContext.state, rows: [], rowCount: 0 } };
      const result = service.render('{{state.rowCount}}', emptyCtx);
      expect(result).toBe('0');
    });

    it('should throw BadRequestException for invalid template syntax', () => {
      expect(() => service.render('{{#if}}broken', sampleContext)).toThrow(BadRequestException);
    });
  });

  describe('validate()', () => {
    it('should return valid:true for correct template', () => {
      const result = service.validate('{{json state.rows}}');
      expect(result.valid).toBe(true);
    });

    it('should return valid:false with error for malformed template', () => {
      const result = service.validate('{{#if}}{{/each}}');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('buildContext()', () => {
    it('should build context from StateQueryResult and request', () => {
      const stateResult = { rows: [{ id: 1 }], rowCount: 1, queryTimeMs: 5, fromCache: false };
      const ctx = service.buildContext(stateResult, { method: 'GET', url: '/test' });
      expect(ctx.state.rows).toHaveLength(1);
      expect(ctx.request.method).toBe('GET');
    });
  });
});
