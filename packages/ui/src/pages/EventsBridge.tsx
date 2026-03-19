import { useTranslation } from '../lib/i18n';
import { EventsPage } from '@stubrix/mock-ui';

export default function EventsBridge() {
  const { t } = useTranslation();
  return <EventsPage t={t} />;
}
