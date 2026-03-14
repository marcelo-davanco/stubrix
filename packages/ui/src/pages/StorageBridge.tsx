import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { StoragePage } from '@stubrix/mock-ui';

export default function StorageBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <StoragePage t={t} onNavigateBack={() => navigate(-1)} />;
}
