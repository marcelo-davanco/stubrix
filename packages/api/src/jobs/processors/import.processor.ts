import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobsService } from '../jobs.service';
import { ImportService } from '../../import/import.service';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.IMPORTS)
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly importService: ImportService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    const jobId = job.id as string;
    const jobType = job.name;

    this.logger.log(`Processing ${jobType} job ${jobId}`);

    await this.jobsService.updateJobStatus(jobId, 'processing');
    await this.jobsService.updateJobProgress(jobId, 10, 'Starting import...');

    try {
      let result: unknown;

      if (jobType === 'import:har') {
        result = await this.processHarImport(job);
      } else if (jobType === 'import:postman') {
        result = await this.processPostmanImport(job);
      } else {
        throw new Error(`Unknown import job type: ${jobType}`);
      }

      await this.jobsService.updateJobStatus(jobId, 'completed', {
        result,
        progress: 100,
        progressMessage: 'Import complete',
      });

      this.logger.log(`Job ${jobId} completed successfully`);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Job ${jobId} failed: ${errorMessage}`);

      await this.jobsService.updateJobStatus(jobId, 'failed', {
        error: errorMessage,
        progress: 0,
        progressMessage: `Import failed: ${errorMessage}`,
      });

      throw err;
    }
  }

  private async processHarImport(job: Job): Promise<unknown> {
    const jobId = job.id as string;
    const { projectId, content } = job.data as {
      projectId: string;
      content: string;
    };

    await this.jobsService.updateJobProgress(
      jobId,
      30,
      'Parsing HAR content...',
    );

    const result = await this.importService.importFromHar(projectId, content);

    await this.jobsService.updateJobProgress(
      jobId,
      90,
      `Imported ${result.created} mappings`,
    );

    return result;
  }

  private async processPostmanImport(job: Job): Promise<unknown> {
    const jobId = job.id as string;
    const { projectId, content } = job.data as {
      projectId: string;
      content: string;
    };

    await this.jobsService.updateJobProgress(
      jobId,
      30,
      'Parsing Postman collection...',
    );

    const result = await this.importService.importFromPostman(
      projectId,
      content,
    );

    await this.jobsService.updateJobProgress(
      jobId,
      90,
      `Imported ${result.created} mappings`,
    );

    return result;
  }
}
