import { cn } from '../../lib/utils'

type ConflictStrategy = 'skip' | 'overwrite' | 'merge'

interface ConflictStrategySelectorProps {
  value: ConflictStrategy
  onChange: (strategy: ConflictStrategy) => void
}

const options: { value: ConflictStrategy; label: string; description: string }[] = [
  {
    value: 'skip',
    label: 'Skip',
    description: 'Only add new keys. Never overwrite existing values. Safest option.',
  },
  {
    value: 'overwrite',
    label: 'Overwrite',
    description: 'Replace all existing values with imported values. Use for full sync.',
  },
  {
    value: 'merge',
    label: 'Merge',
    description: 'Import new keys and update only values that match defaults. Keeps your customizations.',
  },
]

export function ConflictStrategySelector({ value, onChange }: ConflictStrategySelectorProps) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
            value === opt.value
              ? 'border-primary/50 bg-primary/10'
              : 'border-white/10 hover:border-white/20',
          )}
        >
          <input
            type="radio"
            name="conflict-strategy"
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="mt-0.5 accent-primary"
          />
          <div>
            <p className="text-sm font-medium">{opt.label}</p>
            <p className="text-xs text-text-secondary mt-0.5">{opt.description}</p>
          </div>
        </label>
      ))}
    </div>
  )
}
