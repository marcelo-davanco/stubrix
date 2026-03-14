import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { ProtocolsPage } from '@stubrix/mock-ui';

export default function ProtocolsBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <ProtocolsPage t={t} onNavigateBack={() => navigate(-1)} />;
}
