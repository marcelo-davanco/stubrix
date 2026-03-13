import { useNavigate } from 'react-router-dom';
import { IntelligencePage } from '@stubrix/mock-ui';

export function IntelligenceBridge() {
  const navigate = useNavigate();
  return <IntelligencePage onNavigateBack={() => navigate('/')} />;
}
