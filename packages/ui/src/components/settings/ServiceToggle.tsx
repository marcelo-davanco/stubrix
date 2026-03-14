import { useState } from 'react'
import { cn } from '../../lib/utils'

interface ServiceToggleProps {
  enabled: boolean
  loading?: boolean
  onChange: (enabled: boolean) => Promise<void> | void
}

export function ServiceToggle({ enabled, loading, onChange }: ServiceToggleProps) {
  const [pending, setPending] = useState(false)

  const handleClick = async () => {
    if (pending || loading) return
    setPending(true)
    try {
      await onChange(!enabled)
    } finally {
      setPending(false)
    }
  }

  const busy = pending || loading

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={enabled ? 'Disable service' : 'Enable service'}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40',
        enabled ? 'bg-primary' : 'bg-white/20',
        busy && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-4' : 'translate-x-1',
        )}
      />
    </button>
  )
}
