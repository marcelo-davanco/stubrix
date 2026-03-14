import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { ChaosPanelPage } from '@stubrix/mock-ui';

export function ChaosBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <ChaosPanelPage t={t} onNavigateBack={() => navigate('/')} />;
}
