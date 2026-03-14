import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { ProjectDashboardPage } from '@stubrix/mock-ui';

export function ProjectDashboardBridge() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!projectId) return null;

  return (
    <ProjectDashboardPage
      t={t}
      projectId={projectId}
      onBack={() => navigate('/')}
      onNavigateToMocks={(id) => navigate(`/projects/${id}/mocks`)}
      onNavigateToRecording={(id) => navigate(`/projects/${id}/recording`)}
      onNavigateToNewMock={(id) => navigate(`/projects/${id}/mocks/new`)}
    />
  );
}
