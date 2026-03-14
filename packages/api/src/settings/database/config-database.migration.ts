/**
 * F34.01 — Config Database Migration System
 *
 * Forward-only migrations applied automatically on module init.
 * Current version tracked in schema_version table.
 */

import type Database from 'better-sqlite3';
import { INITIAL_SCHEMA_SQL } from './config-database.schema';

export interface Migration {
  version: number;
  description: string;
  up: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    description:
      'Initial schema — services, configs, history, backups, master_key',
    up: INITIAL_SCHEMA_SQL,
  },
  {
    version: 2,
    description: 'Add auto_start column to services table',
    up: `ALTER TABLE services ADD COLUMN auto_start INTEGER NOT NULL DEFAULT 0;`,
  },
];

export function getSchemaVersion(db: Database.Database): number {
  const tableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'",
    )
    .get();

  if (!tableExists) {
    return 0;
  }

  const row = db
    .prepare('SELECT MAX(version) as version FROM schema_version')
    .get() as { version: number | null } | undefined;

  return row?.version ?? 0;
}

export function runMigrations(db: Database.Database): number {
  const currentVersion = getSchemaVersion(db);
  const pendingMigrations = migrations.filter(
    (m) => m.version > currentVersion,
  );

  if (pendingMigrations.length === 0) {
    return currentVersion;
  }

  const applyMigration = db.transaction((migration: Migration) => {
    db.exec(migration.up);
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(
      migration.version,
    );
  });

  for (const migration of pendingMigrations) {
    applyMigration(migration);
  }

  return getSchemaVersion(db);
}
