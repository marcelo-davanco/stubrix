import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ProjectBuilder, StartRecordingDtoBuilder } from '../test/builders';
import { WireMockClientService } from '../common/wiremock-client.service';
import { ProjectsService } from '../projects/projects.service';
import { RecordingService } from './recording.service';

const PROJECT_FIXTURE = ProjectBuilder.create().build();
const PROJECT_WITH_TARGET_FIXTURE = ProjectBuilder.create()
  .withProxyTarget('https://api.example.com')
  .build();

describe('RecordingService - URL Pattern Filters', () => {
  let service: RecordingService;
  let wireMock: DeepMocked<WireMockClientService>;
  let projects: DeepMocked<ProjectsService>;

  beforeEach(async () => {
    const mockConfigService = createMock<ConfigService>({
      get: jest.fn().mockReturnValue('/mocks'),
    });
    const mockWireMock = createMock<WireMockClientService>();
    const mockProjects = createMock<ProjectsService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordingService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
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

    service = module.get<RecordingService>(RecordingService);
    wireMock = module.get<DeepMocked<WireMockClientService>>(
      WireMockClientService,
    );
    projects = module.get<DeepMocked<ProjectsService>>(ProjectsService);
  });

  describe('start with filters', () => {
    it('should start recording with include patterns', async () => {
      const projectId = 'test-project';
      const dto = StartRecordingDtoBuilder.create()
        .withIncludePatterns(['/api/users/*', '/api/orders/**'])
        .build();

      projects.findOne.mockReturnValue(PROJECT_WITH_TARGET_FIXTURE);
      wireMock.post.mockResolvedValue({});

      const result = await service.start(projectId, dto);

      expect(result.includePatterns).toEqual([
        '/api/users/*',
        '/api/orders/**',
      ]);
      expect(wireMock.post).toHaveBeenCalledWith(
        '/recordings/start',
        expect.any(Object),
      );
    });

    it('should start recording with exclude patterns', async () => {
      const projectId = 'test-project';
      const dto = StartRecordingDtoBuilder.create()
        .withExcludePatterns(['/api/health', '/api/metrics/*'])
        .build();

      projects.findOne.mockReturnValue(PROJECT_WITH_TARGET_FIXTURE);
      wireMock.post.mockResolvedValue({});

      const result = await service.start(projectId, dto);

      expect(result.excludePatterns).toEqual(['/api/health', '/api/metrics/*']);
    });

    it('should start recording with both include and exclude patterns', async () => {
      const projectId = 'test-project';
      const dto = StartRecordingDtoBuilder.create()
        .withIncludePatterns(['/api/users/*'])
        .withExcludePatterns(['/api/health'])
        .build();

      projects.findOne.mockReturnValue(PROJECT_WITH_TARGET_FIXTURE);
      wireMock.post.mockResolvedValue({});

      const result = await service.start(projectId, dto);

      expect(result.includePatterns).toEqual(['/api/users/*']);
      expect(result.excludePatterns).toEqual(['/api/health']);
    });
  });

  describe('stop with filters', () => {
    it('should stop recording and apply include filters', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({
        mappings: [{ id: 'mapping1' }, { id: 'mapping2' }, { id: 'mapping3' }],
      });

      // Mock mapping details
      wireMock.get
        .mockResolvedValueOnce({ request: { url: '/api/users/123' } }) // Should match
        .mockResolvedValueOnce({ request: { url: '/api/orders/456' } }) // Should not match
        .mockResolvedValueOnce({ request: { url: '/api/users/789' } }); // Should match

      wireMock.delete.mockResolvedValue({});

      const result = await service.stop(projectId, ['/api/users/*'], undefined);

      expect(result.message).toContain('filtered');
      expect(wireMock.delete).toHaveBeenCalledTimes(1); // Only /api/orders/456 should be deleted
    });

    it('should stop recording and apply exclude filters', async () => {
      const projectId = 'test-project';
      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({
        mappings: [{ id: 'mapping1' }, { id: 'mapping2' }],
      });

      // Mock mapping details
      wireMock.get
        .mockResolvedValueOnce({ request: { url: '/api/users/123' } }) // Should not be excluded
        .mockResolvedValueOnce({ request: { url: '/api/health' } }); // Should be excluded

      wireMock.delete.mockResolvedValue({});

      const result = await service.stop(projectId, undefined, ['/api/health']);

      expect(result.message).toContain('filtered');
      expect(wireMock.delete).toHaveBeenCalledTimes(1); // Only /api/health should be deleted
    });

    it('should stop recording without filters when none provided', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({
        mappings: [{ id: 'mapping1' }],
      });

      const result = await service.stop(projectId);

      expect(result.message).toBe('Recording stopped');
      expect(wireMock.delete).not.toHaveBeenCalled();
    });
  });

  describe('snapshot with filters', () => {
    it('should take snapshot and apply filters', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({
        mappings: [{ id: 'mapping1' }, { id: 'mapping2' }],
      });

      // Mock mapping details
      wireMock.get
        .mockResolvedValueOnce({ request: { url: '/api/users/123' } }) // Should match
        .mockResolvedValueOnce({ request: { url: '/api/orders/456' } }); // Should not match

      wireMock.delete.mockResolvedValue({});

      const result = await service.snapshot(
        projectId,
        ['/api/users/*'],
        undefined,
      );

      expect(result.message).toContain('filtered');
      expect(result.newMocks).toBe(1); // Only one mapping should remain
    });
  });

  describe('error handling', () => {
    it('should handle mapping retrieval errors gracefully', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({
        mappings: [{ id: 'mapping1' }],
      });

      wireMock.get.mockRejectedValue(new Error('Mapping not found'));

      const result = await service.stop(projectId, ['/api/users/*'], undefined);

      expect(result.newMocks).toBe(1); // Should keep mapping on error
    });

    it('should handle mapping deletion errors gracefully', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({
        mappings: [{ id: 'mapping1' }],
      });

      wireMock.get.mockResolvedValue({
        request: { url: '/api/orders/456' },
      });
      wireMock.delete.mockRejectedValue(new Error('Delete failed'));

      const result = await service.stop(projectId, ['/api/users/*'], undefined);

      expect(result.newMocks).toBe(1); // Should keep mapping on delete error
    });

    it('should keep mapping with no URL field in response', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({ mappings: [{ id: 'no-url-mapping' }] });
      wireMock.get.mockResolvedValue({ request: {} }); // no url or urlPattern

      const result = await service.stop(projectId, ['/api/users/*'], undefined);

      expect(result.newMocks).toBe(1);
      expect(wireMock.delete).not.toHaveBeenCalled();
    });

    it('should handle object-type urlPattern in mapping', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({ mappings: [{ id: 'obj-url' }] });
      wireMock.get.mockResolvedValue({
        request: { urlPattern: { urlPattern: '/api/users/results' } },
      });

      const result = await service.stop(projectId, ['/api/users/*'], undefined);

      expect(result.newMocks).toBe(1);
    });

    it('should handle unsupported urlPattern type by keeping the mapping', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({ mappings: [{ id: 'unsupported' }] });
      wireMock.get.mockResolvedValue({ request: { urlPattern: 42 } });

      const result = await service.stop(projectId, ['/api/users/*'], undefined);

      expect(result.newMocks).toBe(1);
    });
  });

  describe('getStatus()', () => {
    it('should return active=true when WireMock reports Recording status', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue({
        status: 'Recording',
        request: { targetBaseUrl: 'https://api.example.com' },
      });

      const result = await service.getStatus(projectId);

      expect(result.active).toBe(true);
      expect(result.proxyTarget).toBe('https://api.example.com');
    });

    it('should return active=false when WireMock reports non-Recording status', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue({ status: 'Stopped' });

      const result = await service.getStatus(projectId);

      expect(result.active).toBe(false);
      expect(result.proxyTarget).toBeNull();
    });

    it('should return active=false when WireMock is unreachable', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockRejectedValue(new Error('Connection refused'));

      const result = await service.getStatus(projectId);

      expect(result.active).toBe(false);
      expect(result.proxyTarget).toBeNull();
    });

    it('should return null proxyTarget when Recording but no targetBaseUrl', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.get.mockResolvedValue({
        status: 'Recording',
        request: {},
      });

      const result = await service.getStatus(projectId);

      expect(result.active).toBe(true);
      expect(result.proxyTarget).toBeNull();
    });
  });

  describe('start() — proxy target resolution', () => {
    it('should throw BadRequestException when neither dto nor project has proxyTarget', async () => {
      const projectId = 'no-proxy';

      projects.findOne.mockReturnValue(
        ProjectBuilder.create().withProxyTarget(null).build(),
      );

      const dto = StartRecordingDtoBuilder.create()
        .withProxyTarget(undefined as unknown as string)
        .build();
      delete dto.proxyTarget;

      await expect(service.start(projectId, dto)).rejects.toThrow(
        'No proxy target defined',
      );
    });

    it('should use project proxyTarget when dto does not supply one', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_WITH_TARGET_FIXTURE);
      wireMock.post.mockResolvedValue({});

      const dto = StartRecordingDtoBuilder.create()
        .withProxyTarget(undefined as unknown as string)
        .build();
      delete dto.proxyTarget;

      const result = await service.start(projectId, dto);

      expect(result.proxyTarget).toBe('https://api.example.com');
    });

    it('should prefer dto proxyTarget over project proxyTarget', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_WITH_TARGET_FIXTURE);
      wireMock.post.mockResolvedValue({});

      const dto = StartRecordingDtoBuilder.create()
        .withProxyTarget('https://override.api.com')
        .build();

      const result = await service.start(projectId, dto);

      expect(result.proxyTarget).toBe('https://override.api.com');
    });

    it('should set active=true and return projectId on success', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_WITH_TARGET_FIXTURE);
      wireMock.post.mockResolvedValue({});

      const result = await service.start(
        projectId,
        StartRecordingDtoBuilder.create().build(),
      );

      expect(result.active).toBe(true);
      expect(result.projectId).toBe(projectId);
    });
  });

  describe('snapshot() without filters', () => {
    it('should return correct newMocks count when no filters applied', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({
        mappings: [{ id: 'snap1' }, { id: 'snap2' }],
      });

      const result = await service.snapshot(projectId);

      expect(result.message).toBe('Snapshot taken');
      expect(result.newMocks).toBe(2);
    });

    it('should handle empty mappings response gracefully', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({ mappings: [] });

      const result = await service.snapshot(projectId);

      expect(result.newMocks).toBe(0);
    });

    it('should handle mappings with no id field', async () => {
      const projectId = 'test-project';

      projects.findOne.mockReturnValue(PROJECT_FIXTURE);
      wireMock.post.mockResolvedValue({
        mappings: [{ id: 'valid-id' }, {}],
      });

      const result = await service.snapshot(projectId);

      expect(result.newMocks).toBe(1);
    });
  });
});
