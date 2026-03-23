import {
  Settings,
  RefreshCw,
  ScrollText,
  ExternalLink,
  Hammer,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../lib/i18n';
import { cn } from '../../lib/utils';

interface ServiceActionsProps {
  serviceId: string;
  externalUrl?: string;
  onRestart: () => void;
  onRebuild: () => void;
  onRemoveContainer: () => void;
  onViewLogs: () => void;
}

const btnClass = cn(
  'p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors',
);

export function ServiceActions({
  serviceId,
  externalUrl,
  onRestart,
  onRebuild,
  onRemoveContainer,
  onViewLogs,
}: ServiceActionsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const handleRemoveClick = () => {
    if (confirmRemove) {
      onRemoveContainer();
      setConfirmRemove(false);
    } else {
      setConfirmRemove(true);
      setTimeout(() => setConfirmRemove(false), 3000);
    }
  };

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
        title={t('settings.rebuild')}
        className={btnClass}
        onClick={onRebuild}
      >
        <Hammer size={13} />
      </button>
      <button
        type="button"
        title={
          confirmRemove
            ? t('settings.removeContainerConfirm')
            : t('settings.removeContainer')
        }
        className={cn(
          btnClass,
          confirmRemove &&
            'text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20',
        )}
        onClick={handleRemoveClick}
      >
        <Trash2 size={13} />
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
