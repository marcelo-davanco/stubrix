import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { IntelligencePage } from '@stubrix/mock-ui';

export function IntelligenceBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <IntelligencePage t={t} onNavigateBack={() => navigate('/')} />;
}
