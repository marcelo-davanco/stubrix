import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Sse,
  NotFoundException,
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
import { Observable, interval, concatMap, takeWhile, from } from 'rxjs';
import { JobsService } from './jobs.service';
import type {
  JobType,
  JobStatus,
  StubrixJob,
  ListJobsResponse,
  JobProgressEvent,
} from '@stubrix/shared';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'List async jobs with optional filters' })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by job type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Jobs list' })
  async list(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ListJobsResponse> {
    return this.jobsService.listJobs({
      type: type as JobType | undefined,
      status: status as JobStatus | undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job status and result' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJob(@Param('id') id: string): Promise<StubrixJob> {
    const job = await this.jobsService.getJob(id);
    if (!job) {
      throw new NotFoundException(`Job not found: ${id}`);
    }
    return job;
  }

  @Sse(':id/stream')
  @ApiOperation({
    summary: 'Stream job progress via Server-Sent Events (SSE)',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  stream(@Param('id') id: string): Observable<MessageEvent> {
    let done = false;

    return interval(1000).pipe(
      takeWhile(() => !done),
      concatMap(() =>
        from(
          this.jobsService.getJob(id).then((job): MessageEvent => {
            const isTerminal =
              !job ||
              job.status === 'completed' ||
              job.status === 'failed' ||
              job.status === 'cancelled';

            if (isTerminal) done = true;

            const event: JobProgressEvent = job
              ? {
                  jobId: job.id,
                  status: job.status,
                  progress: job.progress,
                  message: job.progressMessage,
                  result: job.status === 'completed' ? job.result : undefined,
                  error: job.status === 'failed' ? job.error : undefined,
                  timestamp: new Date().toISOString(),
                }
              : {
                  jobId: id,
                  status: 'failed',
                  progress: 0,
                  error: 'Job not found',
                  timestamp: new Date().toISOString(),
                };

            return { data: JSON.stringify(event) } as MessageEvent;
          }),
        ),
      ),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending or processing job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job cancelled' })
  @ApiResponse({
    status: 404,
    description: 'Job not found or already completed',
  })
  async cancelJob(@Param('id') id: string): Promise<{ cancelled: boolean }> {
    const cancelled = await this.jobsService.cancelJob(id);
    if (!cancelled) {
      throw new NotFoundException(`Job not found or already completed: ${id}`);
    }
    return { cancelled: true };
  }
}
