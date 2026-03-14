import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { ScenariosPage } from '@stubrix/mock-ui';

export function ScenariosBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <ScenariosPage t={t} onNavigateBack={() => navigate('/')} />;
}
