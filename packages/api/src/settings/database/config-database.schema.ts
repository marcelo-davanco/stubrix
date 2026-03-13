/**
 * F34.01 — SQLite Config Database Schema Definitions
 *
 * All SQL statements for the settings configuration database.
 * Tables: schema_version, master_key, services, service_configs, config_history, backups
 */

export const SCHEMA_VERSION_TABLE = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const MASTER_KEY_TABLE = `
CREATE TABLE IF NOT EXISTS master_key (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,
  salt BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const SERVICES_TABLE = `
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  docker_profile TEXT,
  docker_service TEXT,
  default_port INTEGER,
  external_url TEXT,
  enabled INTEGER NOT NULL DEFAULT 0,
  health_status TEXT NOT NULL DEFAULT 'unknown',
  last_health_check TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const SERVICE_CONFIGS_TABLE = `
CREATE TABLE IF NOT EXISTS service_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  is_sensitive INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  data_type TEXT NOT NULL DEFAULT 'string',
  checksum TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(service_id, key)
);
`;

export const CONFIG_HISTORY_TABLE = `
CREATE TABLE IF NOT EXISTS config_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  action TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const BACKUPS_TABLE = `
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL DEFAULT 'full',
  services_included TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  checksum TEXT NOT NULL,
  encrypted INTEGER NOT NULL DEFAULT 0,
  format TEXT NOT NULL DEFAULT 'json',
  version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const INDEXES = `
CREATE INDEX IF NOT EXISTS idx_service_configs_service ON service_configs(service_id);
CREATE INDEX IF NOT EXISTS idx_config_history_service ON config_history(service_id);
CREATE INDEX IF NOT EXISTS idx_config_history_created ON config_history(created_at);
CREATE INDEX IF NOT EXISTS idx_backups_created ON backups(created_at);
`;

export const INITIAL_SCHEMA_SQL = [
  SCHEMA_VERSION_TABLE,
  MASTER_KEY_TABLE,
  SERVICES_TABLE,
  SERVICE_CONFIGS_TABLE,
  CONFIG_HISTORY_TABLE,
  BACKUPS_TABLE,
  INDEXES,
].join('\n');
