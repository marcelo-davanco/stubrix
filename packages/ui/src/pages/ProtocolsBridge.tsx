import { useTranslation } from '../lib/i18n';
import { ProtocolsPage } from '@stubrix/mock-ui';

export default function ProtocolsBridge() {
  const { t } = useTranslation();
  return <ProtocolsPage t={t} />;
}
