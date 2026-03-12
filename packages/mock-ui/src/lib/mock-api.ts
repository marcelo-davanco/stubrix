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
};
