import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DbSnapshotsService } from './db-snapshots.service';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { UpdateSnapshotDto } from './dto/update-snapshot.dto';
import { RestoreSnapshotDto } from './dto/restore-snapshot.dto';
import { JobsService } from '../jobs/jobs.service';
import { QUEUE_NAMES } from '../jobs/queue.constants';
import type { JobAcceptedResponse } from '@stubrix/shared';

@ApiTags('databases')
@Controller('db')
export class DbSnapshotsController {
  constructor(
    private readonly snapshotsService: DbSnapshotsService,
    private readonly jobsService: JobsService,
  ) {}

  @Get('snapshots')
  list(@Query('projectId') projectId?: string) {
    return this.snapshotsService.list(projectId);
  }

  @Post('snapshots')
  async create(@Body() dto: CreateSnapshotDto) {
    return this.snapshotsService.create(dto);
  }

  @Post('engines/:engine/snapshots')
  async createByEngine(
    @Param('engine') engine: string,
    @Body() dto: CreateSnapshotDto,
  ) {
    return this.snapshotsService.create(dto, engine);
  }

  @Patch('snapshots/:name')
  update(@Param('name') name: string, @Body() dto: UpdateSnapshotDto) {
    return this.snapshotsService.update(name, dto);
  }

  @Delete('snapshots/:name')
  remove(@Param('name') name: string) {
    return this.snapshotsService.remove(name);
  }

  @Post('snapshots/:name/restore')
  restore(@Param('name') name: string, @Body() dto: RestoreSnapshotDto) {
    return this.snapshotsService.restore(name, dto);
  }

  @Post('engines/:engine/snapshots/:name/restore')
  restoreByEngine(
    @Param('engine') engine: string,
    @Param('name') name: string,
    @Body() dto: RestoreSnapshotDto,
  ) {
    return this.snapshotsService.restore(name, dto, engine);
  }

  @Post('snapshots/async')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Create snapshot asynchronously via job queue' })
  @ApiResponse({ status: 202, description: 'Job accepted' })
  async createAsync(
    @Body() dto: CreateSnapshotDto,
  ): Promise<JobAcceptedResponse> {
    return this.jobsService.enqueue({
      type: 'snapshot:create',
      queueName: QUEUE_NAMES.SNAPSHOTS,
      payload: { dto },
      priority: 'normal',
    });
  }

  @Post('engines/:engine/snapshots/async')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Create snapshot asynchronously for a specific engine',
  })
  @ApiResponse({ status: 202, description: 'Job accepted' })
  async createByEngineAsync(
    @Param('engine') engine: string,
    @Body() dto: CreateSnapshotDto,
  ): Promise<JobAcceptedResponse> {
    return this.jobsService.enqueue({
      type: 'snapshot:create',
      queueName: QUEUE_NAMES.SNAPSHOTS,
      payload: { dto, engineParam: engine },
      priority: 'normal',
    });
  }

  @Post('snapshots/:name/restore/async')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Restore snapshot asynchronously via job queue' })
  @ApiResponse({ status: 202, description: 'Job accepted' })
  async restoreAsync(
    @Param('name') name: string,
    @Body() dto: RestoreSnapshotDto,
  ): Promise<JobAcceptedResponse> {
    return this.jobsService.enqueue({
      type: 'snapshot:restore',
      queueName: QUEUE_NAMES.SNAPSHOTS,
      payload: { name, dto },
      priority: 'high',
    });
  }

  @Post('engines/:engine/snapshots/:name/restore/async')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Restore snapshot asynchronously for a specific engine',
  })
  @ApiResponse({ status: 202, description: 'Job accepted' })
  async restoreByEngineAsync(
    @Param('engine') engine: string,
    @Param('name') name: string,
    @Body() dto: RestoreSnapshotDto,
  ): Promise<JobAcceptedResponse> {
    return this.jobsService.enqueue({
      type: 'snapshot:restore',
      queueName: QUEUE_NAMES.SNAPSHOTS,
      payload: { name, dto, engineParam: engine },
      priority: 'high',
    });
  }
}
