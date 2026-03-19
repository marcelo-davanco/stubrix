import { useCallback } from 'react';
import { LayoutDashboard, FolderOpen, Video, Trash2 } from 'lucide-react';
import type { Project } from '@stubrix/shared';
import { ActionBtn } from './ActionBtn.js';

type ProjectCardProps = {
  t?: (key: string) => string;
  project: Project;
  mocksCount: number;
  onDashboard: () => void;
  onMocks: () => void;
  onRecording: () => void;
  onDelete: () => void;
};

export function ProjectCard({
  t,
  project,
  mocksCount,
  onDashboard,
  onMocks,
  onRecording,
  onDelete,
}: ProjectCardProps) {
  const T = useCallback(
    (key: string, fallback: string) => (t ? t(key) : fallback),
    [t],
  );
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-base">{project.name}</h3>
            <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
              {mocksCount} {T('projects.mocksCountLabel', 'simulations')}
            </span>
          </div>
          {project.description && (
            <p className="text-text-secondary text-sm mt-1">
              {project.description}
            </p>
          )}
          {project.proxyTarget && (
            <p className="text-xs text-text-secondary mt-1">
              {T('dashboard.targetLabel', 'Target')}:{' '}
              <span className="text-primary">{project.proxyTarget}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ActionBtn
            onClick={onDashboard}
            title={T('projects.actionDashboard', 'Dashboard')}
          >
            <LayoutDashboard size={14} />
          </ActionBtn>
          <ActionBtn
            onClick={onMocks}
            title={T('projects.actionMocks', 'Simulations')}
          >
            <FolderOpen size={14} />
          </ActionBtn>
          {project.proxyTarget && (
            <ActionBtn
              onClick={onRecording}
              title={T('projects.actionRecording', 'Recording')}
            >
              <Video size={14} />
            </ActionBtn>
          )}
          {project.id !== 'default' && (
            <ActionBtn
              onClick={onDelete}
              title={T('projects.actionDelete', 'Delete')}
              danger
            >
              <Trash2 size={14} />
            </ActionBtn>
          )}
        </div>
      </div>
    </div>
  );
}
