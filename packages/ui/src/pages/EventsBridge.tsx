import { useNavigate } from 'react-router-dom';
import { EventsPage } from '@stubrix/mock-ui';

export default function EventsBridge() {
  const navigate = useNavigate();
  return <EventsPage onNavigateBack={() => navigate(-1)} />;
}
