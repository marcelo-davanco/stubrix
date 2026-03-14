import { useNavigate } from 'react-router-dom';
import { StatefulMocksPage } from '@stubrix/mock-ui';

export function StatefulMocksBridge() {
  const navigate = useNavigate();
  return <StatefulMocksPage onNavigateBack={() => navigate('/')} />;
}
