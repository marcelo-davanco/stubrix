export type ImportIRFormat = 'har' | 'postman' | 'openapi' | 'swagger' | 'unknown';

export interface ImportIRHeader {
  name: string;
  value: string;
}

export interface ImportIRQueryParam {
  name: string;
  value: string;
}

export interface ImportIRRequest {
  method: string;
  url: string;
  path: string;
  headers: ImportIRHeader[];
  queryParams: ImportIRQueryParam[];
  body?: string;
  bodyMimeType?: string;
}

export interface ImportIRResponse {
  status: number;
  statusText?: string;
  headers: ImportIRHeader[];
  body?: string;
  bodyMimeType?: string;
}

export interface ImportIREntry {
  id: string;
  name?: string;
  description?: string;
  request: ImportIRRequest;
  response: ImportIRResponse;
  tags?: string[];
}

export interface ImportIR {
  format: ImportIRFormat;
  source?: string;
  title?: string;
  version?: string;
  entries: ImportIREntry[];
  deduplicated?: boolean;
}

export interface ImportPreview {
  format: ImportIRFormat;
  title?: string;
  totalEntries: number;
  entries: Array<{
    id: string;
    name?: string;
    method: string;
    path: string;
    responseStatus: number;
  }>;
}

export interface ImportOptions {
  projectId: string;
  deduplicate?: boolean;
  overwrite?: boolean;
  filterMethods?: string[];
  filterStatusCodes?: number[];
  baseUrl?: string;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
  summary: string;
  format?: ImportIRFormat;
}
