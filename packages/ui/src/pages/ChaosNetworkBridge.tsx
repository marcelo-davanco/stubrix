import { useTranslation } from '../lib/i18n';
import { ChaosNetworkPage } from '@stubrix/mock-ui';

export default function ChaosNetworkBridge() {
  const { t } = useTranslation();
  return <ChaosNetworkPage t={t} />;
}
