import { useTranslation } from '../lib/i18n';
import { StatefulMocksPage } from '@stubrix/mock-ui';

export function StatefulMocksBridge() {
  const { t } = useTranslation();
  return <StatefulMocksPage t={t} />;
}
