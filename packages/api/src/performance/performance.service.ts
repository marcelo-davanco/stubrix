import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface K6Script {
  id: string;
  name: string;
  description?: string;
  script: string;
  options: {
    vus?: number;
    duration?: string;
    thresholds?: Record<string, string[]>;
  };
  createdAt: string;
}

export interface PerformanceBaseline {
  id: string;
  name: string;
  scriptId: string;
  metrics: {
    p95ResponseMs: number;
    p99ResponseMs: number;
    errorRate: number;
    requestsPerSec: number;
  };
  createdAt: string;
}

const BUILT_IN_SCRIPTS: K6Script[] = [
  {
    id: 'builtin-smoke',
    name: 'Smoke Test',
    description: 'Minimal load to verify the mock server is working',
    script: `import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(__ENV.BASE_URL || 'http://localhost:8081/api/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
}`,
    options: { vus: 1, duration: '30s' },
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-load',
    name: 'Load Test',
    description: 'Sustained load to measure throughput and p95 latency',
    script: `import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const res = http.get(__ENV.BASE_URL || 'http://localhost:8081/api/health');
  check(res, { 'status 2xx': (r) => r.status >= 200 && r.status < 300 });
  sleep(0.1);
}`,
    options: { vus: 20, duration: '2m' },
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-stress',
    name: 'Stress Test',
    description: 'Ramp up to find the breaking point',
    script: `import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const res = http.get(__ENV.BASE_URL || 'http://localhost:8081/api/health');
  check(res, { 'status 2xx': (r) => r.status >= 200 && r.status < 300 });
}`,
    options: { vus: 100, duration: '2m' },
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private readonly storageDir: string;
  private readonly scriptsFile: string;
  private readonly baselinesFile: string;

  constructor(private readonly config: ConfigService) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ?? path.join(process.cwd(), '../../mocks');
    this.storageDir = path.join(mocksDir, 'performance');
    this.scriptsFile = path.join(this.storageDir, 'scripts.json');
    this.baselinesFile = path.join(this.storageDir, 'baselines.json');
    fs.mkdirSync(this.storageDir, { recursive: true });
  }

  listScripts(includeBuiltIn = true): K6Script[] {
    const custom = this.loadScripts();
    return includeBuiltIn ? [...BUILT_IN_SCRIPTS, ...custom] : custom;
  }

  createScript(
    name: string,
    script: string,
    options: K6Script['options'],
    description?: string,
  ): K6Script {
    const s: K6Script = {
      id: uuidv4(),
      name,
      description,
      script,
      options,
      createdAt: new Date().toISOString(),
    };
    const scripts = this.loadScripts();
    scripts.push(s);
    fs.writeFileSync(this.scriptsFile, JSON.stringify(scripts, null, 2));
    return s;
  }

  exportScript(id: string): string {
    const script = this.listScripts().find((s) => s.id === id);
    if (!script) throw new Error(`Script not found: ${id}`);
    return script.script;
  }

  listBaselines(): PerformanceBaseline[] {
    if (!fs.existsSync(this.baselinesFile)) return [];
    try { return JSON.parse(fs.readFileSync(this.baselinesFile, 'utf-8')) as PerformanceBaseline[]; }
    catch { return []; }
  }

  saveBaseline(
    name: string,
    scriptId: string,
    metrics: PerformanceBaseline['metrics'],
  ): PerformanceBaseline {
    const baseline: PerformanceBaseline = {
      id: uuidv4(),
      name,
      scriptId,
      metrics,
      createdAt: new Date().toISOString(),
    };
    const baselines = this.listBaselines();
    baselines.push(baseline);
    fs.writeFileSync(this.baselinesFile, JSON.stringify(baselines, null, 2));
    return baseline;
  }

  compareBaseline(
    id: string,
    current: PerformanceBaseline['metrics'],
  ): { passed: boolean; regressions: string[] } {
    const baseline = this.listBaselines().find((b) => b.id === id);
    if (!baseline) throw new Error(`Baseline not found: ${id}`);

    const regressions: string[] = [];
    const b = baseline.metrics;

    if (current.p95ResponseMs > b.p95ResponseMs * 1.2)
      regressions.push(`p95 latency regressed: ${current.p95ResponseMs}ms vs baseline ${b.p95ResponseMs}ms`);
    if (current.errorRate > b.errorRate + 0.01)
      regressions.push(`Error rate regressed: ${(current.errorRate * 100).toFixed(1)}% vs baseline ${(b.errorRate * 100).toFixed(1)}%`);
    if (current.requestsPerSec < b.requestsPerSec * 0.8)
      regressions.push(`Throughput regressed: ${current.requestsPerSec.toFixed(1)} rps vs baseline ${b.requestsPerSec.toFixed(1)} rps`);

    return { passed: regressions.length === 0, regressions };
  }

  private loadScripts(): K6Script[] {
    if (!fs.existsSync(this.scriptsFile)) return [];
    try { return JSON.parse(fs.readFileSync(this.scriptsFile, 'utf-8')) as K6Script[]; }
    catch { return []; }
  }
}
