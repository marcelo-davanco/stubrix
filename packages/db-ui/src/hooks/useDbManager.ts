import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DatabaseInfo, Engine, Project, Snapshot } from '@stubrix/shared'
import {
  dbApi,
  type ProjectDatabaseConfigItem,
  type UpsertProjectDatabaseConfigPayload,
} from '../lib/db-api'

type CreateSnapshotPayload = {
  label: string
  database: string
  category?: null | string
}

export function useDbManager() {
  const [projects, setProjects] = useState([] as Array<Project>)
  const [selectedProjectId, setSelectedProjectId] = useState('default')
  const [engines, setEngines] = useState([] as Array<Engine>)
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null)
  const [databases, setDatabases] = useState([] as Array<string>)
  const [projectDatabaseConfigs, setProjectDatabaseConfigs] = useState(
    [] as Array<ProjectDatabaseConfigItem>,
  )
  const [snapshots, setSnapshots] = useState([] as Array<Snapshot>)
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    const response = await dbApi.getProjects()
    setProjects(response)
    setSelectedProjectId((current) => current || response[0]?.id || 'default')
  }, [])

  const loadEngines = useCallback(async () => {
    const response = await dbApi.getEngines()
    setEngines(response.engines)
    const firstActive = response.engines.find((engine) => engine.status === 'active')
    setSelectedEngine((current) => current || firstActive?.name || null)
  }, [])

  const loadSnapshots = useCallback(async (projectId?: string) => {
    const response = await dbApi.getSnapshots(projectId)
    setSnapshots(response.snapshots)
  }, [])

  const loadProjectDatabaseConfigs = useCallback(async (projectId: string) => {
    const response = await dbApi.getProjectDatabaseConfigs(projectId)
    setProjectDatabaseConfigs(response)
  }, [])

  const loadDatabases = useCallback(
    async (engine?: string | null, projectId?: string) => {
      if (!engine) {
        setDatabases([])
        return
      }
      const response = await dbApi.getDatabases(engine, projectId)
      setDatabases(response.databases)
    },
    [],
  )

  const refreshAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await loadProjects()
      await loadEngines()
      await loadSnapshots(selectedProjectId)
      await loadProjectDatabaseConfigs(selectedProjectId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [loadEngines, loadProjectDatabaseConfigs, loadProjects, loadSnapshots, selectedProjectId])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  useEffect(() => {
    void loadSnapshots(selectedProjectId)
  }, [loadSnapshots, selectedProjectId])

  useEffect(() => {
    void loadProjectDatabaseConfigs(selectedProjectId)
  }, [loadProjectDatabaseConfigs, selectedProjectId])

  useEffect(() => {
    void loadDatabases(selectedEngine, selectedProjectId)
  }, [loadDatabases, selectedEngine, selectedProjectId])

  const activeEngines = useMemo(
    () => engines.filter((engine) => engine.status === 'active'),
    [engines],
  )

  const preferredProjectConfig = useMemo(
    () =>
      projectDatabaseConfigs.find(
        (config) => !selectedEngine || config.engine === selectedEngine,
      ) ?? projectDatabaseConfigs[0] ?? null,
    [projectDatabaseConfigs, selectedEngine],
  )

  const filteredSnapshots = useMemo(
    () => snapshots.filter((snapshot) => !selectedEngine || snapshot.engine === selectedEngine),
    [selectedEngine, snapshots],
  )

  useEffect(() => {
    if (!preferredProjectConfig) {
      return
    }

    setSelectedEngine((current) => current ?? preferredProjectConfig.engine)
  }, [preferredProjectConfig])

  const getDatabaseInfo = useCallback(
    async (name: string) => {
      if (!selectedEngine) return null
      const info = await dbApi.getDatabaseInfo(
        name,
        selectedEngine,
        selectedProjectId,
      )
      setDatabaseInfo(info)
      return info
    },
    [selectedEngine, selectedProjectId],
  )

  const createSnapshot = useCallback(
    async (payload: CreateSnapshotPayload) => {
      if (!selectedEngine) throw new Error('No engine selected')
      await dbApi.createSnapshot(selectedEngine, {
        ...payload,
        projectId: selectedProjectId || undefined,
      })
      await loadSnapshots(selectedProjectId)
    },
    [loadSnapshots, selectedEngine, selectedProjectId],
  )

  const restoreSnapshot = useCallback(
    async (name: string, database: string) => {
      if (!selectedEngine) throw new Error('No engine selected')
      await dbApi.restoreSnapshot(selectedEngine, name, database)
    },
    [selectedEngine],
  )

  const deleteSnapshot = useCallback(
    async (name: string) => {
      await dbApi.deleteSnapshot(name)
      await loadSnapshots(selectedProjectId)
    },
    [loadSnapshots, selectedProjectId],
  )

  const saveProjectDatabaseConfig = useCallback(
    async (payload: UpsertProjectDatabaseConfigPayload) => {
      await dbApi.upsertProjectDatabaseConfig(selectedProjectId, payload)
      await loadProjectDatabaseConfigs(selectedProjectId)
    },
    [loadProjectDatabaseConfigs, selectedProjectId],
  )

  const deleteProjectDatabaseConfig = useCallback(
    async (id: string) => {
      await dbApi.deleteProjectDatabaseConfig(selectedProjectId, id)
      await loadProjectDatabaseConfigs(selectedProjectId)
    },
    [loadProjectDatabaseConfigs, selectedProjectId],
  )

  return {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    engines,
    activeEngines,
    selectedEngine,
    setSelectedEngine,
    databases,
    preferredProjectConfig,
    projectDatabaseConfigs,
    snapshots: filteredSnapshots,
    databaseInfo,
    loading,
    error,
    refreshAll,
    getDatabaseInfo,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    saveProjectDatabaseConfig,
    deleteProjectDatabaseConfig,
  }
}
