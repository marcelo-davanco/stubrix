import { useState, useEffect, useCallback } from 'react'

export interface ConfigEntry {
  key: string
  value: string
  isSensitive: boolean
  dataType: string
  description?: string
  checksum?: string
}

export interface EffectiveConfigValue {
  value: string
  source: 'env' | 'database' | 'default'
}

export interface ConfigHistoryEntry {
  id: number
  service_id: string
  key: string
  old_value?: string
  new_value: string
  action: string
  source: string
  created_at: string
}

export interface ConfigField {
  key: string
  label: string
  dataType: string
  sensitive: boolean
  required: boolean
  description?: string
  defaultValue?: string
  validation?: { min?: number; max?: number; pattern?: string; options?: string[] }
}

const API = '/api/settings'

export function useServiceConfig(serviceId: string) {
  const [schema, setSchema] = useState<ConfigField[]>([])
  const [configs, setConfigs] = useState<Record<string, ConfigEntry>>({})
  const [effective, setEffective] = useState<Record<string, EffectiveConfigValue>>({})
  const [history, setHistory] = useState<ConfigHistoryEntry[]>([])
  const [dirty, setDirty] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      setError(null)
      const [configRes, effectiveRes] = await Promise.all([
        fetch(`${API}/services/${serviceId}/config`),
        fetch(`${API}/services/${serviceId}/config?effective=true`),
      ])
      if (configRes.ok) {
        const data = (await configRes.json()) as Record<string, unknown>
        if (Array.isArray(data['schema'])) {
          setSchema(data['schema'] as ConfigField[])
        }
        if (data['configs'] && typeof data['configs'] === 'object') {
          setConfigs(data['configs'] as Record<string, ConfigEntry>)
        } else if (!('configs' in data) && !('schema' in data)) {
          setConfigs(data as unknown as Record<string, ConfigEntry>)
        }
      }
      if (effectiveRes.ok) setEffective((await effectiveRes.json()) as Record<string, EffectiveConfigValue>)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [serviceId])

  const fetchHistory = useCallback(
    async (limit = 20) => {
      const res = await fetch(`${API}/services/${serviceId}/config/history?limit=${limit}`)
      if (res.ok) setHistory((await res.json()) as ConfigHistoryEntry[])
    },
    [serviceId],
  )

  useEffect(() => {
    void fetchConfig()
    void fetchHistory()
  }, [fetchConfig, fetchHistory])

  const updateField = (key: string, value: string) => {
    setDirty((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const updates = Object.entries(dirty).map(([key, value]) => ({ key, value }))
      const res = await fetch(`${API}/services/${serviceId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: updates }),
      })
      if (!res.ok) throw new Error('Failed to save configuration')
      setDirty({})
      await fetchConfig()
      await fetchHistory()
    } finally {
      setSaving(false)
    }
  }

  const resetAll = async () => {
    const res = await fetch(`${API}/services/${serviceId}/config/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!res.ok) throw new Error('Failed to reset configuration')
    setDirty({})
    await fetchConfig()
    await fetchHistory()
  }

  const resetField = async (key: string) => {
    const res = await fetch(`${API}/services/${serviceId}/config/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: [key] }),
    })
    if (!res.ok) throw new Error(`Failed to reset ${key}`)
    setDirty((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    await fetchConfig()
  }

  const rollback = async (historyId: number) => {
    const res = await fetch(`${API}/services/${serviceId}/history/${historyId}/rollback`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Failed to rollback')
    await fetchConfig()
    await fetchHistory()
  }

  const hasChanges = Object.keys(dirty).length > 0

  return {
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
    refetch: fetchConfig,
    loadMoreHistory: () => fetchHistory(history.length + 20),
  }
}
