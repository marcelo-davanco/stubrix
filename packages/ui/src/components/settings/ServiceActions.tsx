import { Settings, RefreshCw, ScrollText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../lib/i18n';
import { cn } from '../../lib/utils';

interface ServiceActionsProps {
  serviceId: string;
  externalUrl?: string;
  onRestart: () => void;
  onViewLogs: () => void;
}

const btnClass = cn(
  'p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors',
);

export function ServiceActions({
  serviceId,
  externalUrl,
  onRestart,
  onViewLogs,
}: ServiceActionsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        title={t('settings.configure')}
        className={btnClass}
        onClick={() => navigate(`/settings/services/${serviceId}`)}
      >
        <Settings size={13} />
      </button>
      <button
        type="button"
        title={t('settings.restart')}
        className={btnClass}
        onClick={onRestart}
      >
        <RefreshCw size={13} />
      </button>
      <button
        type="button"
        title={t('settings.logs')}
        className={btnClass}
        onClick={onViewLogs}
      >
        <ScrollText size={13} />
      </button>
      {externalUrl && (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={t('settings.openUi')}
          className={btnClass}
        >
          <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}
