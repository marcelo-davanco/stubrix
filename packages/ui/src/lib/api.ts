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
  LogsResponse,
} from '@stubrix/shared';

interface CreateMockDto {
  request: MockRequest;
  response: MockResponse;
  metadata?: Record<string, unknown>;
}

interface UpdateMockDto {
  request?: MockRequest;
  response?: MockResponse;
}

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
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

export const api = {
  status: {
    get: () => request<StatusResponse>('/status'),
  },

  projects: {
    list: () => request<Project[]>('/projects'),
    get: (id: string) => request<Project>(`/projects/${id}`),
    create: (dto: CreateProjectDto) =>
      request<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    update: (id: string, dto: UpdateProjectDto) =>
      request<Project>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      }),
    delete: (id: string) =>
      request<void>(`/projects/${id}`, { method: 'DELETE' }),
  },

  mocks: {
    list: (projectId: string) =>
      request<MockListItem[]>(`/projects/${projectId}/mocks`),
    get: (projectId: string, id: string) =>
      request<MockDetail>(`/projects/${projectId}/mocks/${id}`),
    create: (projectId: string, dto: CreateMockDto) =>
      request<MockDetail>(`/projects/${projectId}/mocks`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    update: (projectId: string, id: string, dto: UpdateMockDto) =>
      request<MockDetail>(`/projects/${projectId}/mocks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      }),
    delete: (projectId: string, id: string) =>
      request<void>(`/projects/${projectId}/mocks/${id}`, { method: 'DELETE' }),
  },

  recording: {
    status: (projectId: string) =>
      request<RecordingState>(`/projects/${projectId}/recording/status`),
    start: (projectId: string, dto: StartRecordingDto) =>
      request<RecordingState>(`/projects/${projectId}/recording/start`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    stop: (projectId: string) =>
      request<RecordingStopResult>(`/projects/${projectId}/recording/stop`, {
        method: 'POST',
      }),
    snapshot: (projectId: string) =>
      request<SnapshotResult>(`/projects/${projectId}/recording/snapshot`, {
        method: 'POST',
      }),
  },

  logs: {
    get: (limit = 50) => request<LogsResponse>(`/logs?limit=${limit}`),
    clear: () => request<void>('/logs', { method: 'DELETE' }),
  },

  engine: {
    get: () =>
      request<{ engine: string; port: number; healthy: boolean }>('/engine'),
  },
};
