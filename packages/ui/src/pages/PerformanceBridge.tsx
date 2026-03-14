import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { PerformancePage } from '@stubrix/mock-ui';

export default function PerformanceBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <PerformancePage t={t} onNavigateBack={() => navigate(-1)} />;
}
