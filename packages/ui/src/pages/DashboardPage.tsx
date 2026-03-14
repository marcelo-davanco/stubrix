import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, CircleDot, Square, RefreshCw, FolderOpen } from 'lucide-react';
import type { Project, StatusResponse, RecordingState } from '@stubrix/shared';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';

export function DashboardPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [recording, setRecording] = useState<RecordingState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!projectId) return;
    const [p, s, r] = await Promise.allSettled([
      api.projects.get(projectId),
      api.status.get(),
      api.recording.status(projectId),
    ]);
    if (p.status === 'fulfilled') setProject(p.value);
    if (s.status === 'fulfilled') setStatus(s.value);
    if (r.status === 'fulfilled') setRecording(r.value);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [projectId]);

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">{t('common.loading')}</div>;
  if (!project) return <div className="p-6 text-red-400">{t('dashboard.notFound')}</div>;

  const mocksCount = status?.mocks.byProject[projectId!] ?? 0;

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="text-text-secondary hover:text-text-primary">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-text-secondary text-sm">{t('dashboard.title')}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label={t('projects.statEngine')} value={status?.engine ?? '—'} />
        <StatCard
          label={t('projects.statStatus')}
          value={status?.engineStatus === 'running' ? `🟢 ${t('projects.statOnline')}` : `🔴 ${t('projects.statOffline')}`}
        />
        <StatCard label={t('projects.statTotalMocks')} value={String(mocksCount)} />
        <StatCard label={t('projects.statPort')} value={String(status?.port ?? '—')} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <CircleDot size={18} className="text-danger" aria-hidden />
            {t('dashboard.recordingTitle')}
          </h3>
          {recording?.active ? (
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2 px-4 py-2 rounded-md bg-danger/20 text-red-400 text-sm font-medium">
                  <CircleDot size={18} aria-hidden />
                  {t('dashboard.recordingActive')}
                </span>
                <button
                  onClick={async () => {
                    await api.recording.stop(projectId!);
                    void load();
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-danger/20 text-red-400 hover:bg-danger/30"
                >
                  {t('dashboard.stopRecording')}
                </button>
              </div>
              <p className="text-sm text-text-secondary mt-2">
                {t('dashboard.targetLabel')}: {recording.proxyTarget}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2 px-4 py-2 rounded-md bg-white/10 text-text-secondary text-sm font-medium">
                  <Square size={18} aria-hidden />
                  {t('dashboard.recordingStopped')}
                </span>
                <Link
                  to={`/projects/${projectId}/recording`}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md bg-primary/20 text-primary hover:bg-primary/30"
                >
                  {t('dashboard.startRecording')}
                </Link>
              </div>
              {project.proxyTarget && (
                <p className="text-xs text-text-secondary mt-2">{t('dashboard.targetLabel')}: {project.proxyTarget}</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="font-medium mb-3">{t('dashboard.quickActions')}</h3>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/projects/${projectId}/mocks`}
              className="flex items-center gap-1.5 text-sm bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-md"
            >
              <FolderOpen size={14} /> {t('dashboard.viewMocks')}
            </Link>
            <Link
              to={`/projects/${projectId}/mocks/new`}
              className="flex items-center gap-1.5 text-sm bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-md"
            >
              <Plus size={14} /> {t('dashboard.newMock')}
            </Link>
            <Link
              to={`/projects/${projectId}/recording`}
              className="flex items-center gap-1.5 text-sm bg-white/5 text-text-secondary hover:bg-white/10 px-3 py-1.5 rounded-md"
            >
              <CircleDot size={14} /> {t('dashboard.record')}
            </Link>
            <button
              onClick={() => void load()}
              className="flex items-center gap-1.5 text-sm bg-white/5 text-text-secondary hover:bg-white/10 px-3 py-1.5 rounded-md"
            >
              <RefreshCw size={14} /> {t('dashboard.refresh')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <p className="text-xs text-text-secondary uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}
