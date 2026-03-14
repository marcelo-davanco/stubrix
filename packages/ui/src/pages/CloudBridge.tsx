import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { CloudPage } from '@stubrix/mock-ui';

export default function CloudBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <CloudPage t={t} onNavigateBack={() => navigate(-1)} />;
}
