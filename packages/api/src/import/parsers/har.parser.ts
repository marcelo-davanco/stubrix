import { BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type {
  ImportIR,
  ImportIREntry,
  ImportIRHeader,
  ImportIRQueryParam,
} from '@stubrix/shared';

interface HarHeader {
  name: string;
  value: string;
}

interface HarQueryParam {
  name: string;
  value: string;
}

interface HarEntry {
  request: {
    method: string;
    url: string;
    headers?: HarHeader[];
    queryString?: HarQueryParam[];
    postData?: { mimeType: string; text?: string };
  };
  response: {
    status: number;
    statusText?: string;
    headers?: HarHeader[];
    content?: { mimeType?: string; text?: string; encoding?: string };
  };
}

interface HarFile {
  log: {
    version?: string;
    entries: HarEntry[];
  };
}

export function parseHar(content: string, deduplicate = true): ImportIR {
  let har: HarFile;
  try {
    har = JSON.parse(content) as HarFile;
  } catch {
    throw new BadRequestException('Invalid JSON in HAR file');
  }

  if (!har.log?.entries || !Array.isArray(har.log.entries)) {
    throw new BadRequestException('Invalid HAR format: missing log.entries');
  }

  const seen = new Set<string>();
  const entries: ImportIREntry[] = [];

  for (const entry of har.log.entries) {
    try {
      const { request, response } = entry;
      const parsedUrl = safeParseUrl(request.url);
      const path = parsedUrl?.pathname ?? request.url;

      const dedupKey = `${request.method.toUpperCase()}:${path}:${response.status}`;
      if (deduplicate && seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const headers: ImportIRHeader[] = (request.headers ?? [])
        .filter((h) => !isInternalHeader(h.name))
        .map((h) => ({ name: h.name, value: h.value }));

      const queryParams: ImportIRQueryParam[] = (request.queryString ?? []).map(
        (q) => ({ name: q.name, value: q.value }),
      );

      const responseHeaders: ImportIRHeader[] = (response.headers ?? [])
        .filter((h) => !isInternalHeader(h.name))
        .map((h) => ({ name: h.name, value: h.value }));

      const responseBody = decodeHarBody(response.content);

      entries.push({
        id: uuidv4(),
        request: {
          method: request.method.toUpperCase(),
          url: request.url,
          path,
          headers,
          queryParams,
          body: request.postData?.text,
          bodyMimeType: request.postData?.mimeType,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: responseBody,
          bodyMimeType: response.content?.mimeType,
        },
      });
    } catch {
      // skip malformed entries
    }
  }

  return {
    format: 'har',
    entries,
    deduplicated: deduplicate,
  };
}

function safeParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    try {
      return new URL(url, 'http://localhost');
    } catch {
      return null;
    }
  }
}

function decodeHarBody(content?: {
  text?: string;
  encoding?: string;
}): string | undefined {
  if (!content?.text) return undefined;
  if (content.encoding === 'base64') {
    try {
      return Buffer.from(content.text, 'base64').toString('utf-8');
    } catch {
      return content.text;
    }
  }
  return content.text;
}

function isInternalHeader(name: string): boolean {
  const internal = [
    ':method',
    ':path',
    ':scheme',
    ':authority',
    ':status',
    'x-chrome-id-consistency-request',
  ];
  return internal.includes(name.toLowerCase());
}
