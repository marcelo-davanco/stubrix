import { useNavigate } from 'react-router-dom';
import { TracingPage } from '@stubrix/mock-ui';

export default function TracingBridge() {
  const navigate = useNavigate();
  return <TracingPage onNavigateBack={() => navigate(-1)} />;
}
