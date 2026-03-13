import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { parseOpenApi } from '../import/parsers/openapi.parser';
import { parsePostman } from '../import/parsers/postman.parser';

export type CoverageStatus = 'covered' | 'partial' | 'missing';

export interface SpecEndpoint {
  method: string;
  path: string;
  operationId?: string;
  tags?: string[];
  responseCodes: number[];
}

export interface MockEndpoint {
  method: string;
  urlPath?: string;
  urlPattern?: string;
  responseCodes: number[];
  filename: string;
}

export interface CoverageEntry {
  method: string;
  path: string;
  operationId?: string;
  status: CoverageStatus;
  specCodes: number[];
  mockedCodes: number[];
  missingCodes: number[];
}

export interface CoverageReport {
  specFile?: string;
  totalEndpoints: number;
  coveredEndpoints: number;
  partialEndpoints: number;
  missingEndpoints: number;
  coveragePercent: number;
  entries: CoverageEntry[];
  generatedAt: string;
}

@Injectable()
export class CoverageService {
  private readonly logger = new Logger(CoverageService.name);
  private readonly mappingsDir: string;

  constructor(private readonly config: ConfigService) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ??
      path.join(process.cwd(), '../../mocks');
    this.mappingsDir = path.join(mocksDir, 'mappings');
  }

  async analyze(
    specContent: string,
    specFile?: string,
  ): Promise<CoverageReport> {
    const specEndpoints = this.parseSpecEndpoints(specContent);
    const mockEndpoints = this.scanMockMappings();

    const entries = specEndpoints.map((spec) =>
      this.matchEndpoint(spec, mockEndpoints),
    );

    const covered = entries.filter((e) => e.status === 'covered').length;
    const partial = entries.filter((e) => e.status === 'partial').length;
    const missing = entries.filter((e) => e.status === 'missing').length;
    const total = entries.length;

    return {
      specFile,
      totalEndpoints: total,
      coveredEndpoints: covered,
      partialEndpoints: partial,
      missingEndpoints: missing,
      coveragePercent:
        total > 0 ? Math.round(((covered + partial * 0.5) / total) * 100) : 0,
      entries,
      generatedAt: new Date().toISOString(),
    };
  }

  async analyzeFromFile(specPath: string): Promise<CoverageReport> {
    if (!fs.existsSync(specPath)) {
      throw new Error(`Spec file not found: ${specPath}`);
    }
    const content = fs.readFileSync(specPath, 'utf-8');
    return this.analyze(content, path.basename(specPath));
  }

  async analyzeFromPostman(
    postmanContent: string,
    specFile?: string,
  ): Promise<CoverageReport> {
    const specEndpoints = this.parsePostmanEndpoints(postmanContent);
    const mockEndpoints = this.scanMockMappings();

    const entries = specEndpoints.map((spec) =>
      this.matchEndpoint(spec, mockEndpoints),
    );

    const covered = entries.filter((e) => e.status === 'covered').length;
    const partial = entries.filter((e) => e.status === 'partial').length;
    const missing = entries.filter((e) => e.status === 'missing').length;
    const total = entries.length;

    return {
      specFile,
      totalEndpoints: total,
      coveredEndpoints: covered,
      partialEndpoints: partial,
      missingEndpoints: missing,
      coveragePercent:
        total > 0 ? Math.round(((covered + partial * 0.5) / total) * 100) : 0,
      entries,
      generatedAt: new Date().toISOString(),
    };
  }

  generateJsonReport(report: CoverageReport): string {
    return JSON.stringify(report, null, 2);
  }

  generateTextReport(report: CoverageReport): string {
    const lines: string[] = [];
    const bar = (pct: number, width = 30) => {
      const filled = Math.round((pct / 100) * width);
      return '[' + '='.repeat(filled) + '-'.repeat(width - filled) + ']';
    };

    lines.push('');
    lines.push('╔══════════════════════════════════════════╗');
    lines.push('║      Stubrix Mock Coverage Report        ║');
    lines.push('╚══════════════════════════════════════════╝');
    lines.push('');
    lines.push(
      `  Coverage: ${bar(report.coveragePercent)} ${report.coveragePercent}%`,
    );
    lines.push('');
    lines.push(`  Total endpoints : ${report.totalEndpoints}`);
    lines.push(`  ✅ Covered       : ${report.coveredEndpoints}`);
    lines.push(`  ⚠️  Partial       : ${report.partialEndpoints}`);
    lines.push(`  ❌ Missing       : ${report.missingEndpoints}`);
    lines.push('');

    if (report.entries.length > 0) {
      lines.push('  Endpoint Details:');
      lines.push('  ─────────────────────────────────────────');
      for (const e of report.entries) {
        const icon =
          e.status === 'covered' ? '✅' : e.status === 'partial' ? '⚠️ ' : '❌';
        lines.push(`  ${icon} ${e.method.padEnd(7)} ${e.path}`);
        if (e.missingCodes.length > 0) {
          lines.push(
            `         Missing status codes: ${e.missingCodes.join(', ')}`,
          );
        }
      }
    }

    lines.push('');
    lines.push(`  Generated at: ${report.generatedAt}`);
    lines.push('');
    return lines.join('\n');
  }

  private parseSpecEndpoints(content: string): SpecEndpoint[] {
    try {
      const ir = parseOpenApi(content);
      const endpointMap = new Map<string, SpecEndpoint>();

      for (const entry of ir.entries) {
        const key = `${entry.request.method}:${entry.request.path}`;
        if (!endpointMap.has(key)) {
          endpointMap.set(key, {
            method: entry.request.method,
            path: entry.request.path,
            operationId: entry.name,
            tags: entry.tags,
            responseCodes: [],
          });
        }
        endpointMap.get(key)!.responseCodes.push(entry.response.status);
      }

      return Array.from(endpointMap.values());
    } catch (err) {
      this.logger.error('Failed to parse spec endpoints', err);
      return [];
    }
  }

  private parsePostmanEndpoints(content: string): SpecEndpoint[] {
    try {
      const ir = parsePostman(content, true);
      const endpointMap = new Map<string, SpecEndpoint>();

      for (const entry of ir.entries) {
        const key = `${entry.request.method}:${entry.request.path}`;
        if (!endpointMap.has(key)) {
          endpointMap.set(key, {
            method: entry.request.method,
            path: entry.request.path,
            operationId: entry.name,
            tags: entry.tags,
            responseCodes: [],
          });
        }
        const spec = endpointMap.get(key)!;
        if (!spec.responseCodes.includes(entry.response.status)) {
          spec.responseCodes.push(entry.response.status);
        }
      }

      return Array.from(endpointMap.values());
    } catch (err) {
      this.logger.error('Failed to parse Postman endpoints', err);
      return [];
    }
  }

  private scanMockMappings(): MockEndpoint[] {
    if (!fs.existsSync(this.mappingsDir)) return [];

    return fs
      .readdirSync(this.mappingsDir)
      .filter((f) => f.endsWith('.json'))
      .flatMap((filename) => {
        try {
          const raw = fs.readFileSync(
            path.join(this.mappingsDir, filename),
            'utf-8',
          );
          const mapping = JSON.parse(raw) as {
            request?: {
              method?: string;
              urlPath?: string;
              url?: string;
              urlPattern?: string;
            };
            response?: { status?: number };
          };

          if (!mapping.request?.method) return [];

          return [
            {
              method: (mapping.request.method ?? 'GET').toUpperCase(),
              urlPath: mapping.request.urlPath ?? mapping.request.url,
              urlPattern: mapping.request.urlPattern,
              responseCodes: [mapping.response?.status ?? 200],
              filename,
            } satisfies MockEndpoint,
          ];
        } catch {
          return [];
        }
      });
  }

  private matchEndpoint(
    spec: SpecEndpoint,
    mocks: MockEndpoint[],
  ): CoverageEntry {
    const matching = mocks.filter(
      (m) => m.method === spec.method && this.pathMatches(spec.path, m),
    );

    const mockedCodes = [...new Set(matching.flatMap((m) => m.responseCodes))];
    const missingCodes = spec.responseCodes.filter(
      (c) => !mockedCodes.includes(c),
    );

    let status: CoverageStatus;
    if (matching.length === 0) {
      status = 'missing';
    } else if (missingCodes.length === 0) {
      status = 'covered';
    } else {
      status = 'partial';
    }

    return {
      method: spec.method,
      path: spec.path,
      operationId: spec.operationId,
      status,
      specCodes: spec.responseCodes,
      mockedCodes,
      missingCodes,
    };
  }

  private pathMatches(specPath: string, mock: MockEndpoint): boolean {
    const urlPath = mock.urlPath ?? '';

    // exact match
    if (urlPath === specPath) return true;

    // normalize path params {id} → .*
    const specNormalized = specPath.replace(/\{[^}]+\}/g, '[^/]+');
    const specRegex = new RegExp(`^${specNormalized}$`);
    if (specRegex.test(urlPath)) return true;

    // urlPattern match
    if (mock.urlPattern) {
      try {
        const re = new RegExp(mock.urlPattern);
        return re.test(specPath);
      } catch {
        return false;
      }
    }

    return false;
  }
}
