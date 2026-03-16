import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ProjectBuilder } from '../test/builders';
import { WireMockClientService } from '../common/wiremock-client.service';
import { ProjectsService } from '../projects/projects.service';
import { ImportService } from './import.service';

const PROJECT_FIXTURE = ProjectBuilder.create().build();

describe('ImportService', () => {
  let service: ImportService;
  let wireMock: DeepMocked<WireMockClientService>;
  let projects: DeepMocked<ProjectsService>;

  beforeEach(async () => {
    const mockWireMock = createMock<WireMockClientService>();
    const mockProjects = createMock<ProjectsService>();

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
    wireMock = module.get<DeepMocked<WireMockClientService>>(
      WireMockClientService,
    );
    projects = module.get<DeepMocked<ProjectsService>>(ProjectsService);
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

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]); // No existing mappings
      wireMock.post.mockResolvedValue({});

      const result = await service.importFromHar(projectId, harContent);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(wireMock.post).toHaveBeenCalledWith(
        '/mappings',
        expect.any(Object),
      );
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

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([
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

      await expect(
        service.importFromHar(projectId, invalidHarContent),
      ).rejects.toThrow(BadRequestException);
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

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockResolvedValue({});

      const result = await service.importFromHar(projectId, harContent);

      expect(result.created).toBe(1);
      expect(wireMock.post).toHaveBeenCalledWith(
        '/mappings',
        expect.objectContaining({
          request: expect.objectContaining({
            url: 'http://api.example.com/users?page=1&limit=10',
          }),
        }),
      );
    });
  });

  describe('Postman Import', () => {
    it('should import valid Postman collection successfully', async () => {
      const projectId = 'test-project';
      const postmanContent = JSON.stringify({
        info: {
          name: 'Test API',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
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

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockResolvedValue({});

      const result = await service.importFromPostman(projectId, postmanContent);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(wireMock.post).toHaveBeenCalledWith(
        '/mappings',
        expect.any(Object),
      );
    });

    it('should handle Postman collection with GraphQL', async () => {
      const projectId = 'test-project';
      const postmanContent = JSON.stringify({
        info: {
          name: 'GraphQL API',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
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

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockResolvedValue({});

      const result = await service.importFromPostman(projectId, postmanContent);

      expect(result.created).toBe(1);
      expect(wireMock.post).toHaveBeenCalledWith(
        '/mappings',
        expect.objectContaining({
          request: expect.objectContaining({
            bodyPatterns: [
              {
                equalTo: expect.stringContaining('users { id name }'),
                caseInsensitive: false,
              },
            ],
          }),
        }),
      );
    });

    it('should handle invalid Postman format', async () => {
      const projectId = 'test-project';
      const invalidPostmanContent = '{ invalid json }';

      await expect(
        service.importFromPostman(projectId, invalidPostmanContent),
      ).rejects.toThrow(BadRequestException);
    });

    it('should build URL from Postman URL object', async () => {
      const projectId = 'test-project';
      const postmanContent = JSON.stringify({
        info: {
          name: 'Test API',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
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

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockResolvedValue({});

      const result = await service.importFromPostman(projectId, postmanContent);

      expect(result.created).toBe(1);
      expect(wireMock.post).toHaveBeenCalledWith(
        '/mappings',
        expect.objectContaining({
          request: expect.objectContaining({
            url: 'https://api.example.com/users/123',
          }),
        }),
      );
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
              response: {
                status: 200,
                headers: [],
                content: { mimeType: 'text/plain', text: 'test' },
              },
            },
          ],
        },
      });

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockRejectedValue(new Error('WireMock error'));

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

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockRejectedValue(new Error('API error'));

      const result = await service.importFromHar(projectId, harContent);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(0); // Should not fail if existing mappings can't be retrieved
    });
  });

  describe('Summary Generation', () => {
    it('should return "No changes" when entries is empty', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);

      const result = await service.importFromHar(
        projectId,
        JSON.stringify({ log: { entries: [] } }),
      );
      expect(result.summary).toBe('No changes');
    });

    it('should include created count in summary', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockResolvedValue({});

      const result = await service.importFromHar(
        projectId,
        JSON.stringify({
          log: {
            entries: [
              {
                request: {
                  method: 'GET',
                  url: '/api/summary-test',
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
        }),
      );

      expect(result.summary).toContain('1 created');
    });

    it('should include skipped count in summary', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([
        { request: { method: 'GET', url: '/api/dup' } },
      ]);

      const result = await service.importFromHar(
        projectId,
        JSON.stringify({
          log: {
            entries: [
              {
                request: { method: 'GET', url: '/api/dup', headers: [] },
                response: {
                  status: 200,
                  headers: [],
                  content: { mimeType: 'application/json', text: '{}' },
                },
              },
            ],
          },
        }),
      );

      expect(result.summary).toContain('skipped');
    });

    it('should include error count in summary', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockRejectedValue(new Error('WireMock unreachable'));

      const result = await service.importFromHar(
        projectId,
        JSON.stringify({
          log: {
            entries: [
              {
                request: { method: 'GET', url: '/api/fail', headers: [] },
                response: {
                  status: 200,
                  headers: [],
                  content: { mimeType: 'text/plain', text: '' },
                },
              },
            ],
          },
        }),
      );

      expect(result.summary).toContain('error');
    });
  });

  describe('HAR Import — edge cases', () => {
    it('should throw BadRequestException when har.log.entries is null', async () => {
      await expect(
        service.importFromHar('p', JSON.stringify({ log: { entries: null } })),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when har.log is missing', async () => {
      await expect(
        service.importFromHar('p', JSON.stringify({ log: null })),
      ).rejects.toThrow(BadRequestException);
    });

    it('should append query string with & when URL already contains ?', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockResolvedValue({});

      const result = await service.importFromHar(
        projectId,
        JSON.stringify({
          log: {
            entries: [
              {
                request: {
                  method: 'GET',
                  url: 'http://api.example.com/search?q=foo',
                  headers: [],
                  queryString: [{ name: 'page', value: '2' }],
                },
                response: {
                  status: 200,
                  headers: [],
                  content: { mimeType: 'application/json', text: '[]' },
                },
              },
            ],
          },
        }),
      );

      expect(result.created).toBe(1);
      expect(wireMock.post).toHaveBeenCalledWith(
        '/mappings',
        expect.objectContaining({
          request: expect.objectContaining({
            url: 'http://api.example.com/search?q=foo&page=2',
          }),
        }),
      );
    });

    it('should use empty string for response body when text is undefined', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockResolvedValue({});

      await service.importFromHar(
        projectId,
        JSON.stringify({
          log: {
            entries: [
              {
                request: { method: 'DELETE', url: '/api/item/1', headers: [] },
                response: {
                  status: 204,
                  headers: [],
                  content: { mimeType: 'application/json' },
                },
              },
            ],
          },
        }),
      );

      expect(wireMock.post).toHaveBeenCalledWith(
        '/mappings',
        expect.objectContaining({
          response: expect.objectContaining({ body: '' }),
        }),
      );
    });

    it('should skip unsafe header names (__proto__, constructor, prototype)', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockResolvedValue({});

      await service.importFromHar(
        projectId,
        JSON.stringify({
          log: {
            entries: [
              {
                request: {
                  method: 'GET',
                  url: '/api/safe',
                  headers: [
                    { name: '__proto__', value: 'attack' },
                    { name: 'constructor', value: 'attack' },
                    { name: 'Accept', value: 'application/json' },
                  ],
                },
                response: {
                  status: 200,
                  headers: [
                    { name: 'prototype', value: 'attack' },
                    { name: 'Content-Type', value: 'application/json' },
                  ],
                  content: { mimeType: 'application/json', text: '{}' },
                },
              },
            ],
          },
        }),
      );

      const postedMapping = wireMock.post.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      const reqHeaders = (
        postedMapping as { request: { headers: Record<string, string> } }
      ).request.headers;
      expect(reqHeaders['__proto__']).toBeUndefined();
      expect(reqHeaders['constructor']).toBeUndefined();
      expect(reqHeaders['Accept']).toBe('application/json');
    });
  });

  describe('Postman Import — edge cases', () => {
    it('should throw BadRequestException when collection has no item field', async () => {
      await expect(
        service.importFromPostman('p', JSON.stringify({ info: { name: 'x' } })),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect XML content type when raw body starts with <', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockResolvedValue({});

      await service.importFromPostman(
        projectId,
        JSON.stringify({
          info: { name: 'XML API', schema: '' },
          item: [
            {
              request: {
                method: 'POST',
                body: { mode: 'raw', raw: '<root><item>1</item></root>' },
                url: { raw: 'http://api.example.com/xml' },
              },
            },
          ],
        }),
      );

      expect(wireMock.post).toHaveBeenCalledWith(
        '/mappings',
        expect.objectContaining({
          response: expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/xml',
            }),
          }),
        }),
      );
    });

    it('should skip graphql body when graphql field is missing', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockResolvedValue({});

      const result = await service.importFromPostman(
        projectId,
        JSON.stringify({
          info: { name: 'GraphQL no-op', schema: '' },
          item: [
            {
              request: {
                method: 'POST',
                body: { mode: 'graphql' },
                url: { raw: 'http://api.example.com/graphql' },
              },
            },
          ],
        }),
      );

      expect(result.created).toBe(1);
      expect(wireMock.post).toHaveBeenCalledWith(
        '/mappings',
        expect.objectContaining({
          request: expect.objectContaining({ bodyPatterns: undefined }),
        }),
      );
    });

    it('should default to status 200 when response array is empty', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockResolvedValue({});

      await service.importFromPostman(
        projectId,
        JSON.stringify({
          info: { name: 'Test', schema: '' },
          item: [
            {
              request: {
                method: 'GET',
                url: { raw: 'http://api.example.com/status' },
              },
              response: [],
            },
          ],
        }),
      );

      expect(wireMock.post).toHaveBeenCalledWith(
        '/mappings',
        expect.objectContaining({
          response: expect.objectContaining({ status: 200 }),
        }),
      );
    });

    it('should default protocol to https when building URL from parts without protocol', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockResolvedValue({});

      await service.importFromPostman(
        projectId,
        JSON.stringify({
          info: { name: 'Test', schema: '' },
          item: [
            {
              request: {
                method: 'GET',
                url: {
                  host: ['api', 'example', 'com'],
                  path: ['items'],
                },
              },
            },
          ],
        }),
      );

      expect(wireMock.post).toHaveBeenCalledWith(
        '/mappings',
        expect.objectContaining({
          request: expect.objectContaining({
            url: 'https://api.example.com/items',
          }),
        }),
      );
    });

    it('should skip unsafe Postman header keys', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post.mockResolvedValue({});

      await service.importFromPostman(
        projectId,
        JSON.stringify({
          info: { name: 'Test', schema: '' },
          item: [
            {
              request: {
                method: 'GET',
                header: [
                  { key: '__proto__', value: 'attack' },
                  { key: 'Authorization', value: 'Bearer token' },
                ],
                url: { raw: 'http://api.example.com/secure' },
              },
              response: [
                {
                  status: 'OK',
                  code: 200,
                  header: [{ key: 'prototype', value: 'attack' }],
                },
              ],
            },
          ],
        }),
      );

      const postedMapping = wireMock.post.mock.calls[0][1] as {
        request: { headers: Record<string, string> };
      };
      expect(postedMapping.request.headers['__proto__']).toBeUndefined();
      expect(postedMapping.request.headers['Authorization']).toBe(
        'Bearer token',
      );
    });

    it('should handle Postman item error and continue processing', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue([]);
      wireMock.post
        .mockRejectedValueOnce(new Error('First item failed'))
        .mockResolvedValueOnce({});

      const result = await service.importFromPostman(
        projectId,
        JSON.stringify({
          info: { name: 'Test', schema: '' },
          item: [
            {
              request: {
                method: 'GET',
                url: { raw: 'http://api.example.com/first' },
              },
            },
            {
              request: {
                method: 'GET',
                url: { raw: 'http://api.example.com/second' },
              },
            },
          ],
        }),
      );

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });
});
