import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface TemplateVariable {
  name: string;
  description?: string;
  default?: string;
  required?: boolean;
}

export interface EnvironmentTemplate {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  variables: TemplateVariable[];
  mocks: Array<{
    filename: string;
    content: string;
  }>;
  createdAt: string;
  builtIn?: boolean;
}

const BUILT_IN_TEMPLATES: EnvironmentTemplate[] = [
  {
    id: 'builtin-rest-crud',
    name: 'REST CRUD API',
    description: 'Complete CRUD mock for a REST resource',
    tags: ['rest', 'crud'],
    builtIn: true,
    variables: [
      {
        name: 'RESOURCE',
        description: 'Resource name (e.g. users)',
        required: true,
        default: 'items',
      },
      {
        name: 'BASE_PATH',
        description: 'Base URL path',
        required: false,
        default: '/api',
      },
    ],
    mocks: [
      {
        filename: '{{RESOURCE}}_list.json',
        content: JSON.stringify(
          {
            request: { method: 'GET', urlPath: '{{BASE_PATH}}/{{RESOURCE}}' },
            response: {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
              body: '[]',
            },
          },
          null,
          2,
        ),
      },
      {
        filename: '{{RESOURCE}}_create.json',
        content: JSON.stringify(
          {
            request: { method: 'POST', urlPath: '{{BASE_PATH}}/{{RESOURCE}}' },
            response: {
              status: 201,
              headers: { 'Content-Type': 'application/json' },
              body: '{"id":"1"}',
            },
          },
          null,
          2,
        ),
      },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-auth-flow',
    name: 'Authentication Flow',
    description: 'Login, refresh and logout mock endpoints',
    tags: ['auth', 'jwt'],
    builtIn: true,
    variables: [
      {
        name: 'AUTH_PATH',
        description: 'Auth base path',
        required: false,
        default: '/api/auth',
      },
    ],
    mocks: [
      {
        filename: 'auth_login.json',
        content: JSON.stringify(
          {
            request: { method: 'POST', urlPath: '{{AUTH_PATH}}/login' },
            response: {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
              body: '{"token":"mock-jwt-token","expiresIn":3600}',
            },
          },
          null,
          2,
        ),
      },
      {
        filename: 'auth_refresh.json',
        content: JSON.stringify(
          {
            request: { method: 'POST', urlPath: '{{AUTH_PATH}}/refresh' },
            response: {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
              body: '{"token":"mock-refreshed-token"}',
            },
          },
          null,
          2,
        ),
      },
      {
        filename: 'auth_logout.json',
        content: JSON.stringify(
          {
            request: { method: 'POST', urlPath: '{{AUTH_PATH}}/logout' },
            response: { status: 204 },
          },
          null,
          2,
        ),
      },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-pagination',
    name: 'Paginated List',
    description: 'List endpoint with pagination metadata',
    tags: ['pagination', 'rest'],
    builtIn: true,
    variables: [
      {
        name: 'RESOURCE',
        description: 'Resource name',
        required: true,
        default: 'items',
      },
      {
        name: 'BASE_PATH',
        description: 'Base path',
        required: false,
        default: '/api',
      },
    ],
    mocks: [
      {
        filename: '{{RESOURCE}}_paginated.json',
        content: JSON.stringify(
          {
            request: { method: 'GET', urlPath: '{{BASE_PATH}}/{{RESOURCE}}' },
            response: {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
              body: '{"data":[],"meta":{"page":1,"pageSize":20,"total":0}}',
            },
          },
          null,
          2,
        ),
      },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-error-scenarios',
    name: 'Error Scenarios',
    description: '400, 401, 403, 404, 500 error mocks for an endpoint',
    tags: ['errors', 'testing'],
    builtIn: true,
    variables: [
      {
        name: 'RESOURCE_PATH',
        description: 'Resource path',
        required: true,
        default: '/api/resource',
      },
    ],
    mocks: [
      {
        filename: 'error_400.json',
        content: JSON.stringify(
          {
            request: {
              method: 'GET',
              urlPath: '{{RESOURCE_PATH}}/bad-request',
            },
            response: { status: 400, body: '{"error":"Bad Request"}' },
          },
          null,
          2,
        ),
      },
      {
        filename: 'error_401.json',
        content: JSON.stringify(
          {
            request: {
              method: 'GET',
              urlPath: '{{RESOURCE_PATH}}/unauthorized',
            },
            response: { status: 401, body: '{"error":"Unauthorized"}' },
          },
          null,
          2,
        ),
      },
      {
        filename: 'error_404.json',
        content: JSON.stringify(
          {
            request: { method: 'GET', urlPath: '{{RESOURCE_PATH}}/not-found' },
            response: { status: 404, body: '{"error":"Not Found"}' },
          },
          null,
          2,
        ),
      },
      {
        filename: 'error_500.json',
        content: JSON.stringify(
          {
            request: {
              method: 'GET',
              urlPath: '{{RESOURCE_PATH}}/server-error',
            },
            response: {
              status: 500,
              body: '{"error":"Internal Server Error"}',
            },
          },
          null,
          2,
        ),
      },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private readonly storageDir: string;
  private readonly templatesFile: string;

  constructor(private readonly config: ConfigService) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ??
      path.join(process.cwd(), '../../mocks');
    this.storageDir = path.join(mocksDir, 'templates');
    this.templatesFile = path.join(this.storageDir, 'custom.json');
    fs.mkdirSync(this.storageDir, { recursive: true });
  }

  listTemplates(includeBuiltIn = true): EnvironmentTemplate[] {
    const custom = this.loadCustom();
    return includeBuiltIn ? [...BUILT_IN_TEMPLATES, ...custom] : custom;
  }

  getTemplate(id: string): EnvironmentTemplate | undefined {
    return this.listTemplates().find((t) => t.id === id);
  }

  createTemplate(
    name: string,
    mocks: EnvironmentTemplate['mocks'],
    variables: TemplateVariable[],
    description?: string,
    tags?: string[],
  ): EnvironmentTemplate {
    const template: EnvironmentTemplate = {
      id: uuidv4(),
      name,
      description,
      tags,
      variables,
      mocks,
      createdAt: new Date().toISOString(),
    };
    const custom = this.loadCustom();
    custom.push(template);
    fs.writeFileSync(this.templatesFile, JSON.stringify(custom, null, 2));
    this.logger.log(`Template created: ${name}`);
    return template;
  }

  deleteTemplate(id: string): void {
    const template = this.getTemplate(id);
    if (!template) throw new Error(`Template not found: ${id}`);
    if (template.builtIn) throw new Error('Cannot delete built-in templates');
    const custom = this.loadCustom().filter((t) => t.id !== id);
    fs.writeFileSync(this.templatesFile, JSON.stringify(custom, null, 2));
  }

  applyTemplate(
    id: string,
    variables: Record<string, string>,
    outputDir: string,
  ): { created: string[]; warnings: string[] } {
    const template = this.getTemplate(id);
    if (!template) throw new Error(`Template not found: ${id}`);

    const created: string[] = [];
    const warnings: string[] = [];

    for (const v of template.variables) {
      if (v.required && !variables[v.name] && !v.default) {
        warnings.push(`Missing required variable: ${v.name}`);
      }
    }

    fs.mkdirSync(outputDir, { recursive: true });

    for (const mock of template.mocks) {
      let filename = mock.filename;
      let content = mock.content;

      for (const [key, value] of Object.entries(variables)) {
        const re = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        filename = filename.replace(re, value);
        content = content.replace(re, value);
      }

      for (const v of template.variables) {
        if (v.default) {
          const re = new RegExp(`\\{\\{${v.name}\\}\\}`, 'g');
          filename = filename.replace(re, v.default);
          content = content.replace(re, v.default);
        }
      }

      const safeFilename = path.basename(filename);
      const filePath = path.join(outputDir, safeFilename);
      fs.writeFileSync(filePath, content);
      created.push(filename);
    }

    this.logger.log(
      `Template "${template.name}" applied: ${created.length} files created`,
    );
    return { created, warnings };
  }

  private loadCustom(): EnvironmentTemplate[] {
    if (!fs.existsSync(this.templatesFile)) return [];
    try {
      return JSON.parse(
        fs.readFileSync(this.templatesFile, 'utf-8'),
      ) as EnvironmentTemplate[];
    } catch {
      return [];
    }
  }
}
