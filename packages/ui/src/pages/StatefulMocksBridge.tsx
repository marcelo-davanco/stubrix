import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { StatefulMocksPage } from '@stubrix/mock-ui';

export function StatefulMocksBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <StatefulMocksPage t={t} onNavigateBack={() => navigate('/')} />;
}
