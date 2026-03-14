import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AwsResource {
  type: 's3' | 'sqs' | 'sns' | 'dynamodb' | 'lambda' | 'secretsmanager';
  name: string;
  arn?: string;
  region: string;
}

@Injectable()
export class CloudService {
  private readonly logger = new Logger(CloudService.name);
  private readonly localstackUrl: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {
    this.localstackUrl = this.config.get<string>('LOCALSTACK_URL') ?? 'http://localhost:4566';
    this.region = this.config.get<string>('AWS_DEFAULT_REGION') ?? 'us-east-1';
  }

  async health(): Promise<{ available: boolean; url: string; services: string[] }> {
    try {
      const res = await fetch(`${this.localstackUrl}/_localstack/health`, {
        signal: AbortSignal.timeout(3_000),
      });
      if (!res.ok) return { available: false, url: this.localstackUrl, services: [] };
      const data = (await res.json()) as { services?: Record<string, string> };
      const services = Object.entries(data.services ?? {})
        .filter(([, v]) => v === 'available' || v === 'running')
        .map(([k]) => k);
      return { available: true, url: this.localstackUrl, services };
    } catch {
      return { available: false, url: this.localstackUrl, services: [] };
    }
  }

  async listS3Buckets(): Promise<string[]> {
    try {
      const res = await fetch(`${this.localstackUrl}/`, {
        headers: { Host: 's3.localhost.localstack.cloud' },
        signal: AbortSignal.timeout(3_000),
      });
      const text = await res.text();
      const matches = text.matchAll(/<Name>([^<]+)<\/Name>/g);
      return [...matches].map((m) => m[1]);
    } catch {
      return [];
    }
  }

  async createS3Bucket(bucket: string): Promise<{ bucket: string; url: string }> {
    const url = `${this.localstackUrl}/${bucket}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Host: 's3.localhost.localstack.cloud' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok && res.status !== 409) {
      throw new Error(`Failed to create bucket: HTTP ${res.status}`);
    }
    this.logger.log(`S3 bucket created: ${bucket}`);
    return { bucket, url: `s3://${bucket}` };
  }

  async listSqsQueues(): Promise<string[]> {
    try {
      const res = await fetch(
        `${this.localstackUrl}/000000000000/?Action=ListQueues`,
        { signal: AbortSignal.timeout(3_000) },
      );
      const text = await res.text();
      const matches = text.matchAll(/<QueueUrl>([^<]+)<\/QueueUrl>/g);
      return [...matches].map((m) => m[1]);
    } catch {
      return [];
    }
  }

  async publishSnsMessage(
    topic: string,
    message: string,
    subject?: string,
  ): Promise<{ messageId: string }> {
    const body = new URLSearchParams({
      Action: 'Publish',
      TopicArn: `arn:aws:sns:${this.region}:000000000000:${topic}`,
      Message: message,
      ...(subject ? { Subject: subject } : {}),
    });
    const res = await fetch(`${this.localstackUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(5_000),
    });
    const text = await res.text();
    const match = text.match(/<MessageId>([^<]+)<\/MessageId>/);
    return { messageId: match?.[1] ?? 'unknown' };
  }

  getConfig(): Record<string, unknown> {
    return {
      localstackUrl: this.localstackUrl,
      region: this.region,
      endpoint: this.localstackUrl,
    };
  }
}
