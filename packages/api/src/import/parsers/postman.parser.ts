import { BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type {
  ImportIR,
  ImportIREntry,
  ImportIRHeader,
  ImportIRQueryParam,
} from '@stubrix/shared';

interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
}

interface PostmanQueryParam {
  key: string;
  value: string;
  disabled?: boolean;
}

interface PostmanUrl {
  raw?: string;
  protocol?: string;
  host?: string | string[];
  path?: string | string[];
  query?: PostmanQueryParam[];
}

interface PostmanBody {
  mode?: string;
  raw?: string;
  graphql?: { query?: string; variables?: string };
  urlencoded?: PostmanHeader[];
  formdata?: PostmanHeader[];
  options?: { raw?: { language?: string } };
}

interface PostmanResponse {
  name?: string;
  status?: string;
  code?: number;
  header?: PostmanHeader[];
  body?: string;
}

interface PostmanRequest {
  method: string;
  header?: PostmanHeader[];
  body?: PostmanBody;
  url: PostmanUrl | string;
  description?: string;
}

interface PostmanItem {
  name?: string;
  request?: PostmanRequest;
  response?: PostmanResponse[];
  item?: PostmanItem[];
  description?: string;
}

interface PostmanCollection {
  info?: { name?: string; description?: string; schema?: string };
  item?: PostmanItem[];
}

const POSTMAN_VAR_RE = /\{\{([^}]+)\}\}/g;

export function parsePostman(content: string, deduplicate = true): ImportIR {
  let collection: PostmanCollection;
  try {
    collection = JSON.parse(content) as PostmanCollection;
  } catch {
    throw new BadRequestException('Invalid JSON in Postman collection');
  }

  if (!collection.item && !(collection as PostmanItem).request) {
    throw new BadRequestException('Invalid Postman collection format: missing item array');
  }

  const seen = new Set<string>();
  const entries: ImportIREntry[] = [];

  const items = flattenItems(collection.item ?? []);

  for (const item of items) {
    if (!item.request) continue;
    try {
      const entry = convertItem(item);
      if (!entry) continue;

      const dedupKey = `${entry.request.method}:${entry.request.path}:${entry.response.status}`;
      if (deduplicate && seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      entries.push(entry);
    } catch {
      // skip malformed items
    }
  }

  return {
    format: 'postman',
    title: collection.info?.name,
    entries,
    deduplicated: deduplicate,
  };
}

function flattenItems(items: PostmanItem[], parentName = ''): PostmanItem[] {
  const result: PostmanItem[] = [];
  for (const item of items) {
    if (item.item && item.item.length > 0) {
      const folderName = parentName ? `${parentName}/${item.name ?? ''}` : (item.name ?? '');
      result.push(...flattenItems(item.item, folderName));
    } else {
      result.push({ ...item, name: parentName ? `${parentName}/${item.name ?? ''}` : item.name });
    }
  }
  return result;
}

function convertItem(item: PostmanItem): ImportIREntry | null {
  const req = item.request!;
  const urlObj = resolveUrl(req.url);
  if (!urlObj) return null;

  const headers: ImportIRHeader[] = (req.header ?? [])
    .filter((h) => !h.disabled)
    .map((h) => ({ name: h.key, value: resolveVars(h.value) }));

  const queryParams: ImportIRQueryParam[] = (urlObj.query ?? [])
    .filter((q) => !q.disabled)
    .map((q) => ({ name: q.key, value: resolveVars(q.value) }));

  const body = resolveBody(req.body);
  const mimeType = detectMimeType(req.body);

  const firstResponse = item.response?.[0];
  const responseHeaders: ImportIRHeader[] = (firstResponse?.header ?? []).map((h) => ({
    name: h.key,
    value: h.value,
  }));

  return {
    id: uuidv4(),
    name: item.name,
    description: typeof req.description === 'string' ? req.description : undefined,
    request: {
      method: req.method.toUpperCase(),
      url: urlObj.raw,
      path: urlObj.path,
      headers,
      queryParams,
      body,
      bodyMimeType: mimeType,
    },
    response: {
      status: firstResponse?.code ?? 200,
      statusText: firstResponse?.status,
      headers: responseHeaders,
      body: firstResponse?.body,
    },
  };
}

function resolveUrl(url: PostmanUrl | string): { raw: string; path: string; query: PostmanQueryParam[] } | null {
  if (typeof url === 'string') {
    const raw = resolveVars(url);
    try {
      const parsed = new URL(raw);
      return { raw, path: parsed.pathname, query: [] };
    } catch {
      return { raw, path: raw, query: [] };
    }
  }

  const raw = resolveVars(url.raw ?? '');
  const pathParts = Array.isArray(url.path)
    ? url.path
    : typeof url.path === 'string'
    ? url.path.split('/')
    : [];
  const path = '/' + pathParts.map((p) => resolveVars(p)).join('/').replace(/^\//, '');
  const query = url.query ?? [];

  return { raw, path, query };
}

function resolveVars(str: string): string {
  return str.replace(POSTMAN_VAR_RE, (_, varName: string) => `{{${varName}}}`);
}

function resolveBody(body?: PostmanBody): string | undefined {
  if (!body) return undefined;
  switch (body.mode) {
    case 'raw':
      return body.raw;
    case 'graphql':
      if (body.graphql) {
        return JSON.stringify({ query: body.graphql.query, variables: body.graphql.variables });
      }
      return undefined;
    case 'urlencoded':
      return (body.urlencoded ?? [])
        .filter((f) => !f.disabled)
        .map((f) => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`)
        .join('&');
    default:
      return undefined;
  }
}

function detectMimeType(body?: PostmanBody): string | undefined {
  if (!body) return undefined;
  switch (body.mode) {
    case 'raw':
      return body.options?.raw?.language === 'xml'
        ? 'application/xml'
        : 'application/json';
    case 'urlencoded':
      return 'application/x-www-form-urlencoded';
    case 'graphql':
      return 'application/json';
    default:
      return undefined;
  }
}
