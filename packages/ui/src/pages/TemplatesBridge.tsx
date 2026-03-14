import { useNavigate } from 'react-router-dom';
import { TemplatesPage } from '@stubrix/mock-ui';

export function TemplatesBridge() {
  const navigate = useNavigate();
  return <TemplatesPage onNavigateBack={() => navigate('/')} />;
}
