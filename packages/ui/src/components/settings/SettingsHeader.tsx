import { Archive, Download, Upload, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SettingsHeaderProps {
  onExport: () => void
  onImport: () => void
}

export function SettingsHeader({ onExport, onImport }: SettingsHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <Settings size={22} className="text-primary flex-shrink-0" />
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-sm text-text-secondary">Manage all platform services and configurations</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/settings/backups')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-white/10 hover:bg-white/8 transition-colors"
        >
          <Archive size={14} />
          Backups
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-white/10 hover:bg-white/8 transition-colors"
        >
          <Download size={14} />
          Export
        </button>
        <button
          type="button"
          onClick={onImport}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-white/10 hover:bg-white/8 transition-colors"
        >
          <Upload size={14} />
          Import
        </button>
      </div>
    </div>
  )
}
