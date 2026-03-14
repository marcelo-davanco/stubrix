import { useTranslation } from '../lib/i18n';
import { TracingPage } from '@stubrix/mock-ui';

export default function TracingBridge() {
  const { t } = useTranslation();
  return <TracingPage t={t} />;
}
