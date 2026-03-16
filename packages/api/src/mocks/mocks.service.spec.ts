import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { MocksService } from './mocks.service';
import { WireMockClientService } from '../common/wiremock-client.service';
import { ProjectsService } from '../projects/projects.service';
import { ProjectBuilder } from '../test/builders';

const TEST_DIR = join(__dirname, '..', '..', '..', 'tmp-test-mocks');
const MAPPINGS_DIR = join(TEST_DIR, 'mappings');
const FILES_DIR = join(TEST_DIR, '__files');

const PROJECT_FIXTURE = ProjectBuilder.create().build();

function cleanup() {
  try {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

function writeMappingFile(filename: string, content: object) {
  mkdirSync(MAPPINGS_DIR, { recursive: true });
  writeFileSync(join(MAPPINGS_DIR, filename), JSON.stringify(content, null, 2));
}

describe('MocksService', () => {
  let service: MocksService;
  let wireMock: DeepMocked<WireMockClientService>;
  let projects: DeepMocked<ProjectsService>;
  let module: TestingModule;

  beforeEach(async () => {
    cleanup();
    mkdirSync(TEST_DIR, { recursive: true });

    const config = createMock<ConfigService>();
    config.get.mockReturnValue(TEST_DIR);

    const mockWireMock = createMock<WireMockClientService>();
    const mockProjects = createMock<ProjectsService>();

    module = await Test.createTestingModule({
      providers: [
        MocksService,
        { provide: ConfigService, useValue: config },
        { provide: WireMockClientService, useValue: mockWireMock },
        { provide: ProjectsService, useValue: mockProjects },
      ],
    }).compile();

    service = module.get<MocksService>(MocksService);
    wireMock = module.get<DeepMocked<WireMockClientService>>(
      WireMockClientService,
    );
    projects = module.get<DeepMocked<ProjectsService>>(ProjectsService);
  });

  afterEach(async () => {
    await module.close();
    cleanup();
  });

  // ─── findAll ─────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return empty array when mappings dir does not exist', () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      expect(service.findAll('test-project')).toEqual([]);
    });

    it('should return only mocks belonging to the requested project', () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      writeMappingFile('get_users.json', {
        id: 'id-1',
        request: { method: 'GET', url: '/users' },
        response: { status: 200, body: '[]' },
        metadata: { project: 'test-project' },
      });
      writeMappingFile('other_project.json', {
        id: 'id-2',
        request: { method: 'GET', url: '/orders' },
        response: { status: 200 },
        metadata: { project: 'other-project' },
      });

      const result = service.findAll('test-project');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('id-1');
    });

    it('should skip malformed JSON files silently', () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      mkdirSync(MAPPINGS_DIR, { recursive: true });
      writeFileSync(join(MAPPINGS_DIR, 'corrupt.json'), 'not-valid-json');
      expect(service.findAll('test-project')).toEqual([]);
    });

    it('should default to "default" project when metadata is absent', () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      writeMappingFile('no_meta.json', {
        id: 'id-3',
        request: { method: 'GET', url: '/health' },
        response: { status: 200 },
      });

      const result = service.findAll('default');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('id-3');
    });

    it('should throw NotFoundException when project does not exist', () => {
      projects.findOne.mockImplementation(() => {
        throw new NotFoundException("Project 'bad-id' not found");
      });
      expect(() => service.findAll('bad-id')).toThrow(NotFoundException);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should return mock detail for existing mock', () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      writeMappingFile('mock.json', {
        id: 'mock-id',
        request: { method: 'POST', urlPath: '/api/data' },
        response: { status: 201, body: '{"ok":true}' },
        metadata: { project: 'test-project' },
      });

      const detail = service.findOne('test-project', 'mock-id');
      expect(detail.id).toBe('mock-id');
      expect(detail.mapping.response.status).toBe(201);
    });

    it('should include body when bodyFileName file exists', () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      mkdirSync(FILES_DIR, { recursive: true });
      writeFileSync(join(FILES_DIR, 'response.json'), '{"data":true}');
      writeMappingFile('with_body_file.json', {
        id: 'bf-id',
        request: { method: 'GET', url: '/body-file' },
        response: { status: 200, bodyFileName: 'response.json' },
        metadata: { project: 'test-project' },
      });

      const detail = service.findOne('test-project', 'bf-id');
      expect(detail.body).toBe('{"data":true}');
    });

    it('should return undefined body when bodyFileName does not exist on disk', () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      writeMappingFile('missing_body.json', {
        id: 'mb-id',
        request: { method: 'GET', url: '/missing' },
        response: { status: 200, bodyFileName: 'nonexistent.json' },
        metadata: { project: 'test-project' },
      });

      const detail = service.findOne('test-project', 'mb-id');
      expect(detail.body).toBeUndefined();
    });

    it('should throw NotFoundException when mock id does not exist', () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      expect(() => service.findOne('test-project', 'unknown-id')).toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when mock belongs to different project', () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      writeMappingFile('wrong_project.json', {
        id: 'wp-id',
        request: { method: 'GET', url: '/route' },
        response: { status: 200 },
        metadata: { project: 'other-project' },
      });

      expect(() => service.findOne('test-project', 'wp-id')).toThrow(
        NotFoundException,
      );
    });

    it('should resolve url from urlPattern when url is absent', () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      writeMappingFile('pattern_mock.json', {
        id: 'pat-id',
        request: { method: 'GET', urlPattern: '/api/items/.*' },
        response: { status: 200 },
        metadata: { project: 'test-project' },
      });

      const detail = service.findOne('test-project', 'pat-id');
      expect(detail.request.url).toBe('/api/items/.*');
    });
  });

  // ─── create ──────────────────────────────────────────────────

  describe('create()', () => {
    it('should create a mock and persist it to disk', async () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({});

      const detail = await service.create('test-project', {
        request: { method: 'GET', url: '/api/users' },
        response: { status: 200, body: '[]' },
      });

      expect(detail.id).toBeTruthy();
      expect(detail.mapping.request.url).toBe('/api/users');
      expect(detail.mapping.metadata?.project).toBe('test-project');
    });

    it('should create a mock even when WireMock is unavailable', async () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockRejectedValue(new Error('Connection refused'));

      const detail = await service.create('test-project', {
        request: { method: 'GET', urlPath: '/health' },
        response: { status: 200 },
      });

      expect(detail.id).toBeTruthy();
      expect(existsSync(join(MAPPINGS_DIR, detail.filename))).toBe(true);
    });

    it('should throw BadRequestException when no URL field is provided', async () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);

      await expect(
        service.create('test-project', {
          request: { method: 'GET' },
          response: { status: 200 },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use urlPattern when url is absent', async () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({});

      const detail = await service.create('test-project', {
        request: { method: 'GET', urlPattern: '/api/.*' },
        response: { status: 200 },
      });

      expect(detail.mapping.request.urlPattern).toBe('/api/.*');
    });

    it('should use urlPathPattern when other URL fields are absent', async () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({});

      const detail = await service.create('test-project', {
        request: { method: 'POST', urlPathPattern: '/api/v[0-9]+/data' },
        response: { status: 201 },
      });

      expect(detail.mapping.request.urlPathPattern).toBe('/api/v[0-9]+/data');
    });

    it('should call WireMock post with the mapping', async () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({});

      await service.create('test-project', {
        request: { method: 'DELETE', url: '/api/items/1' },
        response: { status: 204 },
      });

      expect(wireMock.post).toHaveBeenCalledWith(
        '/mappings',
        expect.objectContaining({ request: expect.any(Object) }),
      );
    });
  });

  // ─── update ──────────────────────────────────────────────────

  describe('update()', () => {
    it('should update mock response and persist to disk', async () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({});
      wireMock.put.mockResolvedValue({});

      const created = await service.create('test-project', {
        request: { method: 'GET', url: '/update-me' },
        response: { status: 200, body: 'original' },
      });

      const updated = await service.update('test-project', created.id, {
        response: { status: 201, body: 'updated' },
      });

      expect(updated.mapping.response.status).toBe(201);
      expect(updated.mapping.response.body).toBe('updated');
    });

    it('should update mock even when WireMock is unavailable', async () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({});
      wireMock.put.mockRejectedValue(new Error('WireMock down'));

      const created = await service.create('test-project', {
        request: { method: 'GET', url: '/resilient' },
        response: { status: 200 },
      });

      const updated = await service.update('test-project', created.id, {
        response: { status: 204 },
      });

      expect(updated.mapping.response.status).toBe(204);
    });

    it('should throw NotFoundException when mock id does not exist', async () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);

      await expect(
        service.update('test-project', 'ghost-id', {
          response: { status: 200 },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────

  describe('remove()', () => {
    it('should delete the mapping file from disk', async () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({});
      wireMock.delete.mockResolvedValue({});

      const created = await service.create('test-project', {
        request: { method: 'GET', url: '/delete-me' },
        response: { status: 200 },
      });
      const filePath = join(MAPPINGS_DIR, created.filename);
      expect(existsSync(filePath)).toBe(true);

      await service.remove('test-project', created.id);
      expect(existsSync(filePath)).toBe(false);
    });

    it('should call WireMock delete endpoint', async () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({});
      wireMock.delete.mockResolvedValue({});

      const created = await service.create('test-project', {
        request: { method: 'GET', url: '/to-delete' },
        response: { status: 200 },
      });

      await service.remove('test-project', created.id);
      expect(wireMock.delete).toHaveBeenCalledWith(`/mappings/${created.id}`);
    });

    it('should succeed even when WireMock is unavailable', async () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({});
      wireMock.delete.mockRejectedValue(new Error('WireMock down'));

      const created = await service.create('test-project', {
        request: { method: 'GET', url: '/wm-down' },
        response: { status: 200 },
      });

      await expect(
        service.remove('test-project', created.id),
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundException for nonexistent mock id', async () => {
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);

      await expect(service.remove('test-project', 'ghost')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
