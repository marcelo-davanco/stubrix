import type { ServiceStatus } from '../../hooks/useSettings'
import { ServiceStatusBadge } from './ServiceStatusBadge'
import { ServiceToggle } from './ServiceToggle'
import { ServiceActions } from './ServiceActions'

interface ServiceCardProps {
  service: ServiceStatus
  onToggle: (serviceId: string, enabled: boolean) => void
  onRestart: (serviceId: string) => void
  onViewLogs: (serviceId: string) => void
}

export function ServiceCard({ service, onToggle, onRestart, onViewLogs }: ServiceCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3 hover:border-white/20 transition-colors min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-sm text-text-primary truncate">{service.name}</span>
        <ServiceToggle
          enabled={service.enabled}
          onChange={(val) => onToggle(service.serviceId, val)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <ServiceStatusBadge status={service.healthStatus} />
        {service.port && (
          <span className="text-xs text-text-secondary font-mono">:{service.port}</span>
        )}
      </div>

      <ServiceActions
        serviceId={service.serviceId}
        externalUrl={service.externalUrl}
        onRestart={() => onRestart(service.serviceId)}
        onViewLogs={() => onViewLogs(service.serviceId)}
      />
    </div>
  )
}
