import { RotateCcw } from 'lucide-react'
import type { ConfigHistoryEntry } from '../../hooks/useServiceConfig'

interface ConfigHistoryTimelineProps {
  entries: ConfigHistoryEntry[]
  onLoadMore: () => void
  onRollback: (historyId: number) => void
  hasMore?: boolean
}

const SOURCE_BADGE: Record<string, string> = {
  manual: 'bg-blue-500/20 text-blue-300',
  import: 'bg-green-500/20 text-green-300',
  restore: 'bg-yellow-500/20 text-yellow-300',
  rollback: 'bg-purple-500/20 text-purple-300',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function maskValue(value: string | undefined, key: string): string {
  if (!value) return '—'
  const lowerKey = key.toLowerCase()
  if (lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token'))
    return '•••'
  return value.length > 30 ? value.slice(0, 30) + '…' : value
}

export function ConfigHistoryTimeline({ entries, onLoadMore, onRollback, hasMore }: ConfigHistoryTimelineProps) {
  if (entries.length === 0) {
    return <p className="text-xs text-text-secondary text-center py-6">No history yet.</p>
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div key={entry.id} className="relative pl-4 border-l border-white/10">
          <span className="absolute -left-1 top-1 w-2 h-2 rounded-full bg-primary/60" />
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-mono font-semibold text-text-primary">{entry.key}</p>
              <p className="text-xs text-text-secondary mt-0.5">
                <span className="line-through opacity-60">{maskValue(entry.old_value, entry.key)}</span>
                <span className="mx-1 opacity-40">→</span>
                <span>{maskValue(entry.new_value, entry.key)}</span>
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-text-secondary/50">{timeAgo(entry.created_at)}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${SOURCE_BADGE[entry.source] ?? 'bg-white/10 text-text-secondary'}`}>
                  {entry.source}
                </span>
              </div>
            </div>
            <button
              type="button"
              title="Rollback to before this change"
              onClick={() => onRollback(entry.id)}
              className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          className="w-full text-center text-xs text-text-secondary hover:text-text-primary py-2 transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  )
}
