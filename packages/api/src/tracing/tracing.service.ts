import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  service: string;
  startTime: number;
  duration: number;
  tags?: Record<string, string | number | boolean>;
  status: 'ok' | 'error';
}

export interface Trace {
  traceId: string;
  spans: Span[];
  duration: number;
  service: string;
  timestamp: string;
}

@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);
  private readonly jaegerUrl: string;
  private readonly storageDir: string;
  private readonly tracesFile: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.jaegerUrl = this.config.get<string>('JAEGER_URL') ?? 'http://localhost:16686';
    this.enabled = this.config.get<string>('OTEL_ENABLED') !== 'false';
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ?? path.join(process.cwd(), '../../mocks');
    this.storageDir = path.join(mocksDir, 'traces');
    this.tracesFile = path.join(this.storageDir, 'traces.json');
    fs.mkdirSync(this.storageDir, { recursive: true });
  }

  startSpan(operationName: string, service = 'stubrix-api', parentSpanId?: string): Span {
    return {
      traceId: uuidv4().replace(/-/g, ''),
      spanId: uuidv4().replace(/-/g, '').slice(0, 16),
      parentSpanId,
      operationName,
      service,
      startTime: Date.now(),
      duration: 0,
      status: 'ok',
    };
  }

  finishSpan(span: Span, tags?: Record<string, string | number | boolean>, error?: Error): Span {
    span.duration = Date.now() - span.startTime;
    span.tags = tags;
    if (error) {
      span.status = 'error';
      span.tags = { ...span.tags, 'error.message': error.message };
    }
    this.recordSpan(span);
    return span;
  }

  listTraces(service?: string, limit = 20): Trace[] {
    const traces = this.loadTraces();
    const filtered = service ? traces.filter((t) => t.service === service) : traces;
    return filtered.slice(0, limit);
  }

  getTrace(traceId: string): Trace | undefined {
    return this.loadTraces().find((t) => t.traceId === traceId);
  }

  async jaegerHealth(): Promise<{ available: boolean; url: string }> {
    try {
      const res = await fetch(`${this.jaegerUrl}/`, { signal: AbortSignal.timeout(3_000) });
      return { available: res.ok, url: this.jaegerUrl };
    } catch {
      return { available: false, url: this.jaegerUrl };
    }
  }

  getOtelConfig(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      exporterEndpoint: this.config.get<string>('OTEL_EXPORTER_ENDPOINT') ?? 'http://localhost:4318',
      serviceName: this.config.get<string>('OTEL_SERVICE_NAME') ?? 'stubrix',
      samplingRate: parseFloat(this.config.get<string>('OTEL_SAMPLING_RATE') ?? '1.0'),
      jaegerUrl: this.jaegerUrl,
    };
  }

  private recordSpan(span: Span): void {
    if (!this.enabled) return;
    const traces = this.loadTraces();
    const existing = traces.find((t) => t.traceId === span.traceId);
    if (existing) {
      existing.spans.push(span);
      existing.duration = Math.max(existing.duration, span.duration);
    } else {
      traces.unshift({
        traceId: span.traceId,
        spans: [span],
        duration: span.duration,
        service: span.service,
        timestamp: new Date().toISOString(),
      });
    }
    fs.writeFileSync(this.tracesFile, JSON.stringify(traces.slice(0, 500), null, 2));
  }

  private loadTraces(): Trace[] {
    if (!fs.existsSync(this.tracesFile)) return [];
    try { return JSON.parse(fs.readFileSync(this.tracesFile, 'utf-8')) as Trace[]; }
    catch { return []; }
  }
}
