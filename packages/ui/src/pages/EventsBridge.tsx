import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { EventsPage } from '@stubrix/mock-ui';

export default function EventsBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <EventsPage t={t} onNavigateBack={() => navigate(-1)} />;
}
