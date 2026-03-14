import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { CoveragePage } from '@stubrix/mock-ui';

export function CoverageBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <CoveragePage t={t} onNavigateBack={() => navigate('/')} />;
}
