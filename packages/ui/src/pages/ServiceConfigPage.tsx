import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, RotateCcw, AlertTriangle } from 'lucide-react'
import { useTranslation } from '../lib/i18n'
import { useServiceConfig } from '../hooks/useServiceConfig'
import { useSettings } from '../hooks/useSettings'
import { ConfigField } from '../components/settings/ConfigField'
import { ConfigDiffPreview } from '../components/settings/ConfigDiffPreview'
import { ConfigHistoryTimeline } from '../components/settings/ConfigHistoryTimeline'
import { ServiceStatusBadge } from '../components/settings/ServiceStatusBadge'

export function ServiceConfigPage() {
  const { serviceId } = useParams<{ serviceId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { services, cryptoStatus, verifyMasterPassword } = useSettings()
  const {
    schema,
    configs,
    effective,
    history,
    dirty,
    saving,
    loading,
    error,
    hasChanges,
    updateField,
    save,
    resetAll,
    resetField,
    rollback,
    loadMoreHistory,
  } = useServiceConfig(serviceId ?? '')

  const [showDiff, setShowDiff] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const service = services.find((s) => s.serviceId === serviceId)
  const sessionActive = cryptoStatus?.sessionActive ?? false

  const goBack = () => {
    if (hasChanges && !window.confirm(t('serviceConfig.leaveConfirm'))) return
    navigate('/settings')
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const getDiffChanges = () =>
    Object.entries(dirty).map(([key, newValue]) => {
      const field = schema.find((f) => f.key === key)
      return {
        key,
        label: field?.label ?? key,
        oldValue: configs[key]?.value ?? '',
        newValue,
        isSensitive: field?.sensitive ?? false,
      }
    })

  const handleSave = async () => {
    try {
      await save()
      setShowDiff(false)
      showToast('success', t('serviceConfig.saved'))
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : t('serviceConfig.saveFailed'))
    }
  }

  const handleResetAll = async () => {
    try {
      await resetAll()
      setShowResetConfirm(false)
      showToast('success', t('serviceConfig.resetDone'))
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : t('serviceConfig.resetFailed'))
    }
  }

  const handleRollback = async (historyId: number) => {
    try {
      await rollback(historyId)
      showToast('success', t('serviceConfig.rollbackDone'))
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : t('serviceConfig.rollbackFailed'))
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-text-secondary">
        <div className="text-sm animate-pulse">{t('serviceConfig.loading')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm text-text-secondary mb-4">{error}</p>
          <button type="button" onClick={() => navigate('/settings')} className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary rounded-lg transition-colors">
            {t('serviceConfig.backToSettings')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/10 flex-shrink-0">
        <button type="button" onClick={goBack} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-4">
          <ArrowLeft size={14} />
          {t('serviceConfig.backToSettings')}
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{service?.name ?? serviceId} {t('serviceConfig.configuration')}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
              {service && (
                <>
                  <span>{service.category}</span>
                  <span>·</span>
                  <ServiceStatusBadge status={service.healthStatus} size="md" />
                  {service.port && <><span>·</span><span className="font-mono">:{service.port}</span></>}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-white/10 hover:bg-white/8 transition-colors"
            >
              <RotateCcw size={14} />
              {t('serviceConfig.resetAll')}
            </button>
            <button
              type="button"
              onClick={() => hasChanges && setShowDiff(true)}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-primary/80 hover:bg-primary font-medium transition-colors disabled:opacity-40"
            >
              <Save size={14} />
              {saving ? t('serviceConfig.saving') : hasChanges ? t('serviceConfig.saveCount', { count: String(Object.keys(dirty).length) }) : t('serviceConfig.save')}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Config form */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {schema.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('serviceConfig.noFields')}</p>
          ) : (
            schema.map((field) => {
              const currentValue = dirty[field.key] ?? configs[field.key]?.value ?? field.defaultValue ?? ''
              return (
                <ConfigField
                  key={field.key}
                  field={field}
                  value={currentValue}
                  effective={effective[field.key]}
                  onChange={(val) => updateField(field.key, val)}
                  onReset={() => void resetField(field.key)}
                  onRequestUnlock={() => verifyMasterPassword('')}
                  sessionActive={sessionActive}
                />
              )
            })
          )}
        </div>

        {/* History sidebar */}
        <div className="w-72 flex-shrink-0 border-l border-white/10 px-4 py-6 overflow-y-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">{t('serviceConfig.historyTitle')}</h3>
          <ConfigHistoryTimeline
            entries={history}
            onLoadMore={loadMoreHistory}
            onRollback={(id) => void handleRollback(id)}
            hasMore={history.length >= 20}
          />
        </div>
      </div>

      {/* Diff Preview */}
      {showDiff && (
        <ConfigDiffPreview
          changes={getDiffChanges()}
          saving={saving}
          onConfirm={() => void handleSave()}
          onCancel={() => setShowDiff(false)}
        />
      )}

      {/* Reset confirm */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-base font-semibold mb-2">{t('serviceConfig.resetConfirmTitle')}</h2>
            <p className="text-sm text-text-secondary mb-5">{t('serviceConfig.resetConfirmDesc')}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowResetConfirm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">{t('serviceConfig.cancel')}</button>
              <button type="button" onClick={() => void handleResetAll()} className="px-4 py-2 text-sm bg-red-600/80 hover:bg-red-600 rounded-lg font-medium transition-colors">{t('serviceConfig.resetAllButton')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
