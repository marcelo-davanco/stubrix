import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { parseHar } from './parsers/har.parser';
import { parsePostman } from './parsers/postman.parser';
import { parseOpenApi } from './parsers/openapi.parser';
import { emitWireMockMappings } from './parsers/wiremock.emitter';
import { WireMockClientService } from '../common/wiremock-client.service';
import type {
  ImportIR,
  ImportIRFormat,
  ImportPreview,
  ImportOptions,
  ImportResult,
} from '@stubrix/shared';

@Injectable()
export class UniversalImportService {
  private readonly logger = new Logger(UniversalImportService.name);
  private readonly mappingsDir: string;

  constructor(
    private readonly config: ConfigService,
    private readonly wireMock: WireMockClientService,
  ) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ??
      path.join(process.cwd(), '../../mocks');
    this.mappingsDir = path.join(mocksDir, 'mappings');
  }

  detectFormat(content: string, filename?: string): ImportIRFormat {
    const ext = filename ? path.extname(filename).toLowerCase() : '';
    if (ext === '.har') return 'har';

    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      if (parsed.log && (parsed.log as Record<string, unknown>).entries)
        return 'har';
      if (
        parsed.info &&
        (parsed.info as Record<string, unknown>).schema
          ?.toString()
          .includes('postman')
      )
        return 'postman';
      if (parsed.item) return 'postman';
      if (parsed.openapi || parsed.swagger)
        return parsed.swagger ? 'swagger' : 'openapi';
    } catch {
      if (content.includes('openapi:') || content.includes('swagger:')) {
        return 'openapi';
      }
    }

    return 'unknown';
  }

  parse(content: string, format: ImportIRFormat, baseUrl?: string): ImportIR {
    switch (format) {
      case 'har':
        return parseHar(content);
      case 'postman':
        return parsePostman(content);
      case 'openapi':
      case 'swagger':
        return parseOpenApi(content, baseUrl);
      default:
        throw new BadRequestException(`Unsupported import format: ${format}`);
    }
  }

  preview(content: string, filename?: string, baseUrl?: string): ImportPreview {
    const format = this.detectFormat(content, filename);
    if (format === 'unknown') {
      throw new BadRequestException(
        'Could not detect import format. Supported: HAR, Postman Collection v2.1, OpenAPI 3.x, Swagger 2.0',
      );
    }

    const ir = this.parse(content, format, baseUrl);
    return {
      format: ir.format,
      title: ir.title,
      totalEntries: ir.entries.length,
      entries: ir.entries.map((e) => ({
        id: e.id,
        name: e.name,
        method: e.request.method,
        path: e.request.path,
        responseStatus: e.response.status,
      })),
    };
  }

  async importContent(
    content: string,
    options: ImportOptions,
    filename?: string,
  ): Promise<ImportResult> {
    const format = this.detectFormat(content, filename);
    if (format === 'unknown') {
      throw new BadRequestException(
        'Could not detect import format. Supported: HAR, Postman Collection v2.1, OpenAPI 3.x, Swagger 2.0',
      );
    }

    const ir = this.parse(content, format);
    return this.importIR(ir, options);
  }

  async importIR(ir: ImportIR, options: ImportOptions): Promise<ImportResult> {
    const {
      projectId,
      deduplicate = true,
      overwrite = false,
      filterMethods,
      filterStatusCodes,
    } = options;

    let entries = ir.entries;

    if (filterMethods?.length) {
      const methods = filterMethods.map((m) => m.toUpperCase());
      entries = entries.filter((e) => methods.includes(e.request.method));
    }

    if (filterStatusCodes?.length) {
      entries = entries.filter((e) =>
        filterStatusCodes.includes(e.response.status),
      );
    }

    const filteredIR: ImportIR = { ...ir, entries };
    const mappings = emitWireMockMappings(filteredIR, {
      projectId,
      useUrlPath: true,
    });

    const result: ImportResult = {
      created: 0,
      skipped: 0,
      errors: [],
      summary: '',
      format: ir.format,
    };

    fs.mkdirSync(this.mappingsDir, { recursive: true });

    const existingFiles = fs.existsSync(this.mappingsDir)
      ? fs.readdirSync(this.mappingsDir).filter((f) => f.endsWith('.json'))
      : [];

    const existingKeys = new Set<string>();
    if (deduplicate) {
      for (const filename of existingFiles) {
        try {
          const raw = fs.readFileSync(
            path.join(this.mappingsDir, filename),
            'utf-8',
          );
          const m = JSON.parse(raw) as {
            request?: { method?: string; urlPath?: string; url?: string };
            metadata?: { project?: string };
          };
          if (!overwrite && m.metadata?.project !== projectId) continue;
          const key = `${m.request?.method}:${m.request?.urlPath ?? m.request?.url}`;
          existingKeys.add(key);
        } catch {
          // skip unreadable files
        }
      }
    }

    for (const mapping of mappings) {
      try {
        const key = `${mapping.request.method}:${mapping.request.urlPath ?? mapping.request.url}`;

        if (deduplicate && !overwrite && existingKeys.has(key)) {
          result.skipped++;
          continue;
        }

        const urlSlug = (
          mapping.request.urlPath ??
          mapping.request.url ??
          'unknown'
        )
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase()
          .slice(0, 40);
        const filename = `${urlSlug}_${mapping.request.method.toLowerCase()}_${mapping.id}.json`;
        const filePath = path.join(this.mappingsDir, filename);

        fs.writeFileSync(filePath, JSON.stringify(mapping, null, 2));
        existingKeys.add(key);

        try {
          await this.wireMock.post('/mappings', mapping);
        } catch {
          // WireMock may not be running; file saved regardless
        }

        result.created++;
      } catch (err) {
        result.errors.push(
          `Failed to create mapping for ${mapping.name}: ${(err as Error).message}`,
        );
        this.logger.warn(`Import error: ${(err as Error).message}`);
      }
    }

    result.summary = this.buildSummary(result);
    this.logger.log(`Import complete [${ir.format}]: ${result.summary}`);
    return result;
  }

  async importFromUrl(
    url: string,
    options: ImportOptions,
  ): Promise<ImportResult> {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException(
        `URL scheme not allowed: ${parsed.protocol}`,
      );
    }
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      throw new BadRequestException(`URL hostname not allowed: ${hostname}`);
    }
    let content: string;
    try {
      // codeql[js/request-forgery] - hostname validated against private/loopback ranges above
      const res = await fetch(parsed.href);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      content = await res.text();
    } catch (err) {
      throw new BadRequestException(
        `Failed to fetch from URL: ${(err as Error).message}`,
      );
    }

    const filename = url.split('/').pop();
    return this.importContent(content, options, filename);
  }

  private buildSummary(result: ImportResult): string {
    const parts: string[] = [];
    if (result.created > 0) parts.push(`${result.created} created`);
    if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
    if (result.errors.length > 0) parts.push(`${result.errors.length} errors`);
    return parts.length > 0 ? parts.join(', ') : 'No changes';
  }
}
