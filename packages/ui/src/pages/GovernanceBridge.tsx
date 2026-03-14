import { useNavigate } from 'react-router-dom';
import { GovernancePage } from '@stubrix/mock-ui';

export function GovernanceBridge() {
  const navigate = useNavigate();
  return <GovernancePage onNavigateBack={() => navigate('/')} />;
}
