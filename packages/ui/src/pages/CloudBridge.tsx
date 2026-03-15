import { useTranslation } from '../lib/i18n';
import { CloudPage } from '@stubrix/mock-ui';

export default function CloudBridge() {
  const { t } = useTranslation();
  return <CloudPage t={t} />;
}
