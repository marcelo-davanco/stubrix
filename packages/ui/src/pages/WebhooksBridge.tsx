import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { WebhooksPage } from '@stubrix/mock-ui';

export function WebhooksBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <WebhooksPage t={t} onNavigateBack={() => navigate('/')} />;
}
