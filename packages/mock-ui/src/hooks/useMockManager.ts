import { useCallback, useEffect, useState } from 'react';
import type {
  Project,
  MockListItem,
  StatusResponse,
  RecordingState,
  StartRecordingDto,
} from '@stubrix/shared';
import { mockApi, type CreateMockDto, type UpdateMockDto } from '../lib/mock-api.js';

type MockManagerState = {
  projects: Project[];
  currentProject: Project | null;
  mocks: MockListItem[];
  status: StatusResponse | null;
  recording: RecordingState | null;
  loading: boolean;
  error: string | null;
};

export function useMockManager(initialProjectId?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [mocks, setMocks] = useState<MockListItem[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [recording, setRecording] = useState<RecordingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    const response = await mockApi.projects.list();
    setProjects(response);
    return response;
  }, []);

  const loadProject = useCallback(async (id: string) => {
    const response = await mockApi.projects.get(id);
    setCurrentProject(response);
    return response;
  }, []);

  const loadStatus = useCallback(async () => {
    const response = await mockApi.status.get();
    setStatus(response);
    return response;
  }, []);

  const loadMocks = useCallback(async (projectId: string) => {
    const response = await mockApi.mocks.list(projectId);
    setMocks(response);
    return response;
  }, []);

  const loadRecordingStatus = useCallback(async (projectId: string) => {
    try {
      const response = await mockApi.recording.status(projectId);
      setRecording(response);
      return response;
    } catch {
      setRecording(null);
      return null;
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectsList] = await Promise.all([loadProjects(), loadStatus()]);
      if (initialProjectId) {
        await loadProject(initialProjectId);
        await Promise.all([
          loadMocks(initialProjectId),
          loadRecordingStatus(initialProjectId),
        ]);
      } else if (projectsList.length > 0 && projectsList[0]) {
        await loadProject(projectsList[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [initialProjectId, loadMocks, loadProject, loadProjects, loadRecordingStatus, loadStatus]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const selectProject = useCallback(async (id: string) => {
    setError(null);
    try {
      await loadProject(id);
      await Promise.all([loadMocks(id), loadRecordingStatus(id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [loadMocks, loadProject, loadRecordingStatus]);

  const createProject = useCallback(async (dto: { name: string; proxyTarget?: string; description?: string }) => {
    const created = await mockApi.projects.create(dto);
    await loadProjects();
    return created;
  }, [loadProjects]);

  const updateProject = useCallback(async (id: string, dto: { name?: string; proxyTarget?: string; description?: string }) => {
    const updated = await mockApi.projects.update(id, dto);
    await loadProjects();
    if (currentProject?.id === id) setCurrentProject(updated);
    return updated;
  }, [currentProject?.id, loadProjects]);

  const deleteProject = useCallback(async (id: string) => {
    await mockApi.projects.delete(id);
    await loadProjects();
    if (currentProject?.id === id) setCurrentProject(null);
  }, [currentProject?.id, loadProjects]);

  const createMock = useCallback(async (projectId: string, dto: CreateMockDto) => {
    const created = await mockApi.mocks.create(projectId, dto);
    await loadMocks(projectId);
    return created;
  }, [loadMocks]);

  const updateMock = useCallback(async (projectId: string, id: string, dto: UpdateMockDto) => {
    const updated = await mockApi.mocks.update(projectId, id, dto);
    await loadMocks(projectId);
    return updated;
  }, [loadMocks]);

  const deleteMock = useCallback(async (projectId: string, id: string) => {
    await mockApi.mocks.delete(projectId, id);
    await loadMocks(projectId);
  }, [loadMocks]);

  const startRecording = useCallback(async (projectId: string, dto: StartRecordingDto) => {
    const state = await mockApi.recording.start(projectId, dto);
    setRecording(state);
    return state;
  }, []);

  const stopRecording = useCallback(async (projectId: string) => {
    const result = await mockApi.recording.stop(projectId);
    await loadRecordingStatus(projectId);
    return result;
  }, [loadRecordingStatus]);

  const takeSnapshot = useCallback(async (projectId: string) => {
    const result = await mockApi.recording.snapshot(projectId);
    await loadRecordingStatus(projectId);
    return result;
  }, [loadRecordingStatus]);

  const state: MockManagerState = {
    projects,
    currentProject,
    mocks,
    status,
    recording,
    loading,
    error,
  };

  return {
    ...state,
    refreshAll,
    selectProject,
    createProject,
    updateProject,
    deleteProject,
    createMock,
    updateMock,
    deleteMock,
    startRecording,
    stopRecording,
    takeSnapshot,
    loadMocks,
    loadRecordingStatus,
  };
}
