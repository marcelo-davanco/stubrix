import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type BrokerType = 'kafka' | 'rabbitmq';

export interface EventTemplate {
  id: string;
  name: string;
  broker: BrokerType;
  topic: string;
  payload: unknown;
  headers?: Record<string, string>;
  scheduleMs?: number;
  createdAt: string;
}

export interface PublishedEvent {
  id: string;
  templateId?: string;
  broker: BrokerType;
  topic: string;
  payload: unknown;
  publishedAt: string;
  status: 'ok' | 'error';
  error?: string;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly kafkaUrl: string;
  private readonly rabbitmqUrl: string;
  private readonly storageDir: string;

  constructor(private readonly config: ConfigService) {
    this.kafkaUrl =
      this.config.get<string>('KAFKA_REST_URL') ?? 'http://localhost:8082';
    this.rabbitmqUrl =
      this.config.get<string>('RABBITMQ_API_URL') ?? 'http://localhost:15672';
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ??
      path.join(process.cwd(), '../../mocks');
    this.storageDir = path.join(mocksDir, 'events');
    fs.mkdirSync(this.storageDir, { recursive: true });
  }

  async publish(
    broker: BrokerType,
    topic: string,
    payload: unknown,
    headers?: Record<string, string>,
  ): Promise<PublishedEvent> {
    const event: PublishedEvent = {
      id: uuidv4(),
      broker,
      topic,
      payload,
      publishedAt: new Date().toISOString(),
      status: 'ok',
    };

    try {
      if (broker === 'kafka') {
        await this.publishKafka(topic, payload, headers);
      } else {
        await this.publishRabbitMQ(topic, payload);
      }
    } catch (err) {
      event.status = 'error';
      event.error = (err as Error).message;
      this.logger.warn(
        `Event publish failed (${broker}/${topic}): ${event.error}`,
      );
    }

    this.storeEvent(event);
    return event;
  }

  listTemplates(): EventTemplate[] {
    const file = path.join(this.storageDir, 'templates.json');
    if (!fs.existsSync(file)) return [];
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8')) as EventTemplate[];
    } catch {
      return [];
    }
  }

  createTemplate(
    name: string,
    broker: BrokerType,
    topic: string,
    payload: unknown,
    headers?: Record<string, string>,
    scheduleMs?: number,
  ): EventTemplate {
    const template: EventTemplate = {
      id: uuidv4(),
      name,
      broker,
      topic,
      payload,
      headers,
      scheduleMs,
      createdAt: new Date().toISOString(),
    };
    const file = path.join(this.storageDir, 'templates.json');
    const templates = this.listTemplates();
    templates.push(template);
    fs.writeFileSync(file, JSON.stringify(templates, null, 2));
    return template;
  }

  async fireTemplate(id: string): Promise<PublishedEvent> {
    const template = this.listTemplates().find((t) => t.id === id);
    if (!template) throw new Error(`Template not found: ${id}`);
    return this.publish(
      template.broker,
      template.topic,
      template.payload,
      template.headers,
    );
  }

  listPublished(limit = 50): PublishedEvent[] {
    const file = path.join(this.storageDir, 'published.json');
    if (!fs.existsSync(file)) return [];
    try {
      return (
        JSON.parse(fs.readFileSync(file, 'utf-8')) as PublishedEvent[]
      ).slice(0, limit);
    } catch {
      return [];
    }
  }

  async healthCheck(): Promise<{ kafka: boolean; rabbitmq: boolean }> {
    const [kafka, rabbitmq] = await Promise.all([
      fetch(`${this.kafkaUrl}/topics`, { signal: AbortSignal.timeout(3_000) })
        .then((r) => r.ok)
        .catch(() => false),
      fetch(`${this.rabbitmqUrl}/api/overview`, {
        signal: AbortSignal.timeout(3_000),
      })
        .then((r) => r.ok)
        .catch(() => false),
    ]);
    return { kafka, rabbitmq };
  }

  private async publishKafka(
    topic: string,
    payload: unknown,
    headers?: Record<string, string>,
  ): Promise<void> {
    // lgtm[js/file-access-to-http] - intentional: stored event payload is published to configured Kafka REST endpoint
    const res = await fetch(
      `${this.kafkaUrl}/topics/${encodeURIComponent(topic)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.kafka.json.v2+json',
          ...headers,
        },
        body: JSON.stringify({ records: [{ value: payload }] }),
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!res.ok) throw new Error(`Kafka REST HTTP ${res.status}`);
  }

  private async publishRabbitMQ(
    exchange: string,
    payload: unknown,
  ): Promise<void> {
    const vhost = this.config.get<string>('RABBITMQ_VHOST') ?? '%2F';
    const user = this.config.get<string>('RABBITMQ_USER') ?? 'guest';
    const pass = this.config.get<string>('RABBITMQ_PASS') ?? 'guest';
    const auth = Buffer.from(`${user}:${pass}`).toString('base64');

    // lgtm[js/file-access-to-http] - intentional: stored event payload is published to configured RabbitMQ endpoint
    const res = await fetch(
      `${this.rabbitmqUrl}/api/exchanges/${encodeURIComponent(vhost)}/${encodeURIComponent(exchange)}/publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          properties: {},
          routing_key: exchange,
          payload: JSON.stringify(payload),
          payload_encoding: 'string',
        }),
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!res.ok) throw new Error(`RabbitMQ API HTTP ${res.status}`);
  }

  private storeEvent(event: PublishedEvent): void {
    const file = path.join(this.storageDir, 'published.json');
    const events = this.listPublished(499);
    events.unshift(event);
    fs.writeFileSync(file, JSON.stringify(events, null, 2));
  }
}
