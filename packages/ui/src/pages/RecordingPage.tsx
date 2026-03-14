import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square, CircleDot } from 'lucide-react';
import type { Project, RecordingState } from '@stubrix/shared';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';

export function RecordingPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [recording, setRecording] = useState<RecordingState | null>(null);
  const [proxyTarget, setProxyTarget] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!projectId) return;
    const [p, r] = await Promise.allSettled([
      api.projects.get(projectId),
      api.recording.status(projectId),
    ]);
    if (p.status === 'fulfilled') {
      setProject(p.value);
      setProxyTarget(p.value.proxyTarget ?? '');
    }
    if (r.status === 'fulfilled') setRecording(r.value);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [projectId]);

  const handleStart = async () => {
    setActing(true);
    setError('');
    try {
      await api.recording.start(projectId!, { proxyTarget: proxyTarget || undefined });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActing(false);
    }
  };

  const handleStop = async () => {
    setActing(true);
    try {
      await api.recording.stop(projectId!);
      await load();
    } finally {
      setActing(false);
    }
  };

  const handleSnapshot = async () => {
    setActing(true);
    try {
      await api.recording.snapshot(projectId!);
      await load();
    } finally {
      setActing(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">{t('common.loading')}</div>;

  const displayProjectName = project?.id === 'default' ? t('projects.defaultProjectName') : project?.name ?? '';

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/projects/${projectId}`)} className="text-text-secondary hover:text-text-primary">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{t('recording.title')}</h1>
          <p className="text-text-secondary text-sm">{displayProjectName}</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">{t('recording.statusLabel')}</h3>
          {recording?.active ? (
            <span className="flex items-center gap-2 text-sm font-medium text-red-400">
              <CircleDot size={18} aria-hidden />
              {t('recording.activeBadge')}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <Square size={18} aria-hidden />
              {t('recording.inactiveBadge')}
            </span>
          )}
        </div>

        {!recording?.active && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">{t('recording.proxyTargetLabel')}</label>
              <input
                value={proxyTarget}
                onChange={(e) => setProxyTarget(e.target.value)}
                placeholder={t('recording.proxyTargetPlaceholder')}
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
              {project?.proxyTarget && (
                <p className="text-xs text-text-secondary mt-1">{t('recording.prefilledHint')}</p>
              )}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={handleStart}
              disabled={acting || !proxyTarget}
              className="flex items-center gap-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              <Play size={14} /> {t('recording.startButton')}
            </button>
          </div>
        )}

        {recording?.active && (
          <div className="space-y-3">
            <div className="text-sm text-text-secondary">
              <p>{t('recording.targetLabel')}: <span className="text-text-primary">{recording.proxyTarget}</span></p>
              {recording.startedAt && (
                <p>{t('recording.startedLabel')}: <span className="text-text-primary">{new Date(recording.startedAt).toLocaleString()}</span></p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleStop}
                disabled={acting}
                className="flex items-center gap-2 bg-danger/20 hover:bg-danger/30 text-red-400 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                <Square size={14} /> {t('recording.stopSave')}
              </button>
              <button
                onClick={handleSnapshot}
                disabled={acting}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-text-secondary px-4 py-2 rounded-md text-sm disabled:opacity-50"
              >
                {t('recording.snapshot')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-text-secondary">
        <p className="font-medium text-text-primary mb-2">{t('recording.howItWorksTitle')}</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>{t('recording.howItWorks1')}</li>
          <li>{t('recording.howItWorks2').replace('{port}', '8081')}</li>
          <li>{t('recording.howItWorks3').replace('{projectId}', projectId ?? '')}</li>
        </ul>
      </div>
    </div>
  );
}
