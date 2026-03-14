import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { TemplatesPage } from '@stubrix/mock-ui';

export function TemplatesBridge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return <TemplatesPage t={t} onNavigateBack={() => navigate('/')} />;
}
