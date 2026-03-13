import { useNavigate } from 'react-router-dom';
import { ScenariosPage } from '@stubrix/mock-ui';

export function ScenariosBridge() {
  const navigate = useNavigate();
  return <ScenariosPage onNavigateBack={() => navigate('/')} />;
}
