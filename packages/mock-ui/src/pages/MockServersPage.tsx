import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import type { StatusResponse } from '@stubrix/shared';
import { useMockManager } from '../hooks/useMockManager.js';
import { EngineStatusBar } from '../components/EngineStatusBar.js';
import { ProjectCard } from '../components/ProjectCard.js';
import { CreateProjectModal } from '../components/CreateProjectModal.js';
import { EmptyState } from '../components/EmptyState.js';

type MockServersPageProps = {
  t?: (key: string) => string;
  onNavigateToProject?: (id: string) => void;
  onNavigateToMocks?: (id: string) => void;
  onNavigateToRecording?: (id: string) => void;
};

export function MockServersPage({
  t,
  onNavigateToProject,
  onNavigateToMocks,
  onNavigateToRecording,
}: MockServersPageProps) {
  const { projects, status, loading, deleteProject, refreshAll } =
    useMockManager();
  const [showCreate, setShowCreate] = useState(false);
  const T = useCallback(
    (key: string, fallback: string) => (t ? t(key) : fallback),
    [t],
  );

  const handleDelete = async (id: string) => {
    const msg = T(
      'projects.deleteConfirm',
      `Delete project "${id}"? Its simulations will be moved to the "Default" project.`,
    );
    if (!confirm(msg.replace('{{id}}', id))) return;
    await deleteProject(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        {T('common.loading', 'Loading...')}
      </div>
    );
  }

  return (
    <div className="p-6" data-component="mock-servers-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {T('projects.title', 'Projects')}
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {T('projects.subtitle', 'Organize your simulated APIs by project')}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Plus size={16} /> {T('projects.newProject', 'New Project')}
        </button>
      </div>

      {status && <EngineStatusBar status={status as StatusResponse} />}

      <div className="space-y-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            t={t}
            project={project}
            mocksCount={status?.mocks.byProject[project.id] ?? 0}
            onDashboard={() => onNavigateToProject?.(project.id)}
            onMocks={() => onNavigateToMocks?.(project.id)}
            onRecording={() => onNavigateToRecording?.(project.id)}
            onDelete={() => handleDelete(project.id)}
          />
        ))}
        {projects.length === 0 && (
          <EmptyState
            message={T(
              'projects.empty',
              'No projects yet. Create your first project to get started.',
            )}
          />
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          t={t}
          onClose={() => setShowCreate(false)}
          onCreate={() => {
            setShowCreate(false);
            void refreshAll();
          }}
        />
      )}
    </div>
  );
}
