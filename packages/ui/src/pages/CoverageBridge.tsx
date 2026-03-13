import { useNavigate } from 'react-router-dom';
import { CoveragePage } from '@stubrix/mock-ui';

export function CoverageBridge() {
  const navigate = useNavigate();
  return <CoveragePage onNavigateBack={() => navigate('/')} />;
}
