import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { GovernancePage } from '@stubrix/mock-ui';

export function GovernanceBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <GovernancePage t={t} onNavigateBack={() => navigate('/')} />;
}
