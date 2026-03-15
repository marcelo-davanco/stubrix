import { useTranslation } from '../lib/i18n';
import { AuthPage } from '@stubrix/mock-ui';

export default function AuthBridge() {
  const { t } = useTranslation();
  return <AuthPage t={t} />;
}
