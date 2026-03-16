import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService, ImportResult } from './import.service';

describe('ImportController', () => {
  let controller: ImportController;
  let importService: jest.Mocked<ImportService>;

  beforeEach(async () => {
    const mockImportService = {
      importFromHar: jest.fn(),
      importFromPostman: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [
        {
          provide: ImportService,
          useValue: mockImportService,
        },
      ],
    }).compile();

    controller = module.get<ImportController>(ImportController);
    importService = module.get<ImportService>(
      ImportService,
    ) as jest.Mocked<ImportService>;
  });

  describe('HAR Import', () => {
    it('should import HAR file successfully', async () => {
      const projectId = 'test-project';
      const mockFile = {
        buffer: Buffer.from(
          JSON.stringify({
            log: {
              entries: [
                {
                  request: {
                    method: 'GET',
                    url: 'http://api.example.com/test',
                  },
                  response: {
                    status: 200,
                    headers: [],
                    content: { mimeType: 'text/plain', text: 'test' },
                  },
                },
              ],
            },
          }),
        ),
        originalname: 'test.har',
        mimetype: 'application/json',
      } as Express.Multer.File;

      const expectedResult: ImportResult = {
        created: 1,
        skipped: 0,
        errors: [],
        summary: '1 created',
      };

      (importService.importFromHar as jest.Mock).mockResolvedValue(
        expectedResult,
      );

      const result = await controller.importHar(projectId, mockFile);

      expect(result).toEqual(expectedResult);
      expect(importService.importFromHar).toHaveBeenCalledWith(
        projectId,
        mockFile.buffer.toString('utf-8'),
      );
    });

    it('should handle missing file content', async () => {
      const projectId = 'test-project';
      const mockFile = {
        buffer: null,
        fieldname: 'file',
        originalname: 'test.har',
        encoding: '7bit',
        mimetype: 'application/json',
        size: 0,
        destination: '/tmp',
        filename: 'test.har',
        path: '/tmp/test.har',
      } as unknown as Express.Multer.File;

      await expect(controller.importHar(projectId, mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should import HAR raw content successfully', async () => {
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

      const expectedResult: ImportResult = {
        created: 1,
        skipped: 0,
        errors: [],
        summary: '1 created',
      };

      (importService.importFromHar as jest.Mock).mockResolvedValue(
        expectedResult,
      );

      const result = await controller.importHarRaw(projectId, harContent);

      expect(result).toEqual(expectedResult);
      expect(importService.importFromHar).toHaveBeenCalledWith(
        projectId,
        harContent,
      );
    });

    it('should handle invalid HAR content', async () => {
      const projectId = 'test-project';

      await expect(controller.importHarRaw(projectId, '')).rejects.toThrow(
        BadRequestException,
      );

      await expect(
        controller.importHarRaw(projectId, null as any),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.importHarRaw(projectId, 123 as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Postman Import', () => {
    it('should import Postman file successfully', async () => {
      const projectId = 'test-project';
      const mockFile = {
        buffer: Buffer.from(
          JSON.stringify({
            info: {
              name: 'Test API',
              schema:
                'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
            },
            item: [
              {
                request: {
                  method: 'GET',
                  url: { raw: 'http://api.example.com/test' },
                },
              },
            ],
          }),
        ),
        originalname: 'test.postman_collection.json',
        mimetype: 'application/json',
      } as Express.Multer.File;

      const expectedResult: ImportResult = {
        created: 1,
        skipped: 0,
        errors: [],
        summary: '1 created',
      };

      (importService.importFromPostman as jest.Mock).mockResolvedValue(
        expectedResult,
      );

      const result = await controller.importPostman(projectId, mockFile);

      expect(result).toEqual(expectedResult);
      expect(importService.importFromPostman).toHaveBeenCalledWith(
        projectId,
        mockFile.buffer.toString('utf-8'),
      );
    });

    it('should handle missing Postman file content', async () => {
      const projectId = 'test-project';
      const mockFile = {
        buffer: null,
        fieldname: 'file',
        originalname: 'test.postman_collection.json',
        encoding: '7bit',
        mimetype: 'application/json',
        size: 0,
        destination: '/tmp',
        filename: 'test.postman_collection.json',
        path: '/tmp/test.postman_collection.json',
      } as unknown as Express.Multer.File;

      await expect(
        controller.importPostman(projectId, mockFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should import Postman raw content successfully', async () => {
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
              url: { raw: 'http://api.example.com/test' },
            },
          },
        ],
      });

      const expectedResult: ImportResult = {
        created: 1,
        skipped: 0,
        errors: [],
        summary: '1 created',
      };

      (importService.importFromPostman as jest.Mock).mockResolvedValue(
        expectedResult,
      );

      const result = await controller.importPostmanRaw(
        projectId,
        postmanContent,
      );

      expect(result).toEqual(expectedResult);
      expect(importService.importFromPostman).toHaveBeenCalledWith(
        projectId,
        postmanContent,
      );
    });

    it('should handle invalid Postman content', async () => {
      const projectId = 'test-project';

      await expect(controller.importPostmanRaw(projectId, '')).rejects.toThrow(
        BadRequestException,
      );

      await expect(
        controller.importPostmanRaw(projectId, null as any),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.importPostmanRaw(projectId, 123 as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors', async () => {
      const projectId = 'test-project';
      const mockFile = {
        buffer: Buffer.from('invalid json'),
        originalname: 'test.har',
        mimetype: 'application/json',
      } as Express.Multer.File;

      (importService.importFromHar as jest.Mock).mockRejectedValue(
        new BadRequestException('Invalid HAR file'),
      );

      await expect(controller.importHar(projectId, mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle Postman service errors', async () => {
      const projectId = 'test-project';
      const postmanContent = 'invalid json';

      (importService.importFromPostman as jest.Mock).mockRejectedValue(
        new BadRequestException('Invalid Postman collection'),
      );

      await expect(
        controller.importPostmanRaw(projectId, postmanContent),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
