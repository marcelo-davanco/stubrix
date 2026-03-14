import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { MetricsPage } from '@stubrix/mock-ui';

export default function MetricsBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <MetricsPage t={t} onNavigateBack={() => navigate(-1)} />;
}
