import { useEffect, useState } from 'react';
import { ArrowLeft, Play, Square } from 'lucide-react';
import { useMockManager } from '../hooks/useMockManager.js';

type RecordingPanelPageProps = {
  projectId: string;
  onBack?: () => void;
};

export function RecordingPanelPage({ projectId, onBack }: RecordingPanelPageProps) {
  const {
    currentProject,
    recording,
    loading,
    selectProject,
    startRecording,
    stopRecording,
    takeSnapshot,
  } = useMockManager(projectId);
  const [proxyTarget, setProxyTarget] = useState('');
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void selectProject(projectId);
  }, [projectId]);

  useEffect(() => {
    if (currentProject?.proxyTarget) {
      setProxyTarget(currentProject.proxyTarget);
    }
  }, [currentProject]);

  const handleStart = async () => {
    setActing(true);
    setError('');
    try {
      await startRecording(projectId, { proxyTarget: proxyTarget || undefined });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActing(false);
    }
  };

  const handleStop = async () => {
    setActing(true);
    try {
      await stopRecording(projectId);
    } finally {
      setActing(false);
    }
  };

  const handleSnapshot = async () => {
    setActing(true);
    try {
      await takeSnapshot(projectId);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-text-secondary hover:text-text-primary">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Recording</h1>
          <p className="text-text-secondary text-sm">{currentProject?.name}</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Recording Status</h3>
          {recording?.active ? (
            <span className="text-xs font-semibold text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
              🔴 Recording
            </span>
          ) : (
            <span className="text-xs text-text-secondary bg-white/10 px-2 py-0.5 rounded">
              ⚪ Inactive
            </span>
          )}
        </div>

        {!recording?.active && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Proxy Target</label>
              <input
                value={proxyTarget}
                onChange={(e) => setProxyTarget(e.target.value)}
                placeholder="https://api.example.com"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
              {currentProject?.proxyTarget && (
                <p className="text-xs text-text-secondary mt-1">
                  Pre-filled from project settings
                </p>
              )}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={handleStart}
              disabled={acting || !proxyTarget}
              className="flex items-center gap-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              <Play size={14} /> Start Recording
            </button>
          </div>
        )}

        {recording?.active && (
          <div className="space-y-3">
            <div className="text-sm text-text-secondary">
              <p>
                Target: <span className="text-text-primary">{recording.proxyTarget}</span>
              </p>
              {recording.startedAt && (
                <p>
                  Started:{' '}
                  <span className="text-text-primary">
                    {new Date(recording.startedAt).toLocaleString()}
                  </span>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleStop}
                disabled={acting}
                className="flex items-center gap-2 bg-red-400/20 hover:bg-red-400/30 text-red-400 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                <Square size={14} /> Stop & Save
              </button>
              <button
                onClick={handleSnapshot}
                disabled={acting}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-text-secondary px-4 py-2 rounded-md text-sm disabled:opacity-50"
              >
                Snapshot
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-text-secondary">
        <p className="font-medium text-text-primary mb-2">How it works</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Start recording — all requests are proxied to the target</li>
          <li>
            Make requests against{' '}
            <code className="bg-white/10 px-1 rounded">localhost:{'{port}'}</code>
          </li>
          <li>
            Stop — mocks are saved with{' '}
            <code className="bg-white/10 px-1 rounded">
              metadata.project: &quot;{projectId}&quot;
            </code>
          </li>
        </ul>
      </div>
    </div>
  );
}
