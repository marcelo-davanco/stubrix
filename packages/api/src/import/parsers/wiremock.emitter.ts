import { v4 as uuidv4 } from 'uuid';
import type { ImportIR, ImportIREntry } from '@stubrix/shared';

export interface WireMockMapping {
  id: string;
  name?: string;
  request: {
    method: string;
    url?: string;
    urlPattern?: string;
    urlPath?: string;
    headers?: Record<string, { equalTo: string }>;
    bodyPatterns?: Array<{ equalTo?: string; matchesJsonPath?: string }>;
  };
  response: {
    status: number;
    headers?: Record<string, string>;
    body?: string;
    jsonBody?: unknown;
  };
  metadata?: Record<string, unknown>;
}

export interface EmitterOptions {
  projectId?: string;
  useUrlPath?: boolean;
  includeRequestHeaders?: boolean;
}

export function emitWireMockMappings(
  ir: ImportIR,
  options: EmitterOptions = {},
): WireMockMapping[] {
  const { projectId, useUrlPath = true, includeRequestHeaders = false } = options;

  return ir.entries.map((entry) => toMapping(entry, { projectId, useUrlPath, includeRequestHeaders }));
}

function toMapping(entry: ImportIREntry, options: EmitterOptions): WireMockMapping {
  const { projectId, useUrlPath, includeRequestHeaders } = options;

  const requestHeaders: Record<string, { equalTo: string }> = {};
  if (includeRequestHeaders) {
    for (const h of entry.request.headers) {
      const lower = h.name.toLowerCase();
      if (['content-type', 'accept'].includes(lower)) {
        requestHeaders[h.name] = { equalTo: h.value };
      }
    }
  }

  const responseHeaders: Record<string, string> = {};
  for (const h of entry.response.headers) {
    responseHeaders[h.name] = h.value;
  }

  if (entry.response.bodyMimeType && !responseHeaders['Content-Type']) {
    responseHeaders['Content-Type'] = entry.response.bodyMimeType;
  }

  const bodyPatterns = buildBodyPatterns(entry);

  const requestBlock: WireMockMapping['request'] = {
    method: entry.request.method,
  };

  if (useUrlPath) {
    const path = normalizePathParams(entry.request.path);
    const hasParams = path.includes('{') || path !== entry.request.path;
    requestBlock.urlPath = hasParams ? stripPathParams(path) : path;
  } else {
    requestBlock.url = entry.request.url;
  }

  if (Object.keys(requestHeaders).length > 0) {
    requestBlock.headers = requestHeaders;
  }
  if (bodyPatterns.length > 0) {
    requestBlock.bodyPatterns = bodyPatterns;
  }

  const responseBlock: WireMockMapping['response'] = {
    status: entry.response.status,
  };

  if (Object.keys(responseHeaders).length > 0) {
    responseBlock.headers = responseHeaders;
  }

  if (entry.response.body) {
    const parsed = tryParseJson(entry.response.body);
    if (parsed !== null) {
      responseBlock.jsonBody = parsed;
    } else {
      responseBlock.body = entry.response.body;
    }
  }

  const mapping: WireMockMapping = {
    id: uuidv4(),
    name: entry.name ?? `${entry.request.method} ${entry.request.path} → ${entry.response.status}`,
    request: requestBlock,
    response: responseBlock,
  };

  if (projectId) {
    mapping.metadata = { project: projectId };
  }

  return mapping;
}

function normalizePathParams(path: string): string {
  return path.replace(/\{([^}]+)\}/g, (_, name: string) => `{${name}}`);
}

function stripPathParams(path: string): string {
  return path.replace(/\{[^}]+\}/g, '.*');
}

function buildBodyPatterns(entry: ImportIREntry): Array<{ equalTo?: string }> {
  if (!entry.request.body) return [];
  const body = entry.request.body.trim();
  if (!body) return [];
  return [{ equalTo: body }];
}

function tryParseJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}
