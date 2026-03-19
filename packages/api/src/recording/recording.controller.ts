import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RecordingService } from './recording.service';
import { StartRecordingDto } from './dto/start-recording.dto';

@ApiTags('recording')
@Controller('projects/:projectId/recording')
export class RecordingController {
  constructor(private readonly recordingService: RecordingService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get recording status',
    description: 'Retrieve current recording status for a project',
  })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiResponse({
    status: 200,
    description: 'Recording status retrieved successfully',
  })
  getStatus(@Param('projectId') projectId: string) {
    return this.recordingService.getStatus(projectId);
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start recording',
    description: 'Start traffic recording for a project',
  })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiResponse({ status: 200, description: 'Recording started successfully' })
  @ApiResponse({ status: 400, description: 'Invalid recording configuration' })
  start(@Param('projectId') projectId: string, @Body() dto: StartRecordingDto) {
    return this.recordingService.start(projectId, dto);
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stop recording',
    description:
      'Stop traffic recording for a project with optional URL pattern filtering',
  })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiQuery({
    name: 'includePatterns',
    required: false,
    description: 'URL patterns to include (comma-separated)',
    example: '/api/users/*,/api/orders/**',
  })
  @ApiQuery({
    name: 'excludePatterns',
    required: false,
    description: 'URL patterns to exclude (comma-separated)',
    example: '/api/health,/api/metrics/*',
  })
  @ApiResponse({ status: 200, description: 'Recording stopped successfully' })
  stop(
    @Param('projectId') projectId: string,
    @Query('includePatterns') includePatterns?: string,
    @Query('excludePatterns') excludePatterns?: string,
  ) {
    const include = includePatterns
      ? includePatterns.split(',').map((p) => p.trim())
      : undefined;
    const exclude = excludePatterns
      ? excludePatterns.split(',').map((p) => p.trim())
      : undefined;

    return this.recordingService.stop(projectId, include, exclude);
  }

  @Post('snapshot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Take recording snapshot',
    description:
      'Create a snapshot of current recorded mocks with optional URL pattern filtering',
  })
  @ApiParam({ name: 'projectId', description: 'Project identifier' })
  @ApiQuery({
    name: 'includePatterns',
    required: false,
    description: 'URL patterns to include (comma-separated)',
    example: '/api/users/*,/api/orders/**',
  })
  @ApiQuery({
    name: 'excludePatterns',
    required: false,
    description: 'URL patterns to exclude (comma-separated)',
    example: '/api/health,/api/metrics/*',
  })
  @ApiResponse({ status: 200, description: 'Snapshot created successfully' })
  snapshot(
    @Param('projectId') projectId: string,
    @Query('includePatterns') includePatterns?: string,
    @Query('excludePatterns') excludePatterns?: string,
  ) {
    const include = includePatterns
      ? includePatterns.split(',').map((p) => p.trim())
      : undefined;
    const exclude = excludePatterns
      ? excludePatterns.split(',').map((p) => p.trim())
      : undefined;

    return this.recordingService.snapshot(projectId, include, exclude);
  }
}
