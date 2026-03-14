import { useNavigate } from 'react-router-dom';
import { WebhooksPage } from '@stubrix/mock-ui';

export function WebhooksBridge() {
  const navigate = useNavigate();
  return <WebhooksPage onNavigateBack={() => navigate('/')} />;
}
