import { Archive, Download, Eye, RotateCcw, Trash2, Lock } from 'lucide-react'
import { useTranslation } from '../../lib/i18n'

export interface BackupItem {
  id: string
  name: string
  description?: string
  scope: string
  servicesIncluded: string[]
  fileSize: number
  checksum: string
  encrypted: boolean
  createdAt: string
}

interface BackupCardProps {
  backup: BackupItem
  onPreview: (id: string) => void
  onRestore: (id: string) => void
  onDownload: (id: string) => void
  onDelete: (id: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function BackupCard({ backup, onPreview, onRestore, onDownload, onDelete }: BackupCardProps) {
  const { t } = useTranslation()
  const scopeLabel = backup.scope === 'full'
    ? t('backups.fullBackup', { count: backup.servicesIncluded.length })
    : t('backups.partialWithCount', { count: backup.servicesIncluded.length })

  const isAuto = backup.name.startsWith('auto-')

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Archive size={18} className="text-primary flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold truncate">{backup.name}</p>
              {isAuto && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-text-secondary">{t('backups.autoBackup')}</span>
              )}
              {backup.encrypted && (
                <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                  <Lock size={10} />
                  {t('backups.encrypted')}
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {t('backups.scope')}: {scopeLabel} | {t('backups.size')}: {formatBytes(backup.fileSize)}
            </p>
            <p className="text-xs text-text-secondary">{t('backups.createdAt')}: {formatDate(backup.createdAt)}</p>
            {backup.description && (
              <p className="text-xs text-text-secondary/70 mt-1 italic">{backup.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            title={t('backups.preview')}
            onClick={() => onPreview(backup.id)}
            className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            title={t('backups.restore')}
            onClick={() => onRestore(backup.id)}
            className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            title={t('backups.download')}
            onClick={() => onDownload(backup.id)}
            className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            title={t('common.delete')}
            onClick={() => onDelete(backup.id)}
            className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
