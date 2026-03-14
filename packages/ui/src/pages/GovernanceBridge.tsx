import { useTranslation } from '../lib/i18n';
import { GovernancePage } from '@stubrix/mock-ui';

export function GovernanceBridge() {
  const { t } = useTranslation();
  return <GovernancePage t={t} />;
}
