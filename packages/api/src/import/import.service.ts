import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { WireMockClientService } from '../common/wiremock-client.service';
import { ProjectsService } from '../projects/projects.service';
import * as fs from 'fs';
import * as path from 'path';

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
  summary: string;
}

export interface HarEntry {
  request: {
    method: string;
    url: string;
    headers: Array<{ name: string; value: string }>;
    queryString?: Array<{ name: string; value: string }>;
    postData?: {
      mimeType: string;
      text: string;
    };
  };
  response: {
    status: number;
    headers: Array<{ name: string; value: string }>;
    content: {
      mimeType: string;
      text?: string;
      size?: number;
    };
  };
}

export interface PostmanItem {
  request: {
    method: string;
    header?: Array<{ key: string; value: string }>;
    body?: {
      mode: string;
      raw?: string;
      graphql?: any;
    };
    url: {
      raw: string;
      protocol?: string;
      host?: string[];
      path?: string[];
      query?: Array<{ key: string; value: string }>;
    };
  };
  response?: Array<{
    status: string;
    code: number;
    header: Array<{ key: string; value: string }>;
    body?: string;
  }>;
}

export interface PostmanCollection {
  info: {
    name: string;
    schema: string;
  };
  item: PostmanItem[];
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly wireMock: WireMockClientService,
    private readonly projects: ProjectsService,
  ) {}

  async importFromHar(projectId: string, harContent: string): Promise<ImportResult> {
    this.logger.log(`Starting HAR import for project ${projectId}`);
    
    try {
      const har = JSON.parse(harContent) as { log: { entries: HarEntry[] } };
      
      if (!har.log?.entries) {
        throw new BadRequestException('Invalid HAR file format');
      }

      const result: ImportResult = {
        created: 0,
        skipped: 0,
        errors: [],
        summary: '',
      };

      // Get existing mappings to check for duplicates
      const existingMappings = await this.getExistingMappings();
      const existingUrls = new Set(
        existingMappings.map(m => `${m.request.method}:${m.request.url}`)
      );

      for (const entry of har.log.entries) {
        try {
          const mapping = this.convertHarEntryToWireMock(entry);
          const mappingKey = `${mapping.request.method}:${mapping.request.url}`;

          if (existingUrls.has(mappingKey)) {
            result.skipped++;
            this.logger.debug(`Skipping duplicate mapping: ${mappingKey}`);
            continue;
          }

          await this.wireMock.post('/mappings', mapping);
          result.created++;
          existingUrls.add(mappingKey);
          this.logger.debug(`Created mapping: ${mappingKey}`);
        } catch (error) {
          const errorMsg = `Failed to import entry ${entry.request.url}: ${error.message}`;
          result.errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      result.summary = this.generateSummary(result);
      return result;
    } catch (error) {
      this.logger.error('HAR import failed:', error);
      throw new BadRequestException(`HAR import failed: ${error.message}`);
    }
  }

  async importFromPostman(projectId: string, postmanContent: string): Promise<ImportResult> {
    this.logger.log(`Starting Postman import for project ${projectId}`);
    
    try {
      const collection = JSON.parse(postmanContent) as PostmanCollection;
      
      if (!collection.item) {
        throw new BadRequestException('Invalid Postman collection format');
      }

      const result: ImportResult = {
        created: 0,
        skipped: 0,
        errors: [],
        summary: '',
      };

      // Get existing mappings to check for duplicates
      const existingMappings = await this.getExistingMappings();
      const existingUrls = new Set(
        existingMappings.map(m => `${m.request.method}:${m.request.url}`)
      );

      for (const item of collection.item) {
        try {
          const mapping = this.convertPostmanItemToWireMock(item);
          const mappingKey = `${mapping.request.method}:${mapping.request.url}`;

          if (existingUrls.has(mappingKey)) {
            result.skipped++;
            this.logger.debug(`Skipping duplicate mapping: ${mappingKey}`);
            continue;
          }

          await this.wireMock.post('/mappings', mapping);
          result.created++;
          existingUrls.add(mappingKey);
          this.logger.debug(`Created mapping: ${mappingKey}`);
        } catch (error) {
          const errorMsg = `Failed to import item ${item.request?.url?.raw || 'unknown'}: ${error.message}`;
          result.errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      result.summary = this.generateSummary(result);
      return result;
    } catch (error) {
      this.logger.error('Postman import failed:', error);
      throw new BadRequestException(`Postman import failed: ${error.message}`);
    }
  }

  private async getExistingMappings() {
    try {
      const mappings = await this.wireMock.get<any[]>('/mappings');
      return mappings || [];
    } catch {
      return [];
    }
  }

  private convertHarEntryToWireMock(entry: HarEntry): any {
    const headers: { [key: string]: string } = {};
    entry.request.headers?.forEach(header => {
      headers[header.name] = header.value;
    });

    // Build query parameters
    let url = entry.request.url;
    if (entry.request.queryString && entry.request.queryString.length > 0) {
      const queryParams = entry.request.queryString
        .map(q => `${q.name}=${encodeURIComponent(q.value)}`)
        .join('&');
      url += (url.includes('?') ? '&' : '?') + queryParams;
    }

    const mapping: any = {
      request: {
        method: entry.request.method,
        url: url,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      },
      response: {
        status: entry.response.status,
        headers: {},
        body: entry.response.content.text || '',
      },
    };

    // Set response headers
    entry.response.headers?.forEach(header => {
      mapping.response.headers[header.name] = header.value;
    });

    // Set content type if available
    if (entry.response.content.mimeType) {
      mapping.response.headers['Content-Type'] = entry.response.content.mimeType;
    }

    return mapping;
  }

  private convertPostmanItemToWireMock(item: PostmanItem): any {
    const headers: { [key: string]: string } = {};
    item.request.header?.forEach(header => {
      headers[header.key] = header.value;
    });

    let body = '';
    let contentType = 'application/json';

    if (item.request.body) {
      switch (item.request.body.mode) {
        case 'raw':
          body = item.request.body.raw || '';
          // Try to detect content type from raw body
          if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
            contentType = 'application/json';
          } else if (body.includes('<')) {
            contentType = 'application/xml';
          }
          break;
        case 'graphql':
          if (item.request.body.graphql) {
            body = JSON.stringify(item.request.body.graphql);
            contentType = 'application/json';
          }
          break;
      }
    }

    // Build URL from Postman URL object
    let url = item.request.url.raw;
    if (!url && item.request.url.host) {
      const protocol = item.request.url.protocol || 'https';
      const host = item.request.url.host.join('.');
      const path = '/' + (item.request.url.path || []).join('/');
      url = `${protocol}://${host}${path}`;
    }

    // Get response status from first response if available
    let status = 200;
    if (item.response && item.response.length > 0) {
      status = item.response[0].code || 200;
    }

    const mapping: any = {
      request: {
        method: item.request.method,
        url: url,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        bodyPatterns: body ? [{
          equalTo: body,
          caseInsensitive: false,
    }] : undefined,
      },
      response: {
        status: status,
        headers: {
          'Content-Type': contentType,
        },
        body: '',
      },
    };

    // Add response headers from Postman if available
    if (item.response && item.response.length > 0) {
      const response = item.response[0];
      response.header?.forEach(header => {
        mapping.response.headers[header.key] = header.value;
      });
      
      if (response.body) {
        mapping.response.body = response.body;
      }
    }

    return mapping;
  }

  private generateSummary(result: ImportResult): string {
    const parts = [];
    if (result.created > 0) {
      parts.push(`${result.created} created`);
    }
    if (result.skipped > 0) {
      parts.push(`${result.skipped} skipped`);
    }
    if (result.errors.length > 0) {
      parts.push(`${result.errors.length} errors`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'No changes';
  }
}
