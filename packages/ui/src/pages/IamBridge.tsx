import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { IamPage } from '@stubrix/mock-ui';

export default function IamBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <IamPage t={t} onNavigateBack={() => navigate(-1)} />;
}
