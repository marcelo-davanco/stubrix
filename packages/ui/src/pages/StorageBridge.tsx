import { useNavigate } from 'react-router-dom';
import { StoragePage } from '@stubrix/mock-ui';

export default function StorageBridge() {
  const navigate = useNavigate();
  return <StoragePage onNavigateBack={() => navigate(-1)} />;
}
