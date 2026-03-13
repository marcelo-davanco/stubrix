import { useNavigate } from 'react-router-dom';
import { ChaosNetworkPage } from '@stubrix/mock-ui';

export default function ChaosNetworkBridge() {
  const navigate = useNavigate();
  return <ChaosNetworkPage onNavigateBack={() => navigate(-1)} />;
}
