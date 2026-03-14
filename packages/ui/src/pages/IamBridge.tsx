import { useTranslation } from '../lib/i18n';
import { IamPage } from '@stubrix/mock-ui';

export default function IamBridge() {
  const { t } = useTranslation();
  return <IamPage t={t} />;
}
