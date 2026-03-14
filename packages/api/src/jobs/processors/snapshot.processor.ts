import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobsService } from '../jobs.service';
import { DbSnapshotsService } from '../../databases/db-snapshots.service';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.SNAPSHOTS)
export class SnapshotProcessor extends WorkerHost {
  private readonly logger = new Logger(SnapshotProcessor.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly snapshotsService: DbSnapshotsService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    const jobId = job.id as string;
    const jobType = job.name;

    this.logger.log(`Processing ${jobType} job ${jobId}`);

    await this.jobsService.updateJobStatus(jobId, 'processing');
    await this.jobsService.updateJobProgress(jobId, 10, 'Starting...');

    try {
      let result: unknown;

      if (jobType === 'snapshot:create') {
        result = await this.processCreate(job);
      } else if (jobType === 'snapshot:restore') {
        result = await this.processRestore(job);
      } else {
        throw new Error(`Unknown snapshot job type: ${jobType}`);
      }

      await this.jobsService.updateJobStatus(jobId, 'completed', {
        result,
        progress: 100,
        progressMessage: 'Done',
      });

      this.logger.log(`Job ${jobId} completed successfully`);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Job ${jobId} failed: ${errorMessage}`);

      await this.jobsService.updateJobStatus(jobId, 'failed', {
        error: errorMessage,
        progress: 0,
        progressMessage: `Failed: ${errorMessage}`,
      });

      throw err;
    }
  }

  private async processCreate(job: Job): Promise<unknown> {
    const jobId = job.id as string;
    const { dto, engineParam } = job.data as {
      dto: Record<string, unknown>;
      engineParam?: string;
    };

    await this.jobsService.updateJobProgress(
      jobId,
      30,
      'Preparing snapshot...',
    );

    const result = await this.snapshotsService.create(
      dto as Parameters<DbSnapshotsService['create']>[0],
      engineParam,
    );

    await this.jobsService.updateJobProgress(jobId, 90, 'Saving metadata...');
    return result;
  }

  private async processRestore(job: Job): Promise<unknown> {
    const jobId = job.id as string;
    const { name, dto, engineParam } = job.data as {
      name: string;
      dto: Record<string, unknown>;
      engineParam?: string;
    };

    await this.jobsService.updateJobProgress(
      jobId,
      30,
      'Restoring snapshot...',
    );

    const result = await this.snapshotsService.restore(
      name,
      dto as Parameters<DbSnapshotsService['restore']>[1],
      engineParam,
    );

    await this.jobsService.updateJobProgress(jobId, 90, 'Verifying...');
    return result;
  }
}
