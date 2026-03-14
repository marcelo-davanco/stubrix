import { useNavigate, useParams } from 'react-router-dom';
import { MocksListPage } from '@stubrix/mock-ui';

export function MocksListBridge() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  if (!projectId) return null;

  return (
    <MocksListPage
      projectId={projectId}
      onBack={() => navigate(`/projects/${projectId}`)}
      onNavigateToNewMock={(id) => navigate(`/projects/${id}/mocks/new`)}
      onNavigateToEditMock={(id, mockId) => navigate(`/projects/${id}/mocks/${mockId}/edit`)}
    />
  );
}
