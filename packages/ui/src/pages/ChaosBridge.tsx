import { useNavigate } from 'react-router-dom';
import { ChaosPanelPage } from '@stubrix/mock-ui';

export function ChaosBridge() {
  const navigate = useNavigate();
  return <ChaosPanelPage onNavigateBack={() => navigate('/')} />;
}
