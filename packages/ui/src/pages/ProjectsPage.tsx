import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, FolderOpen, Video, Trash2 } from 'lucide-react';
import type { Project, StatusResponse } from '@stubrix/shared';
import { api } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const [p, s] = await Promise.allSettled([api.projects.list(), api.status.get()]);
    if (p.status === 'fulfilled') setProjects(p.value);
    if (s.status === 'fulfilled') setStatus(s.value);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete project "${id}"? Mocks will be moved to "default".`)) return;
    await api.projects.delete(id);
    void load();
  };

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-text-secondary text-sm mt-1">Manage your mock projects</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {status && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Engine" value={status.engine} />
          <StatCard label="Status" value={status.engineStatus === 'running' ? '🟢 Online' : '🔴 Offline'} />
          <StatCard label="Total Mocks" value={String(status.mocks.total)} />
          <StatCard label="Port" value={String(status.port)} />
        </div>
      )}

      <div className="space-y-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            mocksCount={status?.mocks.byProject[project.id] ?? 0}
            onDashboard={() => navigate(`/projects/${project.id}`)}
            onMocks={() => navigate(`/projects/${project.id}/mocks`)}
            onRecording={() => navigate(`/projects/${project.id}/recording`)}
            onDelete={() => handleDelete(project.id)}
          />
        ))}
        {projects.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            No projects yet. Create your first project to get started.
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={() => { setShowCreate(false); void load(); }}
        />
      )}
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

function ProjectCard({
  project,
  mocksCount,
  onDashboard,
  onMocks,
  onRecording,
  onDelete,
}: {
  project: Project;
  mocksCount: number;
  onDashboard: () => void;
  onMocks: () => void;
  onRecording: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-base">{project.name}</h3>
            <Badge variant="accent">{mocksCount} mocks</Badge>
          </div>
          {project.description && (
            <p className="text-text-secondary text-sm mt-1">{project.description}</p>
          )}
          {project.proxyTarget && (
            <p className="text-xs text-text-secondary mt-1">
              Target: <span className="text-primary">{project.proxyTarget}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ActionBtn onClick={onDashboard} title="Dashboard">
            <LayoutDashboard size={14} />
          </ActionBtn>
          <ActionBtn onClick={onMocks} title="Mocks">
            <FolderOpen size={14} />
          </ActionBtn>
          {project.proxyTarget && (
            <ActionBtn onClick={onRecording} title="Recording">
              <Video size={14} />
            </ActionBtn>
          )}
          {project.id !== 'default' && (
            <ActionBtn onClick={onDelete} title="Delete" danger>
              <Trash2 size={14} />
            </ActionBtn>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, title, danger }: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-2 rounded-md text-xs transition-colors',
        danger
          ? 'text-red-400 hover:bg-danger/20'
          : 'text-text-secondary hover:bg-white/10 hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}

function CreateProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const [name, setName] = useState('');
  const [proxyTarget, setProxyTarget] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.projects.create({ name, proxyTarget: proxyTarget || undefined, description: description || undefined });
      onCreate();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">New Project</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My API"
              required
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </Field>
          <Field label="Proxy Target">
            <input
              value={proxyTarget}
              onChange={(e) => setProxyTarget(e.target.value)}
              placeholder="https://api.example.com"
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </Field>
          <Field label="Description">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </Field>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-md border border-white/10 text-sm hover:bg-white/5">Cancel</button>
            <button type="submit" className="flex-1 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/80">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-text-secondary mb-1">{label}</label>
      {children}
    </div>
  );
}
