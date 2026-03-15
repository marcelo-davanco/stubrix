import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobsService } from '../jobs.service';
import { ScenariosService } from '../../scenarios/scenarios.service';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.SCENARIOS)
export class ScenarioProcessor extends WorkerHost {
  private readonly logger = new Logger(ScenarioProcessor.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly scenariosService: ScenariosService,
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

      if (jobType === 'scenario:capture') {
        result = await this.processCapture(job);
      } else if (jobType === 'scenario:restore') {
        result = await this.processRestore(job);
      } else {
        throw new Error(`Unknown scenario job type: ${jobType}`);
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

  private async processCapture(job: Job): Promise<unknown> {
    const jobId = job.id as string;
    const { name, description, tags, config } = job.data as {
      name: string;
      description?: string;
      tags?: string[];
      config?: Record<string, unknown>;
    };

    await this.jobsService.updateJobProgress(
      jobId,
      30,
      'Capturing current mocks...',
    );

    const result = this.scenariosService.capture(
      name,
      description,
      tags,
      config,
    );

    await this.jobsService.updateJobProgress(
      jobId,
      90,
      `Captured ${result.mocks.length} mocks`,
    );

    return result;
  }

  private async processRestore(job: Job): Promise<unknown> {
    const jobId = job.id as string;
    const { scenarioId } = job.data as { scenarioId: string };

    await this.jobsService.updateJobProgress(jobId, 30, 'Loading scenario...');

    const result = this.scenariosService.restore(scenarioId);

    await this.jobsService.updateJobProgress(
      jobId,
      90,
      `Restored ${result.restored} mocks`,
    );

    return result;
  }
}
