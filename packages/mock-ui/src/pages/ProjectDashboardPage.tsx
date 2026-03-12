import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Video, RefreshCw } from 'lucide-react';
import { useMockManager } from '../hooks/useMockManager.js';
import { StatCard } from '../components/StatCard.js';

type ProjectDashboardPageProps = {
  projectId: string;
  onBack?: () => void;
  onNavigateToMocks?: (projectId: string) => void;
  onNavigateToRecording?: (projectId: string) => void;
  onNavigateToNewMock?: (projectId: string) => void;
};

export function ProjectDashboardPage({
  projectId,
  onBack,
  onNavigateToMocks,
  onNavigateToRecording,
  onNavigateToNewMock,
}: ProjectDashboardPageProps) {
  const {
    currentProject,
    status,
    recording,
    loading,
    error,
    selectProject,
    stopRecording,
    refreshAll,
  } = useMockManager(projectId);

  useEffect(() => {
    void selectProject(projectId);
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        Loading...
      </div>
    );
  }

  if (error || !currentProject) {
    return <div className="p-6 text-red-400">{error ?? 'Project not found'}</div>;
  }

  const mocksCount = status?.mocks.byProject[projectId] ?? 0;

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{currentProject.name}</h1>
          <p className="text-text-secondary text-sm">Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Engine" value={status?.engine ?? '—'} />
        <StatCard
          label="Status"
          value={status?.engineStatus === 'running' ? '🟢 Online' : '🔴 Offline'}
        />
        <StatCard label="Mocks" value={String(mocksCount)} />
        <StatCard label="Port" value={String(status?.port ?? '—')} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Video size={16} className="text-red-400" />
            Recording
          </h3>
          {recording?.active ? (
            <div>
              <span className="text-xs font-semibold text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
                🔴 Recording
              </span>
              <p className="text-sm text-text-secondary mt-2">
                Target: {recording.proxyTarget}
              </p>
              <button
                onClick={async () => {
                  await stopRecording(projectId);
                }}
                className="mt-3 text-sm bg-red-400/20 text-red-400 hover:bg-red-400/30 px-3 py-1.5 rounded-md"
              >
                Stop Recording
              </button>
            </div>
          ) : (
            <div>
              <span className="text-xs text-text-secondary bg-white/10 px-2 py-0.5 rounded">
                ⚪ Inactive
              </span>
              {currentProject.proxyTarget && (
                <p className="text-xs text-text-secondary mt-2">
                  Target: {currentProject.proxyTarget}
                </p>
              )}
              <button
                onClick={() => onNavigateToRecording?.(projectId)}
                className="mt-3 inline-block text-sm bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-md"
              >
                Start Recording
              </button>
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="font-medium mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onNavigateToNewMock?.(projectId)}
              className="flex items-center gap-1.5 text-sm bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-md"
            >
              <Plus size={14} /> New Mock
            </button>
            <button
              onClick={() => onNavigateToMocks?.(projectId)}
              className="flex items-center gap-1.5 text-sm bg-white/5 text-text-secondary hover:bg-white/10 px-3 py-1.5 rounded-md"
            >
              <Video size={14} /> Mocks
            </button>
            <button
              onClick={() => void refreshAll()}
              className="flex items-center gap-1.5 text-sm bg-white/5 text-text-secondary hover:bg-white/10 px-3 py-1.5 rounded-md"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
