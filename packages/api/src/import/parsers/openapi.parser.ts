import { BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as yaml from 'js-yaml';
import type {
  ImportIR,
  ImportIREntry,
  ImportIRHeader,
  ImportIRQueryParam,
} from '@stubrix/shared';

interface OpenApiInfo {
  title?: string;
  version?: string;
}

interface OpenApiSchema {
  type?: string;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  example?: unknown;
  examples?: unknown;
  default?: unknown;
  enum?: unknown[];
}

interface OpenApiMediaType {
  schema?: OpenApiSchema;
  example?: unknown;
  examples?: Record<string, { value?: unknown; summary?: string }>;
}

interface OpenApiResponse {
  description?: string;
  headers?: Record<string, { schema?: OpenApiSchema; example?: unknown }>;
  content?: Record<string, OpenApiMediaType>;
}

interface OpenApiParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required?: boolean;
  schema?: OpenApiSchema;
  example?: unknown;
}

interface OpenApiRequestBody {
  content?: Record<string, OpenApiMediaType>;
  required?: boolean;
}

interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, OpenApiResponse>;
}

interface OpenApiPathItem {
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  patch?: OpenApiOperation;
  delete?: OpenApiOperation;
  head?: OpenApiOperation;
  options?: OpenApiOperation;
  parameters?: OpenApiParameter[];
}

interface OpenApi3 {
  openapi?: string;
  swagger?: string;
  info?: OpenApiInfo;
  paths?: Record<string, OpenApiPathItem>;
  components?: { schemas?: Record<string, OpenApiSchema> };
}

const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
] as const;

export function parseOpenApi(
  content: string,
  baseUrl = 'http://localhost',
): ImportIR {
  let spec: OpenApi3;
  try {
    spec = (yaml.load(content) ?? JSON.parse(content)) as OpenApi3;
  } catch {
    try {
      spec = JSON.parse(content) as OpenApi3;
    } catch {
      throw new BadRequestException(
        'Invalid OpenAPI/Swagger spec: could not parse YAML or JSON',
      );
    }
  }

  if (!spec.paths && !spec.openapi && !spec.swagger) {
    throw new BadRequestException(
      'Invalid OpenAPI/Swagger spec: missing paths or version',
    );
  }

  const isSwagger2 = Boolean(spec.swagger?.startsWith('2'));
  const entries: ImportIREntry[] = [];

  for (const [pathTemplate, pathItem] of Object.entries(spec.paths ?? {})) {
    const sharedParams = pathItem.parameters ?? [];

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;

      const allParams = mergeParams(sharedParams, operation.parameters ?? []);
      const queryParams: ImportIRQueryParam[] = allParams
        .filter((p) => p.in === 'query')
        .map((p) => ({
          name: p.name,
          value: String(
            p.example ?? p.schema?.example ?? p.schema?.default ?? '',
          ),
        }));

      const headers: ImportIRHeader[] = allParams
        .filter((p) => p.in === 'header')
        .map((p) => ({ name: p.name, value: String(p.example ?? '') }));

      const url = `${baseUrl}${pathTemplate}`;
      const requestBodyContent = operation.requestBody?.content ?? {};
      const firstMimeType = Object.keys(requestBodyContent)[0];
      const requestBody = firstMimeType
        ? serializeExample(requestBodyContent[firstMimeType], spec)
        : undefined;

      for (const [statusCode, responseObj] of Object.entries(
        operation.responses ?? { '200': {} },
      )) {
        const status = parseInt(statusCode, 10);
        if (isNaN(status)) continue;

        const responseContent = responseObj.content ?? {};
        const responseMimeType =
          Object.keys(responseContent)[0] ?? 'application/json';
        const responseBody =
          Object.keys(responseContent).length > 0
            ? serializeExample(responseContent[responseMimeType], spec)
            : undefined;

        const responseHeaders: ImportIRHeader[] = Object.entries(
          responseObj.headers ?? {},
        ).map(([name, h]) => ({ name, value: String(h.example ?? '') }));

        entries.push({
          id: uuidv4(),
          name:
            operation.operationId ??
            operation.summary ??
            `${method.toUpperCase()} ${pathTemplate}`,
          description: operation.description ?? operation.summary,
          tags: operation.tags,
          request: {
            method: method.toUpperCase(),
            url,
            path: pathTemplate,
            headers: [
              ...headers,
              ...(firstMimeType
                ? [{ name: 'Content-Type', value: firstMimeType }]
                : []),
            ],
            queryParams,
            body: requestBody,
            bodyMimeType: firstMimeType,
          },
          response: {
            status,
            headers: [
              ...(responseMimeType
                ? [{ name: 'Content-Type', value: responseMimeType }]
                : []),
              ...responseHeaders,
            ],
            body: responseBody,
            bodyMimeType: responseMimeType,
          },
        });
      }
    }
  }

  return {
    format: isSwagger2 ? 'swagger' : 'openapi',
    title: spec.info?.title,
    version: spec.info?.version,
    entries,
    deduplicated: false,
  };
}

function mergeParams(
  shared: OpenApiParameter[],
  local: OpenApiParameter[],
): OpenApiParameter[] {
  const merged = [...shared];
  for (const param of local) {
    const idx = merged.findIndex(
      (p) => p.name === param.name && p.in === param.in,
    );
    if (idx >= 0) merged[idx] = param;
    else merged.push(param);
  }
  return merged;
}

function serializeExample(
  media: OpenApiMediaType,
  spec: OpenApi3,
): string | undefined {
  const value =
    media.example ??
    Object.values(media.examples ?? {})[0]?.value ??
    generateFromSchema(media.schema, spec);

  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function generateFromSchema(
  schema?: OpenApiSchema,
  spec?: OpenApi3,
  depth = 0,
): unknown {
  if (!schema || depth > 3) return undefined;

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];

  switch (schema.type) {
    case 'object': {
      const obj: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(schema.properties ?? {})) {
        obj[key] = generateFromSchema(prop, spec, depth + 1);
      }
      return obj;
    }
    case 'array':
      return [generateFromSchema(schema.items, spec, depth + 1)];
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return false;
    default:
      return {};
  }
}
