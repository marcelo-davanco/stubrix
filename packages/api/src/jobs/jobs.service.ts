import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import type {
  StubrixJob,
  JobType,
  JobStatus,
  JobPriority,
  JobAcceptedResponse,
  JobWebhookPayload,
  ListJobsQuery,
  ListJobsResponse,
} from '@stubrix/shared';
import { PRIORITY_MAP, ESTIMATED_DURATIONS } from './queue.constants';

interface EnqueueOptions {
  type: JobType;
  queueName: string;
  payload: Record<string, unknown>;
  priority?: JobPriority;
  webhookUrl?: string;
}

@Injectable()
export class JobsService implements OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private readonly redis: Redis;
  private readonly queues = new Map<string, Queue>();
  private readonly JOB_PREFIX = 'stubrix:job:';
  private readonly JOB_INDEX = 'stubrix:jobs:index';
  private readonly JOB_TTL = 86400;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis({
      host: this.config.get<string>('REDIS_HOST') ?? 'localhost',
      port: parseInt(this.config.get<string>('REDIS_PORT') ?? '6379', 10),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      db: parseInt(this.config.get<string>('REDIS_DB') ?? '0', 10),
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    this.redis.connect().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis connection deferred: ${message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    await this.redis.quit();
  }

  getRedisConnection(): Redis {
    return this.redis;
  }

  registerQueue(name: string, queue: Queue): void {
    this.queues.set(name, queue);
  }

  async enqueue(options: EnqueueOptions): Promise<JobAcceptedResponse> {
    const {
      type,
      queueName,
      payload,
      priority = 'normal',
      webhookUrl,
    } = options;

    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue "${queueName}" is not registered`);
    }

    const bullJob = await queue.add(
      type,
      {
        ...payload,
        webhookUrl,
      },
      {
        priority: PRIORITY_MAP[priority],
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600, count: 200 },
        removeOnFail: { age: 86400, count: 500 },
      },
    );

    const jobId = bullJob.id as string;

    const jobRecord: StubrixJob = {
      id: jobId,
      type,
      status: 'pending',
      priority,
      progress: 0,
      createdAt: new Date().toISOString(),
      metadata: {
        queueName,
        webhookUrl,
        ...payload,
      },
    };

    await this.saveJobRecord(jobRecord);

    return {
      jobId,
      status: 'pending',
      statusUrl: `/api/jobs/${jobId}`,
      streamUrl: `/api/jobs/${jobId}/stream`,
      estimatedDuration: ESTIMATED_DURATIONS[type],
    };
  }

  async getJob(jobId: string): Promise<StubrixJob | null> {
    const raw = await this.redis.get(`${this.JOB_PREFIX}${jobId}`);
    if (!raw) return null;
    return JSON.parse(raw) as StubrixJob;
  }

  async listJobs(query: ListJobsQuery): Promise<ListJobsResponse> {
    const { type, status, limit = 20, offset = 0 } = query;

    const allIds = await this.redis.lrange(this.JOB_INDEX, 0, -1);
    const jobs: StubrixJob[] = [];

    for (const id of allIds) {
      const job = await this.getJob(id);
      if (!job) continue;
      if (type && job.type !== type) continue;
      if (status && job.status !== status) continue;
      jobs.push(job);
    }

    return {
      jobs: jobs.slice(offset, offset + limit),
      total: jobs.length,
      limit,
      offset,
    };
  }

  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    extra?: Partial<StubrixJob>,
  ): Promise<StubrixJob | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;

    const updated: StubrixJob = {
      ...job,
      ...extra,
      status,
    };

    if (status === 'processing' && !updated.startedAt) {
      updated.startedAt = new Date().toISOString();
    }

    if (status === 'completed' || status === 'failed') {
      updated.completedAt = new Date().toISOString();
    }

    await this.saveJobRecord(updated);

    if (
      (status === 'completed' || status === 'failed') &&
      job.metadata.webhookUrl
    ) {
      await this.sendWebhook(updated);
    }

    return updated;
  }

  async updateJobProgress(
    jobId: string,
    progress: number,
    message?: string,
  ): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    job.progress = Math.min(100, Math.max(0, progress));
    if (message) job.progressMessage = message;
    await this.saveJobRecord(job);
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job) return false;
    if (job.status === 'completed' || job.status === 'failed') return false;

    await this.updateJobStatus(jobId, 'cancelled');

    const queueName = job.metadata.queueName as string;
    const queue = this.queues.get(queueName);
    if (queue) {
      const bullJob = await queue.getJob(jobId);
      if (bullJob) {
        await bullJob.remove().catch(() => {
          // Job may already be processing
        });
      }
    }

    return true;
  }

  private async saveJobRecord(job: StubrixJob): Promise<void> {
    const key = `${this.JOB_PREFIX}${job.id}`;
    await this.redis.set(key, JSON.stringify(job), 'EX', this.JOB_TTL);

    const exists = await this.redis.lpos(this.JOB_INDEX, job.id);
    if (exists === null) {
      await this.redis.lpush(this.JOB_INDEX, job.id);
      await this.redis.ltrim(this.JOB_INDEX, 0, 999);
    }
  }

  private async sendWebhook(job: StubrixJob): Promise<void> {
    const url = job.metadata.webhookUrl as string;
    if (!url) return;

    const startedAt = job.startedAt
      ? new Date(job.startedAt).getTime()
      : Date.now();
    const completedAt = job.completedAt
      ? new Date(job.completedAt).getTime()
      : Date.now();

    const payload: JobWebhookPayload = {
      jobId: job.id,
      type: job.type,
      status: job.status as 'completed' | 'failed',
      result: job.result,
      error: job.error,
      duration: completedAt - startedAt,
      completedAt: job.completedAt ?? new Date().toISOString(),
    };

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      this.logger.debug(`Webhook sent to ${url} for job ${job.id}`);
    } catch (err) {
      this.logger.warn(
        `Webhook failed for job ${job.id}: ${(err as Error).message}`,
      );
    }
  }
}
