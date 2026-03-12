import { useNavigate } from 'react-router-dom';
import { MockServersPage } from '@stubrix/mock-ui';

export function MockServersBridge() {
  const navigate = useNavigate();
  return (
    <MockServersPage
      onNavigateToProject={(id) => navigate(`/projects/${id}`)}
      onNavigateToMocks={(id) => navigate(`/projects/${id}/mocks`)}
      onNavigateToRecording={(id) => navigate(`/projects/${id}/recording`)}
    />
  );
}
