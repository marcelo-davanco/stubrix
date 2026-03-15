import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { statSync } from 'fs';
import { dirname, resolve } from 'path';
import type {
  ServiceRow,
  ConfigRow,
  HistoryEntry,
  BackupRow,
  MasterKeyRow,
  DbStats,
  HealthStatus,
} from '@stubrix/shared';
import { getSchemaVersion, runMigrations } from './config-database.migration';

/**
 * F34.01 — ConfigDatabaseService
 *
 * Core service managing the dedicated SQLite config database.
 * Handles schema migrations, CRUD for services/configs/history/backups,
 * and master key storage.
 */
@Injectable()
export class ConfigDatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConfigDatabaseService.name);
  private db!: Database.Database;
  private readonly dbPath: string;

  constructor() {
    this.dbPath = resolve(
      process.env.CONFIG_DB_PATH || 'data/stubrix-config.db',
    );
  }

  onModuleInit(): void {
    const dir = dirname(this.dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      this.logger.log(`Created directory: ${dir}`);
    }

    this.db = new Database(this.dbPath);

    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');

    const version = runMigrations(this.db);
    this.logger.log(
      `Config database ready at ${this.dbPath} (schema v${version})`,
    );
  }

  onModuleDestroy(): void {
    if (this.db?.open) {
      this.db.close();
      this.logger.log('Config database connection closed');
    }
  }

  // ─── Services table ────────────────────────────────────────────

  upsertService(service: Omit<ServiceRow, 'created_at' | 'updated_at'>): void {
    this.db
      .prepare(
        `INSERT INTO services (id, name, category, docker_profile, docker_service, default_port, external_url, enabled, auto_start, health_status, last_health_check)
       VALUES (@id, @name, @category, @docker_profile, @docker_service, @default_port, @external_url, @enabled, @auto_start, @health_status, @last_health_check)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         category = excluded.category,
         docker_profile = excluded.docker_profile,
         docker_service = excluded.docker_service,
         default_port = excluded.default_port,
         external_url = excluded.external_url,
         updated_at = datetime('now')`,
      )
      .run(service);
  }

  getService(id: string): ServiceRow | undefined {
    return this.db.prepare('SELECT * FROM services WHERE id = ?').get(id) as
      | ServiceRow
      | undefined;
  }

  getAllServices(): ServiceRow[] {
    return this.db
      .prepare('SELECT * FROM services ORDER BY category, name')
      .all() as ServiceRow[];
  }

  updateServiceStatus(id: string, enabled: boolean): void {
    this.db
      .prepare(
        "UPDATE services SET enabled = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .run(enabled ? 1 : 0, id);
  }

  updateAutoStart(id: string, autoStart: boolean): void {
    this.db
      .prepare(
        "UPDATE services SET auto_start = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .run(autoStart ? 1 : 0, id);
  }

  getAutoStartServices(): ServiceRow[] {
    return this.db
      .prepare(
        'SELECT * FROM services WHERE enabled = 1 AND auto_start = 1 ORDER BY category, name',
      )
      .all() as ServiceRow[];
  }

  getEnabledNoAutoStartServices(): ServiceRow[] {
    return this.db
      .prepare(
        'SELECT * FROM services WHERE enabled = 1 AND auto_start = 0 ORDER BY category, name',
      )
      .all() as ServiceRow[];
  }

  updateHealthStatus(id: string, status: HealthStatus): void {
    this.db
      .prepare(
        "UPDATE services SET health_status = ?, last_health_check = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      )
      .run(status, id);
  }

  // ─── Config table ──────────────────────────────────────────────

  getConfig(serviceId: string, key: string): ConfigRow | undefined {
    return this.db
      .prepare('SELECT * FROM service_configs WHERE service_id = ? AND key = ?')
      .get(serviceId, key) as ConfigRow | undefined;
  }

  getServiceConfigs(serviceId: string): ConfigRow[] {
    return this.db
      .prepare('SELECT * FROM service_configs WHERE service_id = ?')
      .all(serviceId) as ConfigRow[];
  }

  setConfig(
    serviceId: string,
    key: string,
    value: string,
    meta: {
      is_sensitive?: number;
      description?: string;
      data_type?: string;
      checksum?: string;
    },
  ): void {
    this.db
      .prepare(
        `INSERT INTO service_configs (service_id, key, value, is_sensitive, description, data_type, checksum)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(service_id, key) DO UPDATE SET
         value = excluded.value,
         is_sensitive = excluded.is_sensitive,
         description = excluded.description,
         data_type = excluded.data_type,
         checksum = excluded.checksum,
         updated_at = datetime('now')`,
      )
      .run(
        serviceId,
        key,
        value,
        meta.is_sensitive ?? 0,
        meta.description ?? null,
        meta.data_type ?? 'string',
        meta.checksum ?? null,
      );
  }

  deleteConfig(serviceId: string, key: string): void {
    this.db
      .prepare('DELETE FROM service_configs WHERE service_id = ? AND key = ?')
      .run(serviceId, key);
  }

  bulkSetConfigs(serviceId: string, configs: ConfigRow[]): void {
    const insert = this.db.prepare(
      `INSERT INTO service_configs (service_id, key, value, is_sensitive, description, data_type, checksum)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(service_id, key) DO UPDATE SET
         value = excluded.value,
         is_sensitive = excluded.is_sensitive,
         description = excluded.description,
         data_type = excluded.data_type,
         checksum = excluded.checksum,
         updated_at = datetime('now')`,
    );

    const bulkInsert = this.db.transaction((rows: ConfigRow[]) => {
      for (const row of rows) {
        insert.run(
          serviceId,
          row.key,
          row.value,
          row.is_sensitive ?? 0,
          row.description ?? null,
          row.data_type ?? 'string',
          row.checksum ?? null,
        );
      }
    });

    bulkInsert(configs);
  }

  // ─── History table ─────────────────────────────────────────────

  addHistory(entry: HistoryEntry): void {
    this.db
      .prepare(
        `INSERT INTO config_history (service_id, key, old_value, new_value, action, source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.service_id,
        entry.key,
        entry.old_value ?? null,
        entry.new_value ?? null,
        entry.action,
        entry.source ?? 'manual',
      );
  }

  getHistory(serviceId: string, limit = 50): HistoryEntry[] {
    return this.db
      .prepare(
        'SELECT * FROM config_history WHERE service_id = ? ORDER BY created_at DESC LIMIT ?',
      )
      .all(serviceId, limit) as HistoryEntry[];
  }

  getFullHistory(limit = 100, offset = 0): HistoryEntry[] {
    return this.db
      .prepare(
        'SELECT * FROM config_history ORDER BY created_at DESC LIMIT ? OFFSET ?',
      )
      .all(limit, offset) as HistoryEntry[];
  }

  // ─── Backup metadata table ────────────────────────────────────

  addBackup(backup: BackupRow): void {
    this.db
      .prepare(
        `INSERT INTO backups (id, name, description, scope, services_included, file_path, file_size, checksum, encrypted, format, version)
       VALUES (@id, @name, @description, @scope, @services_included, @file_path, @file_size, @checksum, @encrypted, @format, @version)`,
      )
      .run(backup);
  }

  getBackup(id: string): BackupRow | undefined {
    return this.db.prepare('SELECT * FROM backups WHERE id = ?').get(id) as
      | BackupRow
      | undefined;
  }

  getAllBackups(): BackupRow[] {
    return this.db
      .prepare('SELECT * FROM backups ORDER BY created_at DESC')
      .all() as BackupRow[];
  }

  deleteBackup(id: string): void {
    this.db.prepare('DELETE FROM backups WHERE id = ?').run(id);
  }

  // ─── Master key table ─────────────────────────────────────────

  getMasterKey(): MasterKeyRow | undefined {
    return this.db.prepare('SELECT * FROM master_key WHERE id = 1').get() as
      | MasterKeyRow
      | undefined;
  }

  setMasterKey(hash: string, salt: Buffer): void {
    this.db
      .prepare(
        'INSERT INTO master_key (id, password_hash, salt) VALUES (1, ?, ?)',
      )
      .run(hash, salt);
  }

  updateMasterKey(hash: string, salt: Buffer): void {
    this.db
      .prepare(
        "UPDATE master_key SET password_hash = ?, salt = ?, updated_at = datetime('now') WHERE id = 1",
      )
      .run(hash, salt);
  }

  // ─── Utility ───────────────────────────────────────────────────

  getSchemaVersion(): number {
    return getSchemaVersion(this.db);
  }

  vacuum(): void {
    this.db.exec('VACUUM');
    this.logger.log('Database vacuumed');
  }

  getDbStats(): DbStats {
    const tables = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all() as { name: string }[];

    let totalRows = 0;
    for (const table of tables) {
      const row = this.db
        .prepare(`SELECT COUNT(*) as count FROM "${table.name}"`)
        .get() as { count: number };
      totalRows += row.count;
    }

    let size = 0;
    try {
      size = statSync(this.dbPath).size;
    } catch {
      // File may not exist yet
    }

    return {
      size,
      tables: tables.length,
      totalRows,
    };
  }
}
