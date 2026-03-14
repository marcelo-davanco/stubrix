import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { MockServersPage } from '@stubrix/mock-ui';

export function MockServersBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <MockServersPage
      t={t}
      onNavigateToProject={(id) => navigate(`/projects/${id}`)}
      onNavigateToMocks={(id) => navigate(`/projects/${id}/mocks`)}
      onNavigateToRecording={(id) => navigate(`/projects/${id}/recording`)}
    />
  );
}
