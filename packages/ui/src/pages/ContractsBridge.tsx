import { useNavigate } from 'react-router-dom';
import { ContractsPage } from '@stubrix/mock-ui';

export default function ContractsBridge() {
  const navigate = useNavigate();
  return <ContractsPage onNavigateBack={() => navigate(-1)} />;
}
