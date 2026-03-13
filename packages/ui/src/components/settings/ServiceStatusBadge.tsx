import { cn } from '../../lib/utils'

type HealthStatus = 'healthy' | 'unhealthy' | 'error' | 'unknown' | 'disabled'

interface ServiceStatusBadgeProps {
  status: HealthStatus
  size?: 'sm' | 'md'
}

const statusConfig: Record<HealthStatus, { dot: string; label: string; text: string }> = {
  healthy: { dot: 'bg-green-500', label: 'healthy', text: 'text-green-400' },
  unhealthy: { dot: 'bg-yellow-500', label: 'unhealthy', text: 'text-yellow-400' },
  error: { dot: 'bg-red-500', label: 'error', text: 'text-red-400' },
  disabled: { dot: 'bg-gray-500', label: 'disabled', text: 'text-gray-400' },
  unknown: { dot: 'bg-gray-400 border border-gray-500', label: 'unknown', text: 'text-gray-400' },
}

export function ServiceStatusBadge({ status, size = 'sm' }: ServiceStatusBadgeProps) {
  const cfg = statusConfig[status]
  return (
    <span className={cn('flex items-center gap-1.5', size === 'sm' ? 'text-xs' : 'text-sm')}>
      <span className={cn('rounded-full flex-shrink-0', cfg.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      <span className={cfg.text}>{cfg.label}</span>
    </span>
  )
}
