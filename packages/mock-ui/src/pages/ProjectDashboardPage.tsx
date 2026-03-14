import { useCallback, useEffect } from 'react';
import { ArrowLeft, Plus, Video, RefreshCw } from 'lucide-react';
import { useMockManager } from '../hooks/useMockManager.js';
import { StatCard } from '../components/StatCard.js';

type ProjectDashboardPageProps = {
  t?: (key: string) => string;
  projectId: string;
  onBack?: () => void;
  onNavigateToMocks?: (projectId: string) => void;
  onNavigateToRecording?: (projectId: string) => void;
  onNavigateToNewMock?: (projectId: string) => void;
};

export function ProjectDashboardPage({
  t,
  projectId,
  onBack,
  onNavigateToMocks,
  onNavigateToRecording,
  onNavigateToNewMock,
}: ProjectDashboardPageProps) {
  const T = useCallback((key: string, fallback: string) => (t ? t(key) : fallback), [t]);
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
        {T('common.loading', 'Loading...')}
      </div>
    );
  }

  if (error || !currentProject) {
    return <div className="p-6 text-red-400">{error ?? T('dashboard.notFound', 'Project not found')}</div>;
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
          <p className="text-text-secondary text-sm">{T('dashboard.title', 'Dashboard')}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label={T('projects.statEngine', 'Engine')} value={status?.engine ?? '—'} />
        <StatCard
          label={T('projects.statStatus', 'Status')}
          value={status?.engineStatus === 'running' ? `🟢 ${T('projects.statOnline', 'Online')}` : `🔴 ${T('projects.statOffline', 'Offline')}`}
        />
        <StatCard label={T('dashboard.mocksLabel', 'Mocks')} value={String(mocksCount)} />
        <StatCard label={T('projects.statPort', 'Port')} value={String(status?.port ?? '—')} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Video size={16} className="text-red-400" />
            {T('dashboard.recordingTitle', 'Recording')}
          </h3>
          {recording?.active ? (
            <div>
              <span className="text-xs font-semibold text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
                🔴 {T('dashboard.recordingActive', 'Recording')}
              </span>
              <p className="text-sm text-text-secondary mt-2">
                {T('dashboard.targetLabel', 'Target')}: {recording.proxyTarget}
              </p>
              <button
                onClick={async () => {
                  await stopRecording(projectId);
                }}
                className="mt-3 text-sm bg-red-400/20 text-red-400 hover:bg-red-400/30 px-3 py-1.5 rounded-md"
              >
                {T('dashboard.stopRecording', 'Stop Recording')}
              </button>
            </div>
          ) : (
            <div>
              <span className="text-xs text-text-secondary bg-white/10 px-2 py-0.5 rounded">
                ⚪ {T('dashboard.recordingStopped', 'Stopped')}
              </span>
              {currentProject.proxyTarget && (
                <p className="text-xs text-text-secondary mt-2">
                  {T('dashboard.targetLabel', 'Target')}: {currentProject.proxyTarget}
                </p>
              )}
              <button
                onClick={() => onNavigateToRecording?.(projectId)}
                className="mt-3 inline-block text-sm bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-md"
              >
                {T('dashboard.startRecording', 'Start Recording')}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="font-medium mb-3">{T('dashboard.quickActions', 'Quick Actions')}</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onNavigateToNewMock?.(projectId)}
              className="flex items-center gap-1.5 text-sm bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-md"
            >
              <Plus size={14} /> {T('dashboard.newMock', 'New Mock')}
            </button>
            <button
              onClick={() => onNavigateToMocks?.(projectId)}
              className="flex items-center gap-1.5 text-sm bg-white/5 text-text-secondary hover:bg-white/10 px-3 py-1.5 rounded-md"
            >
              <Video size={14} /> {T('dashboard.mocksLabel', 'Mocks')}
            </button>
            <button
              onClick={() => void refreshAll()}
              className="flex items-center gap-1.5 text-sm bg-white/5 text-text-secondary hover:bg-white/10 px-3 py-1.5 rounded-md"
            >
              <RefreshCw size={14} /> {T('dashboard.refresh', 'Refresh')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
