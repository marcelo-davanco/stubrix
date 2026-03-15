import { useTranslation } from '../lib/i18n';
import { PerformancePage } from '@stubrix/mock-ui';

export default function PerformanceBridge() {
  const { t } = useTranslation();
  return <PerformancePage t={t} />;
}
