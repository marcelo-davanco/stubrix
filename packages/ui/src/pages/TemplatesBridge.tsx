import { useTranslation } from '../lib/i18n';
import { TemplatesPage } from '@stubrix/mock-ui';

export function TemplatesBridge() {
  const { t } = useTranslation();
  return <TemplatesPage t={t} />;
}
