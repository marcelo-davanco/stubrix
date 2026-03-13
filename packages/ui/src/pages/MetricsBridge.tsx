import { useNavigate } from 'react-router-dom';
import { MetricsPage } from '@stubrix/mock-ui';

export default function MetricsBridge() {
  const navigate = useNavigate();
  return <MetricsPage onNavigateBack={() => navigate(-1)} />;
}
