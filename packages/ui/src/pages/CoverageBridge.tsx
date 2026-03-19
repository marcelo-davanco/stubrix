import { useTranslation } from '../lib/i18n';
import { CoveragePage } from '@stubrix/mock-ui';

export function CoverageBridge() {
  const { t } = useTranslation();
  return <CoveragePage t={t} />;
}
