import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { ChaosNetworkPage } from '@stubrix/mock-ui';

export default function ChaosNetworkBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <ChaosNetworkPage t={t} onNavigateBack={() => navigate(-1)} />;
}
