export interface MockRequest {
  method: string;
  url?: string;
  urlPattern?: string;
  urlPath?: string;
  urlPathPattern?: string;
  headers?: Record<string, unknown>;
  bodyPatterns?: unknown[];
}

export interface MockResponse {
  status: number;
  headers?: Record<string, string>;
  body?: string;
  bodyFileName?: string;
  fixedDelayMilliseconds?: number;
}

export interface MockMetadata {
  project?: string;
  [key: string]: unknown;
}

export interface Mock {
  id: string;
  request: MockRequest;
  response: MockResponse;
  metadata?: MockMetadata;
}

export interface MockListItem {
  id: string;
  filename: string;
  projectId: string;
  request: {
    method: string;
    url: string;
  };
  response: {
    status: number;
    hasBodyFile: boolean;
    bodyFileName?: string;
    bodyPreview?: string;
  };
}

export interface MockDetail extends MockListItem {
  mapping: Mock;
  body?: string;
}
