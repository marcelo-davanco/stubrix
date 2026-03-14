import {
  Controller,
  Post,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { ImportService, ImportResult } from './import.service';
import { JobsService } from '../jobs/jobs.service';
import { QUEUE_NAMES } from '../jobs/queue.constants';
import type { JobAcceptedResponse } from '@stubrix/shared';

@ApiTags('import')
@Controller('projects/:projectId/import')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly jobsService: JobsService,
  ) {}

  @Post('har')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Import mocks from HAR file',
    description:
      'Import HTTP Archive (HAR) file and convert to WireMock mappings',
  })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiResponse({ status: 200, description: 'HAR file imported successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid HAR file or import failed',
  })
  async importHar(
    @Param('projectId') projectId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(json|har)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ): Promise<ImportResult> {
    if (!file.buffer) {
      throw new BadRequestException('No file content provided');
    }

    const harContent = file.buffer.toString('utf-8');
    return this.importService.importFromHar(projectId, harContent);
  }

  @Post('postman')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Import mocks from Postman collection',
    description:
      'Import Postman collection v2.1 and convert to WireMock mappings',
  })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiResponse({
    status: 200,
    description: 'Postman collection imported successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid Postman collection or import failed',
  })
  async importPostman(
    @Param('projectId') projectId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: 'json' }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ): Promise<ImportResult> {
    if (!file.buffer) {
      throw new BadRequestException('No file content provided');
    }

    const postmanContent = file.buffer.toString('utf-8');
    return this.importService.importFromPostman(projectId, postmanContent);
  }

  @Post('har-raw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import mocks from HAR content',
    description: 'Import HAR content directly (without file upload)',
  })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiResponse({
    status: 200,
    description: 'HAR content imported successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid HAR content or import failed',
  })
  async importHarRaw(
    @Param('projectId') projectId: string,
    @Body('content') content: string,
  ): Promise<ImportResult> {
    if (!content || typeof content !== 'string') {
      throw new BadRequestException(
        'HAR content is required and must be a string',
      );
    }

    return this.importService.importFromHar(projectId, content);
  }

  @Post('postman-raw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import mocks from Postman collection content',
    description:
      'Import Postman collection content directly (without file upload)',
  })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiResponse({
    status: 200,
    description: 'Postman collection imported successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid Postman collection or import failed',
  })
  async importPostmanRaw(
    @Param('projectId') projectId: string,
    @Body('content') content: string,
  ): Promise<ImportResult> {
    if (!content || typeof content !== 'string') {
      throw new BadRequestException(
        'Postman collection content is required and must be a string',
      );
    }

    return this.importService.importFromPostman(projectId, content);
  }

  @Post('har-raw/async')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Import HAR content asynchronously via job queue' })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiResponse({ status: 202, description: 'Import job accepted' })
  async importHarRawAsync(
    @Param('projectId') projectId: string,
    @Body('content') content: string,
  ): Promise<JobAcceptedResponse> {
    if (!content || typeof content !== 'string') {
      throw new BadRequestException(
        'HAR content is required and must be a string',
      );
    }
    return this.jobsService.enqueue({
      type: 'import:har',
      queueName: QUEUE_NAMES.IMPORTS,
      payload: { projectId, content },
      priority: 'normal',
    });
  }

  @Post('postman-raw/async')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Import Postman collection asynchronously via job queue',
  })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiResponse({ status: 202, description: 'Import job accepted' })
  async importPostmanRawAsync(
    @Param('projectId') projectId: string,
    @Body('content') content: string,
  ): Promise<JobAcceptedResponse> {
    if (!content || typeof content !== 'string') {
      throw new BadRequestException(
        'Postman collection content is required and must be a string',
      );
    }
    return this.jobsService.enqueue({
      type: 'import:postman',
      queueName: QUEUE_NAMES.IMPORTS,
      payload: { projectId, content },
      priority: 'normal',
    });
  }
}
