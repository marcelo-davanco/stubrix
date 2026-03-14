import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { RecordingPanelPage } from '@stubrix/mock-ui';

export function RecordingBridge() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!projectId) return null;

  return (
    <RecordingPanelPage
      t={t}
      projectId={projectId}
      onBack={() => navigate(`/projects/${projectId}`)}
    />
  );
}
