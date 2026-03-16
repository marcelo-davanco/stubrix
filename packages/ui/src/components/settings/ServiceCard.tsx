import type { ServiceStatus } from '../../hooks/useSettings';
import { useTranslation } from '../../lib/i18n';
import { ServiceStatusBadge } from './ServiceStatusBadge';
import { ServiceToggle } from './ServiceToggle';
import { ServiceActions } from './ServiceActions';

interface ServiceCardProps {
  service: ServiceStatus;
  onToggle: (serviceId: string, enabled: boolean) => Promise<void> | void;
  onToggleAutoStart: (serviceId: string, autoStart: boolean) => void;
  onRestart: (serviceId: string) => void;
  onViewLogs: (serviceId: string) => void;
}

export function ServiceCard({
  service,
  onToggle,
  onToggleAutoStart,
  onRestart,
  onViewLogs,
}: ServiceCardProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3 hover:border-white/20 transition-colors min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-sm text-text-primary truncate">
          {service.name}
        </span>
        <ServiceToggle
          enabled={service.enabled}
          onChange={(val) => onToggle(service.serviceId, val)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <ServiceStatusBadge status={service.healthStatus} />
        {service.port && (
          <span className="text-xs text-text-secondary font-mono">
            :{service.port}
          </span>
        )}
      </div>

      {service.enabled && (
        <button
          type="button"
          title={
            service.autoStart
              ? t('settings.autoStartOnTitle')
              : t('settings.autoStartOffTitle')
          }
          onClick={() =>
            onToggleAutoStart(service.serviceId, !service.autoStart)
          }
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors w-fit ${
            service.autoStart
              ? 'bg-primary/20 text-primary hover:bg-primary/30'
              : 'bg-white/5 text-text-secondary hover:bg-white/10'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${service.autoStart ? 'bg-primary' : 'bg-white/30'}`}
          />
          {service.autoStart
            ? t('settings.autoStartOn')
            : t('settings.autoStartOff')}
        </button>
      )}

      <ServiceActions
        serviceId={service.serviceId}
        externalUrl={service.externalUrl}
        onRestart={() => onRestart(service.serviceId)}
        onViewLogs={() => onViewLogs(service.serviceId)}
      />
    </div>
  );
}
