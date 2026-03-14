import { useNavigate, useParams } from 'react-router-dom';
import { RecordingPanelPage } from '@stubrix/mock-ui';

export function RecordingBridge() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  if (!projectId) return null;

  return (
    <RecordingPanelPage
      projectId={projectId}
      onBack={() => navigate(`/projects/${projectId}`)}
    />
  );
}
