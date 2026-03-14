// F34 — Service Configuration Panel types

export type ServiceCategory =
  | 'mock-engines'
  | 'databases'
  | 'db-viewers'
  | 'cloud'
  | 'storage'
  | 'iam'
  | 'observability'
  | 'tracing'
  | 'events'
  | 'protocols'
  | 'contracts'
  | 'chaos'
  | 'ai'
  | 'api-clients';

export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown' | 'disabled';

export interface ConfigField {
  key: string;
  label: string;
  description?: string;
  dataType: 'string' | 'number' | 'boolean' | 'json' | 'select';
  defaultValue?: unknown;
  required?: boolean;
  sensitive?: boolean;
  options?: { label: string; value: string }[];
  validation?: { min?: number; max?: number; pattern?: string };
}

export interface ServiceDefinition {
  id: string;
  name: string;
  category: ServiceCategory;
  dockerProfile?: string;
  dockerService?: string;
  defaultPort?: number;
  externalUrl?: string;
  enabled: boolean;
  autoStart: boolean;
  healthStatus: HealthStatus;
  lastHealthCheck?: string;
  dependsOn?: string[];
  configSchema: ConfigField[];
}

export interface ConfigEntry {
  key: string;
  value: string;
  isSensitive: boolean;
  dataType: string;
  description?: string;
  checksum: string;
}

export interface ConfigBackup {
  id: string;
  name: string;
  description?: string;
  scope: 'full' | 'partial';
  servicesIncluded: string[];
  fileSize: number;
  encrypted: boolean;
  format: 'json' | 'yaml';
  version: string;
  createdAt: string;
}

export interface ConfigExportOptions {
  serviceIds?: string[];
  encrypted?: boolean;
  format?: 'json' | 'yaml';
  includeSensitive?: boolean;
  masterPassword?: string;
}

export interface ConfigImportPreview {
  services: {
    serviceId: string;
    serviceName: string;
    changes: ConfigChange[];
    status: 'new' | 'modified' | 'unchanged';
  }[];
  totalChanges: number;
  warnings: string[];
}

export interface ConfigChange {
  key: string;
  action: 'create' | 'update' | 'delete';
  oldValue?: string;
  newValue?: string;
}

export interface ConfigHistoryEntry {
  id: number;
  serviceId: string;
  key: string;
  oldValue?: string;
  newValue?: string;
  action: string;
  source: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: number;
  serviceId: string;
  key: string;
  action: string;
  source: string;
  createdAt: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
}

export interface ServiceDefinitionSeed {
  id: string;
  name: string;
  category: ServiceCategory;
  dockerProfile?: string;
  dockerService?: string;
  dockerCompanions?: string[];
  defaultPort?: number;
  externalUrl?: string;
  dependsOn: string[];
  configSchema: ConfigField[];
}

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  'mock-engines': 'Mock Engines',
  databases: 'Databases',
  'db-viewers': 'DB Viewers',
  cloud: 'Cloud',
  storage: 'Storage',
  iam: 'Identity & Access',
  observability: 'Observability',
  tracing: 'Tracing',
  events: 'Events',
  protocols: 'Protocols',
  contracts: 'Contracts',
  chaos: 'Chaos',
  ai: 'AI / RAG',
  'api-clients': 'API Clients',
};

// Database row types (used by ConfigDatabaseService)
export interface ServiceRow {
  id: string;
  name: string;
  category: ServiceCategory;
  docker_profile?: string;
  docker_service?: string;
  default_port?: number;
  external_url?: string;
  enabled: number;
  auto_start: number;
  health_status: string;
  last_health_check?: string;
  created_at: string;
  updated_at: string;
}

export interface ConfigRow {
  id?: number;
  service_id: string;
  key: string;
  value: string;
  is_sensitive: number;
  description?: string;
  data_type: string;
  checksum?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HistoryEntry {
  id?: number;
  service_id: string;
  key: string;
  old_value?: string;
  new_value?: string;
  action: string;
  source: string;
  created_at?: string;
}

export interface BackupRow {
  id: string;
  name: string;
  description?: string;
  scope: string;
  services_included?: string;
  file_path: string;
  file_size?: number;
  checksum: string;
  encrypted: number;
  format: string;
  version: string;
  created_at?: string;
}

export interface MasterKeyRow {
  id: number;
  password_hash: string;
  salt: Buffer;
  created_at: string;
  updated_at: string;
}

export interface DbStats {
  size: number;
  tables: number;
  totalRows: number;
}
