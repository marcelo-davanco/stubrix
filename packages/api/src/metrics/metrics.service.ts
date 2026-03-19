import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MetricCounter {
  name: string;
  help: string;
  value: number;
  labels?: Record<string, string>;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  uptime: number;
  version: string;
  checks: Record<
    string,
    { status: 'ok' | 'error'; latencyMs?: number; detail?: string }
  >;
  timestamp: string;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly counters = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();
  private readonly startTime = Date.now();

  constructor(private readonly config: ConfigService) {}

  increment(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + value);
  }

  observe(name: string, value: number): void {
    const bucket = this.histograms.get(name) ?? [];
    bucket.push(value);
    if (bucket.length > 1000) bucket.shift();
    this.histograms.set(name, bucket);
  }

  getPrometheusText(): string {
    const lines: string[] = [];

    lines.push('# HELP stubrix_uptime_seconds API uptime in seconds');
    lines.push('# TYPE stubrix_uptime_seconds gauge');
    lines.push(
      `stubrix_uptime_seconds ${Math.floor((Date.now() - this.startTime) / 1000)}`,
    );

    for (const [name, value] of this.counters.entries()) {
      const metricName = `stubrix_${name.replace(/[^a-z0-9_]/gi, '_')}`;
      lines.push(`# HELP ${metricName} Stubrix counter: ${name}`);
      lines.push(`# TYPE ${metricName} counter`);
      lines.push(`${metricName} ${value}`);
    }

    for (const [name, values] of this.histograms.entries()) {
      if (values.length === 0) continue;
      const metricName = `stubrix_${name.replace(/[^a-z0-9_]/gi, '_')}`;
      const sorted = [...values].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0;

      lines.push(`# HELP ${metricName}_ms Histogram for ${name} in ms`);
      lines.push(`# TYPE ${metricName}_ms summary`);
      lines.push(`${metricName}_ms{quantile="0.5"} ${p50}`);
      lines.push(`${metricName}_ms{quantile="0.95"} ${p95}`);
      lines.push(`${metricName}_ms{quantile="0.99"} ${p99}`);
      lines.push(`${metricName}_ms_sum ${sum}`);
      lines.push(`${metricName}_ms_count ${values.length}`);
    }

    return lines.join('\n') + '\n';
  }

  getMetricsSummary(): Record<string, unknown> {
    const summary: Record<string, unknown> = {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      counters: Object.fromEntries(this.counters),
    };

    const histSummary: Record<string, unknown> = {};
    for (const [name, values] of this.histograms.entries()) {
      if (values.length === 0) continue;
      const sorted = [...values].sort((a, b) => a - b);
      histSummary[name] = {
        count: values.length,
        avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    }
    summary['histograms'] = histSummary;

    return summary;
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {};
    const externalChecks = [
      {
        name: 'pact-broker',
        url: `${this.config.get<string>('PACT_BROKER_URL') ?? 'http://localhost:9292'}/`,
      },
      {
        name: 'toxiproxy',
        url: `${this.config.get<string>('TOXIPROXY_URL') ?? 'http://localhost:8474'}/version`,
      },
      {
        name: 'rag',
        url: `${this.config.get<string>('OPENRAG_URL') ?? 'http://localhost:8888'}/health`,
      },
    ];

    checks['api'] = { status: 'ok', detail: 'running' };

    for (const check of externalChecks) {
      const t0 = Date.now();
      try {
        const res = await fetch(check.url, {
          signal: AbortSignal.timeout(2_000),
        });
        checks[check.name] = {
          status: res.ok ? 'ok' : 'error',
          latencyMs: Date.now() - t0,
        };
      } catch {
        checks[check.name] = { status: 'error', detail: 'unreachable' };
      }
    }

    const hasError = Object.values(checks).some((c) => c.status === 'error');

    return {
      status: hasError ? 'degraded' : 'ok',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: this.config.get<string>('npm_package_version') ?? '1.3.1',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
