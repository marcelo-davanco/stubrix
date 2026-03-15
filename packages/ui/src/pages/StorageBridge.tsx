import { useTranslation } from '../lib/i18n';
import { StoragePage } from '@stubrix/mock-ui';

export default function StorageBridge() {
  const { t } = useTranslation();
  return <StoragePage t={t} />;
}
