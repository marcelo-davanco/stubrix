import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { ContractsPage } from '@stubrix/mock-ui';

export default function ContractsBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <ContractsPage t={t} onNavigateBack={() => navigate(-1)} />;
}
