import { useNavigate } from 'react-router-dom';
import { ProtocolsPage } from '@stubrix/mock-ui';

export default function ProtocolsBridge() {
  const navigate = useNavigate();
  return <ProtocolsPage onNavigateBack={() => navigate(-1)} />;
}
