import { useTranslation } from '../lib/i18n';
import { ScenariosPage } from '@stubrix/mock-ui';

export function ScenariosBridge() {
  const { t } = useTranslation();
  return <ScenariosPage t={t} />;
}
