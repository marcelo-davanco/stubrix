import type {
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  MockListItem,
  MockDetail,
  MockRequest,
  MockResponse,
  StatusResponse,
  RecordingState,
  StartRecordingDto,
  RecordingStopResult,
  SnapshotResult,
} from '@stubrix/shared';

export type CreateMockDto = {
  request: MockRequest;
  response: MockResponse;
  metadata?: Record<string, unknown>;
};

export type UpdateMockDto = {
  request?: MockRequest;
  response?: MockResponse;
};

export type ScenarioMeta = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  mockCount: number;
  createdAt: string;
};

export type ScenarioBundle = ScenarioMeta & { mocks: MockDetail[] };

export type ScenarioDiff = {
  added: MockDetail[];
  removed: MockDetail[];
  changed: Array<{ before: MockDetail; after: MockDetail }>;
};

export type StatefulMock = {
  id: string;
  name: string;
  urlPattern: string;
  method: string;
  stateKey: string;
  responses: Record<string, unknown>;
  createdAt: string;
};

export type CreateStatefulMockDto = Omit<StatefulMock, 'id' | 'createdAt'>;
export type UpdateStatefulMockDto = Partial<CreateStatefulMockDto>;

export type RagQueryResult = { answer: string; sources: string[] };
export type MockSuggestion = { mapping: unknown; explanation: string };
export type DataSuggestion = { sql: string; explanation: string };

export type FaultRule = {
  type: string;
  probability: number;
  delayMs?: number;
  errorStatus?: number;
  errorMessage?: string;
};

export type FaultProfile = {
  id: string;
  name: string;
  description?: string;
  urlPattern?: string;
  methods?: string[];
  faults: FaultRule[];
  enabled: boolean;
  createdAt: string;
};

export type ChaosPreset = { id: string; name: string; description: string };

export type CreateChaosProfileDto = {
  name: string;
  description?: string;
  urlPattern?: string;
  methods?: string[];
  faults: FaultRule[];
};

export type LintRule = {
  code: string;
  description: string;
  severity: 'error' | 'warn' | 'info' | 'hint';
};

export type LintResult = {
  valid: boolean;
  errors: Array<{ message: string; path: string; severity: string }>;
  warnings: Array<{ message: string; path: string; severity: string }>;
};

export type CoverageReport = {
  coveragePercent: number;
  totalEndpoints: number;
  coveredEndpoints: number;
  entries: Array<{ method: string; path: string; status: string }>;
};

export type WebhookEvent = {
  id: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  receivedAt: string;
  signature?: string;
  verified?: boolean;
};

export type WebhookSimulation = {
  id: string;
  name: string;
  targetUrl: string;
  method: string;
  headers: Record<string, string>;
  payload: unknown;
  scheduleMs?: number;
  createdAt: string;
};

export type CreateWebhookSimulationDto = {
  name: string;
  targetUrl: string;
  method?: string;
  headers?: Record<string, string>;
  payload?: unknown;
  scheduleMs?: number;
};

export type TemplateVariable = { name: string; description?: string; default?: string };

export type MockTemplate = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  variables: TemplateVariable[];
  mocks: Array<{ filename: string; content: string }>;
  builtIn?: boolean;
};

export type CreateTemplateDto = {
  name: string;
  description?: string;
  tags?: string[];
  variables: TemplateVariable[];
  mocks: Array<{ filename: string; content: string }>;
};

export type MetricsSummary = {
  counters: Record<string, number>;
  histograms: Record<string, unknown>;
};

let _baseUrl = '/api';

export function configureMockApi(baseUrl: string): void {
  _baseUrl = baseUrl;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${_baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const mockApi = {
  status: {
    get: (): Promise<StatusResponse> =>
      request<StatusResponse>('/status'),
  },

  engine: {
    get: (): Promise<{ engine: string; port: number; healthy: boolean }> =>
      request<{ engine: string; port: number; healthy: boolean }>('/engine'),
  },

  projects: {
    list: (): Promise<Project[]> =>
      request<Project[]>('/projects'),
    get: (id: string): Promise<Project> =>
      request<Project>(`/projects/${id}`),
    create: (dto: CreateProjectDto): Promise<Project> =>
      request<Project>('/projects', { method: 'POST', body: JSON.stringify(dto) }),
    update: (id: string, dto: UpdateProjectDto): Promise<Project> =>
      request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    delete: (id: string): Promise<void> =>
      request<void>(`/projects/${id}`, { method: 'DELETE' }),
  },

  mocks: {
    list: (projectId: string): Promise<MockListItem[]> =>
      request<MockListItem[]>(`/projects/${projectId}/mocks`),
    get: (projectId: string, id: string): Promise<MockDetail> =>
      request<MockDetail>(`/projects/${projectId}/mocks/${id}`),
    create: (projectId: string, dto: CreateMockDto): Promise<MockDetail> =>
      request<MockDetail>(`/projects/${projectId}/mocks`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    update: (projectId: string, id: string, dto: UpdateMockDto): Promise<MockDetail> =>
      request<MockDetail>(`/projects/${projectId}/mocks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      }),
    delete: (projectId: string, id: string): Promise<void> =>
      request<void>(`/projects/${projectId}/mocks/${id}`, { method: 'DELETE' }),
  },

  recording: {
    status: (projectId: string): Promise<RecordingState> =>
      request<RecordingState>(`/projects/${projectId}/recording/status`),
    start: (projectId: string, dto: StartRecordingDto): Promise<RecordingState> =>
      request<RecordingState>(`/projects/${projectId}/recording/start`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    stop: (projectId: string): Promise<RecordingStopResult> =>
      request<RecordingStopResult>(`/projects/${projectId}/recording/stop`, { method: 'POST' }),
    snapshot: (projectId: string): Promise<SnapshotResult> =>
      request<SnapshotResult>(`/projects/${projectId}/recording/snapshot`, { method: 'POST' }),
  },

  scenarios: {
    list: (): Promise<ScenarioMeta[]> =>
      request<ScenarioMeta[]>('/scenarios'),
    get: (id: string): Promise<ScenarioBundle> =>
      request<ScenarioBundle>(`/scenarios/${id}`),
    capture: (dto: { name: string; description?: string; tags?: string[] }): Promise<ScenarioBundle> =>
      request<ScenarioBundle>('/scenarios/capture', { method: 'POST', body: JSON.stringify(dto) }),
    restore: (id: string): Promise<{ restored: number; name: string }> =>
      request<{ restored: number; name: string }>(`/scenarios/${id}/restore`, { method: 'POST' }),
    delete: (id: string): Promise<void> =>
      request<void>(`/scenarios/${id}`, { method: 'DELETE' }),
    diff: (idA: string, idB: string): Promise<ScenarioDiff> =>
      request<ScenarioDiff>(`/scenarios/${idA}/diff/${idB}`),
  },

  stateful: {
    list: (): Promise<StatefulMock[]> =>
      request<StatefulMock[]>('/stateful/mocks'),
    get: (id: string): Promise<StatefulMock> =>
      request<StatefulMock>(`/stateful/mocks/${id}`),
    create: (dto: CreateStatefulMockDto): Promise<StatefulMock> =>
      request<StatefulMock>('/stateful/mocks', { method: 'POST', body: JSON.stringify(dto) }),
    update: (id: string, dto: UpdateStatefulMockDto): Promise<StatefulMock> =>
      request<StatefulMock>(`/stateful/mocks/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    delete: (id: string): Promise<void> =>
      request<void>(`/stateful/mocks/${id}`, { method: 'DELETE' }),
    test: (id: string, requestBody?: unknown): Promise<unknown> =>
      request<unknown>(`/stateful/mocks/${id}/test`, { method: 'POST', body: JSON.stringify(requestBody ?? {}) }),
    preview: (id: string): Promise<unknown> =>
      request<unknown>(`/stateful/mocks/${id}/preview`),
  },

  intelligence: {
    health: (): Promise<{ available: boolean }> =>
      request<{ available: boolean }>('/intelligence/health'),
    query: (question: string): Promise<RagQueryResult> =>
      request<RagQueryResult>('/intelligence/query', { method: 'POST', body: JSON.stringify({ question }) }),
    suggestMock: (description: string): Promise<MockSuggestion> =>
      request<MockSuggestion>('/intelligence/suggest/mock', { method: 'POST', body: JSON.stringify({ description }) }),
    suggestData: (description: string): Promise<DataSuggestion> =>
      request<DataSuggestion>('/intelligence/suggest/data', { method: 'POST', body: JSON.stringify({ description }) }),
    index: (): Promise<{ indexed: number }> =>
      request<{ indexed: number }>('/intelligence/index', { method: 'POST' }),
  },

  chaos: {
    listProfiles: (): Promise<FaultProfile[]> =>
      request<FaultProfile[]>('/chaos/profiles'),
    createProfile: (dto: CreateChaosProfileDto): Promise<FaultProfile> =>
      request<FaultProfile>('/chaos/profiles', { method: 'POST', body: JSON.stringify(dto) }),
    toggleProfile: (id: string, enabled: boolean): Promise<FaultProfile> =>
      request<FaultProfile>(`/chaos/profiles/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
    deleteProfile: (id: string): Promise<void> =>
      request<void>(`/chaos/profiles/${id}`, { method: 'DELETE' }),
    listPresets: (): Promise<ChaosPreset[]> =>
      request<ChaosPreset[]>('/chaos/presets'),
    applyPreset: (preset: string, urlPattern?: string): Promise<FaultProfile> =>
      request<FaultProfile>('/chaos/presets/apply', { method: 'POST', body: JSON.stringify({ preset, urlPattern }) }),
  },

  contracts: {
    health: (): Promise<{ available: boolean }> =>
      request<{ available: boolean }>('/contracts/health'),
    list: (): Promise<unknown[]> =>
      request<unknown[]>('/contracts/pacts'),
    canIDeploy: (pacticipant: string, version: string): Promise<{ deployable: boolean; reason: string }> =>
      request<{ deployable: boolean; reason: string }>(`/contracts/can-i-deploy?pacticipant=${encodeURIComponent(pacticipant)}&version=${encodeURIComponent(version)}`),
  },

  coverage: {
    analyze: (content: string, specFile?: string): Promise<CoverageReport> =>
      request<CoverageReport>('/coverage/analyze', { method: 'POST', body: JSON.stringify({ content, specFile }) }),
    score: (specUrl?: string): Promise<{ coverage: number; summary: string }> =>
      request<{ coverage: number; summary: string }>(`/coverage/score${specUrl ? `?specUrl=${encodeURIComponent(specUrl)}` : ''}`),
    textReport: (content: string, specFile?: string): Promise<{ report: string }> =>
      request<{ report: string }>('/coverage/report/text', { method: 'POST', body: JSON.stringify({ content, specFile }) }),
  },

  governance: {
    lint: (content: string): Promise<LintResult> =>
      request<LintResult>('/governance/lint', { method: 'POST', body: JSON.stringify({ content }) }),
    rules: (): Promise<{ rules: LintRule[] }> =>
      request<{ rules: LintRule[] }>('/governance/lint/rules'),
  },

  webhooks: {
    listEvents: (limit?: number, endpoint?: string): Promise<WebhookEvent[]> => {
      const params = new URLSearchParams();
      if (limit) params.set('limit', String(limit));
      if (endpoint) params.set('endpoint', endpoint);
      return request<WebhookEvent[]>(`/webhooks/events${params.size ? `?${params}` : ''}`);
    },
    getEvent: (id: string): Promise<WebhookEvent> =>
      request<WebhookEvent>(`/webhooks/events/${id}`),
    replayEvent: (id: string, targetUrl?: string): Promise<{ status: number; ok: boolean }> =>
      request<{ status: number; ok: boolean }>(`/webhooks/events/${id}/replay${targetUrl ? `?targetUrl=${encodeURIComponent(targetUrl)}` : ''}`, { method: 'POST' }),
    clearEvents: (): Promise<void> =>
      request<void>('/webhooks/events', { method: 'DELETE' }),
    listSimulations: (): Promise<WebhookSimulation[]> =>
      request<WebhookSimulation[]>('/webhooks/simulations'),
    createSimulation: (dto: CreateWebhookSimulationDto): Promise<WebhookSimulation> =>
      request<WebhookSimulation>('/webhooks/simulations', { method: 'POST', body: JSON.stringify(dto) }),
    fireSimulation: (id: string): Promise<{ status: number; ok: boolean }> =>
      request<{ status: number; ok: boolean }>(`/webhooks/simulations/${id}/fire`, { method: 'POST' }),
  },

  templates: {
    list: (builtIn?: boolean): Promise<MockTemplate[]> =>
      request<MockTemplate[]>(`/templates${builtIn === false ? '?builtIn=false' : ''}`),
    get: (id: string): Promise<MockTemplate> =>
      request<MockTemplate>(`/templates/${id}`),
    create: (dto: CreateTemplateDto): Promise<MockTemplate> =>
      request<MockTemplate>('/templates', { method: 'POST', body: JSON.stringify(dto) }),
    delete: (id: string): Promise<void> =>
      request<void>(`/templates/${id}`, { method: 'DELETE' }),
    apply: (id: string, variables: Record<string, string>, outputDir?: string): Promise<{ applied: number }> =>
      request<{ applied: number }>(`/templates/${id}/apply`, { method: 'POST', body: JSON.stringify({ variables, outputDir }) }),
  },

  metrics: {
    summary: (): Promise<MetricsSummary> =>
      request<MetricsSummary>('/metrics/summary'),
    health: (): Promise<unknown> =>
      request<unknown>('/metrics/health'),
  },
};
