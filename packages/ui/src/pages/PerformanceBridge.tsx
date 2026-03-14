import { useNavigate } from 'react-router-dom';
import { PerformancePage } from '@stubrix/mock-ui';

export default function PerformanceBridge() {
  const navigate = useNavigate();
  return <PerformancePage onNavigateBack={() => navigate(-1)} />;
}
