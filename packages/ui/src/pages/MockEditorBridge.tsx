import { useNavigate, useParams } from 'react-router-dom';
import { MockEditorPage } from '@stubrix/mock-ui';

export function MockEditorBridge() {
  const { projectId, mockId } = useParams<{ projectId: string; mockId: string }>();
  const navigate = useNavigate();

  if (!projectId) return null;

  return (
    <MockEditorPage
      projectId={projectId}
      mockId={mockId}
      onBack={() => navigate(`/projects/${projectId}/mocks`)}
      onSaved={() => navigate(`/projects/${projectId}/mocks`)}
    />
  );
}
