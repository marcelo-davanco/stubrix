import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { StatusResponse } from '@stubrix/shared';
import { useMockManager } from '../hooks/useMockManager.js';
import { EngineStatusBar } from '../components/EngineStatusBar.js';
import { ProjectCard } from '../components/ProjectCard.js';
import { CreateProjectModal } from '../components/CreateProjectModal.js';
import { EmptyState } from '../components/EmptyState.js';

type MockServersPageProps = {
  onNavigateToProject?: (id: string) => void;
  onNavigateToMocks?: (id: string) => void;
  onNavigateToRecording?: (id: string) => void;
};

export function MockServersPage({
  onNavigateToProject,
  onNavigateToMocks,
  onNavigateToRecording,
}: MockServersPageProps) {
  const { projects, status, loading, deleteProject, refreshAll } = useMockManager();
  const [showCreate, setShowCreate] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete project "${id}"? Mocks will be moved to "default".`)) return;
    await deleteProject(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6" data-component="mock-servers-page">
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

      {status && <EngineStatusBar status={status as StatusResponse} />}

      <div className="space-y-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            mocksCount={status?.mocks.byProject[project.id] ?? 0}
            onDashboard={() => onNavigateToProject?.(project.id)}
            onMocks={() => onNavigateToMocks?.(project.id)}
            onRecording={() => onNavigateToRecording?.(project.id)}
            onDelete={() => handleDelete(project.id)}
          />
        ))}
        {projects.length === 0 && (
          <EmptyState message="No projects yet. Create your first project to get started." />
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={() => { setShowCreate(false); void refreshAll(); }}
        />
      )}
    </div>
  );
}
