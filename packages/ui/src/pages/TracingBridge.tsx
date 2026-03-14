import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { TracingPage } from '@stubrix/mock-ui';

export default function TracingBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <TracingPage t={t} onNavigateBack={() => navigate(-1)} />;
}
