import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, FolderOpen, Video, Trash2 } from 'lucide-react';
import type { Project, StatusResponse } from '@stubrix/shared';
import { api } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';
import { useTranslation } from '../lib/i18n';

export function ProjectsPage() {
  const { t } = useTranslation();
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
    if (!confirm(t('projects.deleteConfirm').replace('{{id}}', id))) return;
    await api.projects.delete(id);
    void load();
  };

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">{t('common.loading')}</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('projects.title')}</h1>
          <p className="text-text-secondary text-sm mt-1">{t('projects.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Plus size={16} /> {t('projects.newProject')}
        </button>
      </div>

      {status && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label={t('projects.statEngine')} value={status.engine} />
          <StatCard label={t('projects.statStatus')} value={status.engineStatus === 'running' ? `🟢 ${t('projects.statOnline')}` : `🔴 ${t('projects.statOffline')}`} />
          <StatCard label={t('projects.statTotalMocks')} value={String(status.mocks.total)} />
          <StatCard label={t('projects.statPort')} value={String(status.port)} />
        </div>
      )}

      <div className="space-y-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            mocksCount={status?.mocks.byProject[project.id] ?? 0}
            mocksLabel={t('projects.mocksCountLabel')}
            targetLabel={t('projects.targetLabel')}
            onDashboard={() => navigate(`/projects/${project.id}`)}
            onMocks={() => navigate(`/projects/${project.id}/mocks`)}
            onRecording={() => navigate(`/projects/${project.id}/recording`)}
            onDelete={() => handleDelete(project.id)}
          />
        ))}
        {projects.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            {t('projects.empty')}
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
  mocksLabel,
  targetLabel,
  onDashboard,
  onMocks,
  onRecording,
  onDelete,
}: {
  project: Project;
  mocksCount: number;
  mocksLabel: string;
  targetLabel: string;
  onDashboard: () => void;
  onMocks: () => void;
  onRecording: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const displayName = project.id === 'default' ? t('projects.defaultProjectName') : project.name;
  const displayDescription = project.id === 'default' ? t('projects.defaultProjectDescription') : project.description;
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-base">{displayName}</h3>
            <Badge variant="accent">{mocksCount} {mocksLabel}</Badge>
          </div>
          {displayDescription && (
            <p className="text-text-secondary text-sm mt-1">{displayDescription}</p>
          )}
          {project.proxyTarget && (
            <p className="text-xs text-text-secondary mt-1">
              {targetLabel}: <span className="text-primary">{project.proxyTarget}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ActionBtn onClick={onDashboard} titleKey="projects.actionDashboard">
            <LayoutDashboard size={14} />
          </ActionBtn>
          <ActionBtn onClick={onMocks} titleKey="projects.actionMocks">
            <FolderOpen size={14} />
          </ActionBtn>
          {project.proxyTarget && (
            <ActionBtn onClick={onRecording} titleKey="projects.actionRecording">
              <Video size={14} />
            </ActionBtn>
          )}
          {project.id !== 'default' && (
            <ActionBtn onClick={onDelete} titleKey="projects.actionDelete" danger>
              <Trash2 size={14} />
            </ActionBtn>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, titleKey, danger }: {
  children: React.ReactNode;
  onClick: () => void;
  titleKey: string;
  danger?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      title={t(titleKey)}
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
  const { t } = useTranslation();
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
        <h2 className="text-lg font-bold mb-4">{t('projects.modalTitle')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t('projects.fieldName')}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('projects.placeholderName')}
              required
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </Field>
          <Field label={t('projects.fieldProxyTarget')}>
            <input
              value={proxyTarget}
              onChange={(e) => setProxyTarget(e.target.value)}
              placeholder={t('projects.placeholderProxyTarget')}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </Field>
          <Field label={t('projects.fieldDescription')}>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('projects.placeholderDescription')}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </Field>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-md border border-white/10 text-sm hover:bg-white/5">{t('common.cancel')}</button>
            <button type="submit" className="flex-1 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/80">{t('projects.create')}</button>
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
