import { useState, useEffect, useCallback } from 'react'

export interface ServiceStatus {
  serviceId: string
  name: string
  category: string
  enabled: boolean
  healthStatus: 'healthy' | 'unhealthy' | 'error' | 'unknown' | 'disabled'
  port?: number
  externalUrl?: string
  dockerProfile?: string
  dockerService?: string
}

export interface CryptoStatus {
  configured: boolean
  sessionActive: boolean
  sessionExpiresIn: number
}

const API = '/api/settings'

export function useSettings() {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [cryptoStatus, setCryptoStatus] = useState<CryptoStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchServices = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(`${API}/services`)
      if (!res.ok) throw new Error(`Failed to load services: ${res.statusText}`)
      const data = (await res.json()) as ServiceStatus[]
      setServices(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCryptoStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/master-password/status`)
      if (res.ok) {
        setCryptoStatus((await res.json()) as CryptoStatus)
      }
    } catch {
      // non-critical
    }
  }, [])

  useEffect(() => {
    void fetchServices()
    void fetchCryptoStatus()
  }, [fetchServices, fetchCryptoStatus])

  const toggleService = async (serviceId: string, enabled: boolean) => {
    const endpoint = enabled ? 'enable' : 'disable'
    await fetch(`${API}/services/${serviceId}/${endpoint}`, { method: 'POST' })
    await fetchServices()
  }

  const restartService = async (serviceId: string) => {
    await fetch(`${API}/services/${serviceId}/restart`, { method: 'POST' })
    await fetchServices()
  }

  const getServiceLogs = async (serviceId: string, tail = 100): Promise<string> => {
    const res = await fetch(`${API}/services/${serviceId}/logs?tail=${tail}`)
    if (!res.ok) return 'Failed to load logs.'
    const data = (await res.json()) as { logs: string }
    return data.logs
  }

  const setupMasterPassword = async (password: string): Promise<void> => {
    const res = await fetch(`${API}/master-password/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) throw new Error('Failed to setup password')
    await fetchCryptoStatus()
  }

  const verifyMasterPassword = async (password: string): Promise<boolean> => {
    const res = await fetch(`${API}/master-password/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { success: boolean }
    await fetchCryptoStatus()
    return data.success
  }

  const lockSession = async (): Promise<void> => {
    await fetch(`${API}/master-password/lock`, { method: 'POST' })
    await fetchCryptoStatus()
  }

  return {
    services,
    cryptoStatus,
    loading,
    error,
    toggleService,
    restartService,
    getServiceLogs,
    setupMasterPassword,
    verifyMasterPassword,
    lockSession,
    refetch: fetchServices,
    refetchCrypto: fetchCryptoStatus,
  }
}
