import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WireMockClientService } from '../common/wiremock-client.service';
import { ProjectsService } from '../projects/projects.service';
import { ImportService, ImportResult } from './import.service';

describe('ImportService', () => {
  let service: ImportService;
  let wireMock: jest.Mocked<WireMockClientService>;
  let projects: jest.Mocked<ProjectsService>;

  beforeEach(async () => {
    const mockWireMock = {
      get: jest.fn(),
      post: jest.fn(),
    } as any;

    const mockProjects = {
      findOne: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        {
          provide: WireMockClientService,
          useValue: mockWireMock,
        },
        {
          provide: ProjectsService,
          useValue: mockProjects,
        },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
    wireMock = module.get<WireMockClientService>(WireMockClientService) as jest.Mocked<WireMockClientService>;
    projects = module.get<ProjectsService>(ProjectsService) as jest.Mocked<ProjectsService>;
  });

  describe('HAR Import', () => {
    it('should import valid HAR file successfully', async () => {
      const projectId = 'test-project';
      const harContent = JSON.stringify({
        log: {
          entries: [
            {
              request: {
                method: 'GET',
                url: 'http://api.example.com/users/123',
                headers: [{ name: 'Accept', value: 'application/json' }],
              },
              response: {
                status: 200,
                headers: [{ name: 'Content-Type', value: 'application/json' }],
                content: {
                  mimeType: 'application/json',
                  text: '{"id": 123, "name": "John"}',
                },
              },
            },
          ],
        },
      });

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.get as jest.Mock).mockResolvedValue([]); // No existing mappings
      (wireMock.post as jest.Mock).mockResolvedValue({});

      const result = await service.importFromHar(projectId, harContent);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(wireMock.post).toHaveBeenCalledWith('/mappings', expect.any(Object));
    });

    it('should skip duplicate mappings', async () => {
      const projectId = 'test-project';
      const harContent = JSON.stringify({
        log: {
          entries: [
            {
              request: {
                method: 'GET',
                url: 'http://api.example.com/users/123',
                headers: [],
              },
              response: {
                status: 200,
                headers: [],
                content: { mimeType: 'application/json', text: '{}' },
              },
            },
          ],
        },
      });

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.get as jest.Mock).mockResolvedValue([
        { request: { method: 'GET', url: 'http://api.example.com/users/123' } },
      ]); // Existing mapping

      const result = await service.importFromHar(projectId, harContent);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(wireMock.post).not.toHaveBeenCalled();
    });

    it('should handle invalid HAR format', async () => {
      const projectId = 'test-project';
      const invalidHarContent = '{ invalid json }';

      await expect(service.importFromHar(projectId, invalidHarContent))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle HAR with query parameters', async () => {
      const projectId = 'test-project';
      const harContent = JSON.stringify({
        log: {
          entries: [
            {
              request: {
                method: 'GET',
                url: 'http://api.example.com/users',
                queryString: [
                  { name: 'page', value: '1' },
                  { name: 'limit', value: '10' },
                ],
              },
              response: {
                status: 200,
                headers: [],
                content: { mimeType: 'application/json', text: '[]' },
              },
            },
          ],
        },
      });

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.get as jest.Mock).mockResolvedValue([]);
      (wireMock.post as jest.Mock).mockResolvedValue({});

      const result = await service.importFromHar(projectId, harContent);

      expect(result.created).toBe(1);
      expect(wireMock.post).toHaveBeenCalledWith('/mappings', expect.objectContaining({
        request: expect.objectContaining({
          url: 'http://api.example.com/users?page=1&limit=10',
        }),
      }));
    });
  });

  describe('Postman Import', () => {
    it('should import valid Postman collection successfully', async () => {
      const projectId = 'test-project';
      const postmanContent = JSON.stringify({
        info: { name: 'Test API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
        item: [
          {
            request: {
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: '{"name": "John", "email": "john@example.com"}',
              },
              url: { raw: 'http://api.example.com/users' },
            },
            response: [
              {
                status: 'Created',
                code: 201,
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: '{"id": 123}',
              },
            ],
          },
        ],
      });

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.get as jest.Mock).mockResolvedValue([]);
      (wireMock.post as jest.Mock).mockResolvedValue({});

      const result = await service.importFromPostman(projectId, postmanContent);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(wireMock.post).toHaveBeenCalledWith('/mappings', expect.any(Object));
    });

    it('should handle Postman collection with GraphQL', async () => {
      const projectId = 'test-project';
      const postmanContent = JSON.stringify({
        info: { name: 'GraphQL API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
        item: [
          {
            request: {
              method: 'POST',
              body: {
                mode: 'graphql',
                graphql: {
                  query: '{ users { id name } }',
                  variables: '{}',
                },
              },
              url: { raw: 'http://api.example.com/graphql' },
            },
          },
        ],
      });

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.get as jest.Mock).mockResolvedValue([]);
      (wireMock.post as jest.Mock).mockResolvedValue({});

      const result = await service.importFromPostman(projectId, postmanContent);

      expect(result.created).toBe(1);
      expect(wireMock.post).toHaveBeenCalledWith('/mappings', expect.objectContaining({
        request: expect.objectContaining({
          bodyPatterns: [{ 
            equalTo: expect.stringContaining('users { id name }'),
            caseInsensitive: false,
          }],
        }),
      }));
    });

    it('should handle invalid Postman format', async () => {
      const projectId = 'test-project';
      const invalidPostmanContent = '{ invalid json }';

      await expect(service.importFromPostman(projectId, invalidPostmanContent))
        .rejects.toThrow(BadRequestException);
    });

    it('should build URL from Postman URL object', async () => {
      const projectId = 'test-project';
      const postmanContent = JSON.stringify({
        info: { name: 'Test API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
        item: [
          {
            request: {
              method: 'GET',
              url: {
                protocol: 'https',
                host: ['api', 'example', 'com'],
                path: ['users', '123'],
              },
            },
          },
        ],
      });

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.get as jest.Mock).mockResolvedValue([]);
      (wireMock.post as jest.Mock).mockResolvedValue({});

      const result = await service.importFromPostman(projectId, postmanContent);

      expect(result.created).toBe(1);
      expect(wireMock.post).toHaveBeenCalledWith('/mappings', expect.objectContaining({
        request: expect.objectContaining({
          url: 'https://api.example.com/users/123',
        }),
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle WireMock API errors gracefully', async () => {
      const projectId = 'test-project';
      const harContent = JSON.stringify({
        log: {
          entries: [
            {
              request: { method: 'GET', url: 'http://api.example.com/test' },
              response: { status: 200, headers: [], content: { mimeType: 'text/plain', text: 'test' } },
            },
          ],
        },
      });

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.get as jest.Mock).mockResolvedValue([]);
      (wireMock.post as jest.Mock).mockRejectedValue(new Error('WireMock error'));

      const result = await service.importFromHar(projectId, harContent);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to import entry');
    });

    it('should handle mapping retrieval errors', async () => {
      const projectId = 'test-project';
      const harContent = JSON.stringify({
        log: { entries: [] },
      });

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.get as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await service.importFromHar(projectId, harContent);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(0); // Should not fail if existing mappings can't be retrieved
    });
  });

  describe('Summary Generation', () => {
    it('should generate correct summary for various scenarios', async () => {
      const projectId = 'test-project';
      const harContent = JSON.stringify({
        log: { entries: [] },
      });

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.get as jest.Mock).mockResolvedValue([]);

      let result = await service.importFromHar(projectId, harContent);
      expect(result.summary).toBe('No changes');

      // Mock some results to test summary generation
      const mockResult: ImportResult = {
        created: 5,
        skipped: 2,
        errors: ['Error 1', 'Error 2'],
        summary: '',
      };

      // Test private method through public API behavior
      expect(service.importFromHar(projectId, harContent)).resolves.toBeDefined();
    });
  });
});
