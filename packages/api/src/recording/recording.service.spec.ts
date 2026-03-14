import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WireMockClientService } from '../common/wiremock-client.service';
import { ProjectsService } from '../projects/projects.service';
import { RecordingService } from './recording.service';
import { StartRecordingDto } from './dto/start-recording.dto';

describe('RecordingService - URL Pattern Filters', () => {
  let service: RecordingService;
  let configService: jest.Mocked<ConfigService>;
  let wireMock: jest.Mocked<WireMockClientService>;
  let projects: jest.Mocked<ProjectsService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('/mocks'),
    } as any;

    const mockWireMock = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
    } as any;

    const mockProjects = {
      findOne: jest.fn(),
    } as any;

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
    configService = module.get<ConfigService>(ConfigService) as jest.Mocked<ConfigService>;
    wireMock = module.get<WireMockClientService>(WireMockClientService) as jest.Mocked<WireMockClientService>;
    projects = module.get<ProjectsService>(ProjectsService) as jest.Mocked<ProjectsService>;
  });

  describe('start with filters', () => {
    it('should start recording with include patterns', async () => {
      const projectId = 'test-project';
      const dto: StartRecordingDto = {
        proxyTarget: 'https://api.example.com',
        includePatterns: ['/api/users/*', '/api/orders/**'],
      };

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId, proxyTarget: 'https://api.example.com' });
      (wireMock.post as jest.Mock).mockResolvedValue({});

      const result = await service.start(projectId, dto);

      expect(result.includePatterns).toEqual(['/api/users/*', '/api/orders/**']);
      expect(wireMock.post).toHaveBeenCalledWith('/recordings/start', expect.any(Object));
    });

    it('should start recording with exclude patterns', async () => {
      const projectId = 'test-project';
      const dto: StartRecordingDto = {
        proxyTarget: 'https://api.example.com',
        excludePatterns: ['/api/health', '/api/metrics/*'],
      };

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId, proxyTarget: 'https://api.example.com' });
      (wireMock.post as jest.Mock).mockResolvedValue({});

      const result = await service.start(projectId, dto);

      expect(result.excludePatterns).toEqual(['/api/health', '/api/metrics/*']);
    });

    it('should start recording with both include and exclude patterns', async () => {
      const projectId = 'test-project';
      const dto: StartRecordingDto = {
        proxyTarget: 'https://api.example.com',
        includePatterns: ['/api/users/*'],
        excludePatterns: ['/api/health'],
      };

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId, proxyTarget: 'https://api.example.com' });
      (wireMock.post as jest.Mock).mockResolvedValue({});

      const result = await service.start(projectId, dto);

      expect(result.includePatterns).toEqual(['/api/users/*']);
      expect(result.excludePatterns).toEqual(['/api/health']);
    });
  });

  describe('stop with filters', () => {
    it('should stop recording and apply include filters', async () => {
      const projectId = 'test-project';
      const mappingIds = ['mapping1', 'mapping2', 'mapping3'];

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.post as jest.Mock).mockResolvedValue({
        mappings: [{ id: 'mapping1' }, { id: 'mapping2' }, { id: 'mapping3' }],
      });

      // Mock mapping details
      (wireMock.get as jest.Mock)
        .mockResolvedValueOnce({ request: { url: '/api/users/123' } }) // Should match
        .mockResolvedValueOnce({ request: { url: '/api/orders/456' } }) // Should not match
        .mockResolvedValueOnce({ request: { url: '/api/users/789' } }); // Should match

      (wireMock.delete as jest.Mock).mockResolvedValue({});

      const result = await service.stop(projectId, ['/api/users/*'], undefined);

      expect(result.message).toContain('filtered');
      expect(wireMock.delete).toHaveBeenCalledTimes(1); // Only /api/orders/456 should be deleted
    });

    it('should stop recording and apply exclude filters', async () => {
      const projectId = 'test-project';
      const mappingIds = ['mapping1', 'mapping2'];

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.post as jest.Mock).mockResolvedValue({
        mappings: [{ id: 'mapping1' }, { id: 'mapping2' }],
      });

      // Mock mapping details
      (wireMock.get as jest.Mock)
        .mockResolvedValueOnce({ request: { url: '/api/users/123' } }) // Should not be excluded
        .mockResolvedValueOnce({ request: { url: '/api/health' } }); // Should be excluded

      (wireMock.delete as jest.Mock).mockResolvedValue({});

      const result = await service.stop(projectId, undefined, ['/api/health']);

      expect(result.message).toContain('filtered');
      expect(wireMock.delete).toHaveBeenCalledTimes(1); // Only /api/health should be deleted
    });

    it('should stop recording without filters when none provided', async () => {
      const projectId = 'test-project';

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.post as jest.Mock).mockResolvedValue({
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

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.post as jest.Mock).mockResolvedValue({
        mappings: [{ id: 'mapping1' }, { id: 'mapping2' }],
      });

      // Mock mapping details
      (wireMock.get as jest.Mock)
        .mockResolvedValueOnce({ request: { url: '/api/users/123' } }) // Should match
        .mockResolvedValueOnce({ request: { url: '/api/orders/456' } }); // Should not match

      (wireMock.delete as jest.Mock).mockResolvedValue({});

      const result = await service.snapshot(projectId, ['/api/users/*'], undefined);

      expect(result.message).toContain('filtered');
      expect(result.newMocks).toBe(1); // Only one mapping should remain
    });
  });

  describe('error handling', () => {
    it('should handle mapping retrieval errors gracefully', async () => {
      const projectId = 'test-project';

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.post as jest.Mock).mockResolvedValue({
        mappings: [{ id: 'mapping1' }],
      });

      (wireMock.get as jest.Mock).mockRejectedValue(new Error('Mapping not found'));

      const result = await service.stop(projectId, ['/api/users/*'], undefined);

      expect(result.newMocks).toBe(1); // Should keep mapping on error
    });

    it('should handle mapping deletion errors gracefully', async () => {
      const projectId = 'test-project';

      (projects.findOne as jest.Mock).mockReturnValue({ id: projectId });
      (wireMock.post as jest.Mock).mockResolvedValue({
        mappings: [{ id: 'mapping1' }],
      });

      (wireMock.get as jest.Mock).mockResolvedValue({ request: { url: '/api/orders/456' } });
      (wireMock.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const result = await service.stop(projectId, ['/api/users/*'], undefined);

      expect(result.newMocks).toBe(1); // Should keep mapping on delete error
    });
  });
});
