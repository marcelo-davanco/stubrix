import { useTranslation } from '../lib/i18n';
import { ContractsPage } from '@stubrix/mock-ui';

export default function ContractsBridge() {
  const { t } = useTranslation();
  return <ContractsPage t={t} />;
}
