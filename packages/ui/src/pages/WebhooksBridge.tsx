import { useTranslation } from '../lib/i18n';
import { WebhooksPage } from '@stubrix/mock-ui';

export function WebhooksBridge() {
  const { t } = useTranslation();
  return <WebhooksPage t={t} />;
}
