import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Video, RefreshCw, FolderOpen } from 'lucide-react';
import type { Project, StatusResponse, RecordingState } from '@stubrix/shared';
import { api } from '../lib/api';
import { Badge } from '../components/ui/Badge';

export function DashboardPage() {
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

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>;
  if (!project) return <div className="p-6 text-red-400">Project not found</div>;

  const mocksCount = status?.mocks.byProject[projectId!] ?? 0;

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="text-text-secondary hover:text-text-primary">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
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
            <Video size={16} className="text-danger" />
            Recording
          </h3>
          {recording?.active ? (
            <div>
              <Badge variant="danger">🔴 Recording</Badge>
              <p className="text-sm text-text-secondary mt-2">
                Target: {recording.proxyTarget}
              </p>
              <button
                onClick={async () => {
                  await api.recording.stop(projectId!);
                  void load();
                }}
                className="mt-3 text-sm bg-danger/20 text-red-400 hover:bg-danger/30 px-3 py-1.5 rounded-md"
              >
                Stop Recording
              </button>
            </div>
          ) : (
            <div>
              <Badge variant="default">⚪ Inactive</Badge>
              {project.proxyTarget && (
                <p className="text-xs text-text-secondary mt-2">Target: {project.proxyTarget}</p>
              )}
              <Link
                to={`/projects/${projectId}/recording`}
                className="mt-3 inline-block text-sm bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-md"
              >
                Start Recording
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="font-medium mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/projects/${projectId}/mocks`}
              className="flex items-center gap-1.5 text-sm bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-md"
            >
              <FolderOpen size={14} /> View Mocks
            </Link>
            <Link
              to={`/projects/${projectId}/mocks/new`}
              className="flex items-center gap-1.5 text-sm bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-md"
            >
              <Plus size={14} /> New Mock
            </Link>
            <Link
              to={`/projects/${projectId}/recording`}
              className="flex items-center gap-1.5 text-sm bg-white/5 text-text-secondary hover:bg-white/10 px-3 py-1.5 rounded-md"
            >
              <Video size={14} /> Record
            </Link>
            <button
              onClick={() => void load()}
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <p className="text-xs text-text-secondary uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}
