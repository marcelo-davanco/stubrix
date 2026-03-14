import { X } from 'lucide-react'

interface DiffChange {
  key: string
  label: string
  oldValue: string
  newValue: string
  isSensitive: boolean
}

interface ConfigDiffPreviewProps {
  changes: DiffChange[]
  onConfirm: () => void
  onCancel: () => void
  saving?: boolean
}

export function ConfigDiffPreview({ changes, onConfirm, onCancel, saving }: ConfigDiffPreviewProps) {
  const mask = (val: string, sensitive: boolean) => (sensitive ? '••••••••' : val || '—')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold">Review Changes ({changes.length} modified)</h2>
          <button type="button" onClick={onCancel} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 max-h-80 overflow-y-auto space-y-4">
          {changes.map(({ key, label, oldValue, newValue, isSensitive }) => (
            <div key={key}>
              <p className="text-xs font-semibold text-text-secondary mb-1">{label}</p>
              <div className="font-mono text-xs space-y-0.5">
                <div className="flex items-start gap-2 text-red-400">
                  <span className="flex-shrink-0">-</span>
                  <span className="break-all">{mask(oldValue, isSensitive)}</span>
                </div>
                <div className="flex items-start gap-2 text-green-400">
                  <span className="flex-shrink-0">+</span>
                  <span className="break-all">{mask(newValue, isSensitive)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-white/10">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Apply Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
