import { useNavigate, useParams } from 'react-router-dom';
import { ProjectDashboardPage } from '@stubrix/mock-ui';

export function ProjectDashboardBridge() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  if (!projectId) return null;

  return (
    <ProjectDashboardPage
      projectId={projectId}
      onBack={() => navigate('/')}
      onNavigateToMocks={(id) => navigate(`/projects/${id}/mocks`)}
      onNavigateToRecording={(id) => navigate(`/projects/${id}/recording`)}
      onNavigateToNewMock={(id) => navigate(`/projects/${id}/mocks/new`)}
    />
  );
}
