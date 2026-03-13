type Source = 'env' | 'database' | 'default'

interface EffectiveConfigBadgeProps {
  source: Source
}

const config: Record<Source, { label: string; className: string }> = {
  env: { label: 'ENV', className: 'bg-purple-500/20 text-purple-300' },
  database: { label: 'Custom', className: 'bg-blue-500/20 text-blue-300' },
  default: { label: 'Default', className: 'bg-white/10 text-text-secondary' },
}

export function EffectiveConfigBadge({ source }: EffectiveConfigBadgeProps) {
  const { label, className } = config[source]
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${className}`}>{label}</span>
  )
}
