import { useTranslation } from '../lib/i18n';
import { MetricsPage } from '@stubrix/mock-ui';

export default function MetricsBridge() {
  const { t } = useTranslation();
  return <MetricsPage t={t} />;
}
