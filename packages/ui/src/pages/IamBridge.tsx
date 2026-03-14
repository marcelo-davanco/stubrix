import { useNavigate } from 'react-router-dom';
import { IamPage } from '@stubrix/mock-ui';

export default function IamBridge() {
  const navigate = useNavigate();
  return <IamPage onNavigateBack={() => navigate(-1)} />;
}
