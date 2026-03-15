import { useTranslation } from '../lib/i18n';
import { ChaosPanelPage } from '@stubrix/mock-ui';

export function ChaosBridge() {
  const { t } = useTranslation();
  return <ChaosPanelPage t={t} />;
}
