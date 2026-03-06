import type { DatabaseInfo, Engine, Project, Snapshot } from '@stubrix/shared'

export type ProjectDatabaseConfigItem = {
  id: string
  projectId: string
  engine: 'mysql' | 'postgres' | 'sqlite'
  name: string
  database: null | string
  host: null | string
  port: null | string
  username: null | string
  password: null | string
  filePath: null | string
  notes: null | string
  createdAt: string
  updatedAt: string
}

export type UpsertProjectDatabaseConfigPayload = {
  engine: 'mysql' | 'postgres' | 'sqlite'
  name: string
  database?: string
  host?: string
  port?: string
  username?: string
  password?: string
  filePath?: string
  notes?: string
}

type EnginesResponse = {
  engines: Array<Engine>
}

type DatabasesResponse = {
  engine: string
  databases: Array<string>
}

type SnapshotsResponse = {
  snapshots: Array<Snapshot>
}

type SnapshotMutationResponse = {
  snapshot: Snapshot
}

type SnapshotUpdateResponse = {
  name: string
  meta: Snapshot
}

type MessageResponse = {
  message: string
}

const DB_API_BASE = '/api/db'
const API_BASE = '/api'

function withProjectId(url: string, projectId?: string): string {
  if (!projectId) {
    return url
  }

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}projectId=${encodeURIComponent(projectId)}`
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const data = await response.json()

  if (!response.ok || data.success === false) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

export const dbApi = {
  getProjects: () => request<Array<Project>>(`${API_BASE}/projects`),
  getProjectDatabaseConfigs: (projectId: string) =>
    request<Array<ProjectDatabaseConfigItem>>(`${API_BASE}/projects/${encodeURIComponent(projectId)}/databases/configs`),
  upsertProjectDatabaseConfig: (
    projectId: string,
    payload: UpsertProjectDatabaseConfigPayload,
  ) =>
    request<ProjectDatabaseConfigItem>(`${API_BASE}/projects/${encodeURIComponent(projectId)}/databases/configs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  deleteProjectDatabaseConfig: (projectId: string, id: string) =>
    request<MessageResponse>(`${API_BASE}/projects/${encodeURIComponent(projectId)}/databases/configs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  testProjectDatabaseConfig: (projectId: string, id: string) =>
    request<{ ok: boolean; message: string }>(`${API_BASE}/projects/${encodeURIComponent(projectId)}/databases/configs/${encodeURIComponent(id)}/test`),
  getEngines: () => request<EnginesResponse>(`${DB_API_BASE}/engines`),
  getDatabases: (engine?: string, projectId?: string) =>
    request<DatabasesResponse>(
      withProjectId(
        engine ? `${DB_API_BASE}/engines/${engine}/databases` : `${DB_API_BASE}/databases`,
        projectId,
      ),
    ),
  getDatabaseInfo: (name: string, engine?: string, projectId?: string) =>
    request<DatabaseInfo>(
      withProjectId(
        engine ? `${DB_API_BASE}/engines/${engine}/databases/${name}/info` : `${DB_API_BASE}/databases/${name}/info`,
        projectId,
      ),
    ),
  getSnapshots: (projectId?: string) =>
    request<SnapshotsResponse>(
      projectId ? `${DB_API_BASE}/snapshots?projectId=${encodeURIComponent(projectId)}` : `${DB_API_BASE}/snapshots`,
    ),
  createSnapshot: (
    engine: string,
    payload: { label: string; database: string; category?: null | string; projectId?: null | string },
  ) =>
    request<SnapshotMutationResponse>(`${DB_API_BASE}/engines/${engine}/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  updateSnapshot: (name: string, payload: Record<string, unknown>) =>
    request<SnapshotUpdateResponse>(`${DB_API_BASE}/snapshots/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  deleteSnapshot: (name: string) =>
    request<MessageResponse>(`${DB_API_BASE}/snapshots/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),
  restoreSnapshot: (engine: string, name: string, database: string) =>
    request<MessageResponse>(`${DB_API_BASE}/engines/${engine}/snapshots/${encodeURIComponent(name)}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ database }),
    }),
}
