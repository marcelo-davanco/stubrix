import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon: ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-main-bg p-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-text-secondary/60">
        {icon}
      </div>
      <h3 className="mb-1 text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mb-5 max-w-xs text-xs leading-relaxed text-text-secondary">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-lg bg-primary/15 px-4 py-2 text-xs font-medium text-primary transition-all hover:bg-primary/25 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
