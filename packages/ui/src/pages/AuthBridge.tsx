import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { AuthPage } from '@stubrix/mock-ui';

export default function AuthBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <AuthPage t={t} onNavigateBack={() => navigate(-1)} />;
}
