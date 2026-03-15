import { AlertCircle, RefreshCcw } from 'lucide-react'
import { useDbUiTranslation } from '../lib/i18n'

type InlineAlertProps = {
  message: string
  onRetry?: () => void
}

export function InlineAlert({ message, onRetry }: InlineAlertProps) {
  const t = useDbUiTranslation()
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
      <span className="flex-1 text-sm text-red-300">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20 focus:outline-none focus:ring-1 focus:ring-red-500/30"
        >
          <RefreshCcw size={12} /> {t('db.retry')}
        </button>
      )}
    </div>
  )
}
