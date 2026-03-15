import type { ServiceStatus } from '../../hooks/useSettings'
import { ServiceCard } from './ServiceCard'

const CATEGORY_LABELS: Record<string, string> = {
  mock_engines: 'Mock Engines',
  databases: 'Databases',
  db_viewers: 'DB Viewers',
  cloud: 'Cloud',
  storage: 'Storage',
  iam: 'IAM',
  observability: 'Observability',
  tracing: 'Tracing',
  events: 'Events',
  protocols: 'Protocols',
  contracts: 'Contracts',
  chaos: 'Chaos',
  ai: 'AI / Intelligence',
  api_clients: 'API Clients',
}

interface ServiceGridProps {
  services: ServiceStatus[]
  selectedCategory: string | null
  onToggle: (serviceId: string, enabled: boolean) => Promise<void> | void
  onToggleAutoStart: (serviceId: string, autoStart: boolean) => void
  onRestart: (serviceId: string) => void
  onViewLogs: (serviceId: string) => void
}

export function ServiceGrid({
  services,
  selectedCategory,
  onToggle,
  onToggleAutoStart,
  onRestart,
  onViewLogs,
}: ServiceGridProps) {
  const filtered = selectedCategory
    ? services.filter((s) => s.category === selectedCategory)
    : services

  const byCategory = filtered.reduce<Record<string, ServiceStatus[]>>((acc, svc) => {
    const cat = svc.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(svc)
    return acc
  }, {})

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
        No services found.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-8 pr-1">
      {Object.entries(byCategory).map(([category, svcs]) => (
        <section key={category}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
            {CATEGORY_LABELS[category] ?? category} ({svcs.length})
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {svcs.map((svc) => (
              <ServiceCard
                key={svc.serviceId}
                service={svc}
                onToggle={onToggle}
                onToggleAutoStart={onToggleAutoStart}
                onRestart={onRestart}
                onViewLogs={onViewLogs}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
