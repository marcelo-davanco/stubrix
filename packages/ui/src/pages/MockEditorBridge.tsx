import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { MockEditorPage } from '@stubrix/mock-ui';

export function MockEditorBridge() {
  const { projectId, mockId } = useParams<{
    projectId: string;
    mockId: string;
  }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!projectId) return null;

  return (
    <MockEditorPage
      t={t}
      projectId={projectId}
      mockId={mockId}
      onBack={() => navigate(`/projects/${projectId}/mocks`)}
      onSaved={() => navigate(`/projects/${projectId}/mocks`)}
    />
  );
}
