import { useNavigate } from 'react-router-dom';
import { CloudPage } from '@stubrix/mock-ui';

export default function CloudBridge() {
  const navigate = useNavigate();
  return <CloudPage onNavigateBack={() => navigate(-1)} />;
}
