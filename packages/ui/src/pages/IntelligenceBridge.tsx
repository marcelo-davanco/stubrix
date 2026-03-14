import { useTranslation } from '../lib/i18n';
import { IntelligencePage } from '@stubrix/mock-ui';

export function IntelligenceBridge() {
  const { t } = useTranslation();
  return <IntelligencePage t={t} />;
}
