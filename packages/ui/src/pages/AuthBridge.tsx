import { useNavigate } from 'react-router-dom';
import { AuthPage } from '@stubrix/mock-ui';

export default function AuthBridge() {
  const navigate = useNavigate();
  return <AuthPage onNavigateBack={() => navigate(-1)} />;
}
