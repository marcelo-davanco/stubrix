import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import type { DatabaseDriverInterface } from './database-driver.interface';

interface SqliteTableRow {
  name: string;
}

@Injectable()
export class SqliteDriver implements DatabaseDriverInterface {
  readonly engine = 'sqlite';
  private readonly logger = new Logger(SqliteDriver.name);

  private readonly dbPath: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.dbPath = this.config.get<string>('SQLITE_DB_PATH');
  }

  isConfigured(): boolean {
    return Boolean(this.dbPath);
  }

  healthCheck(): Promise<boolean> {
    return Promise.resolve(this.isConfigured() && fs.existsSync(this.dbPath!));
  }

  async listDatabases(): Promise<string[]> {
    if (!(await this.healthCheck())) return [];
    return [path.basename(this.dbPath!)];
  }

  getDatabaseInfo(): Promise<{
    database: string;
    totalSize: string;
    tables: Array<{ name: string; size: string }>;
  }> {
    const db = new Database(this.dbPath, { readonly: true });
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as SqliteTableRow[];
    db.close();

    const stats = fs.statSync(this.dbPath!);

    return Promise.resolve({
      database: path.basename(this.dbPath!),
      totalSize: `${Math.round(stats.size / 1024)} KB`,
      tables: tables.map((row) => ({ name: row.name, size: 'n/a' })),
    });
  }

  executeQuery(
    query: string,
    params?: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    if (!this.isConfigured()) {
      throw new BadRequestException('SQLite driver is not configured');
    }
    const db = new Database(this.dbPath, { readonly: true });
    try {
      const values = params ? Object.values(params) : [];
      const rows = db.prepare(query).all(...values) as Record<
        string,
        unknown
      >[];
      return Promise.resolve(rows);
    } finally {
      db.close();
    }
  }

  async createSnapshot(database: string, filepath: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('SQLite driver is not configured');
    }

    try {
      const sourcePath = this.dbPath!;

      // Check if source database exists
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source database file not found: ${sourcePath}`);
      }

      this.logger.log(`Creating SQLite snapshot: ${sourcePath} -> ${filepath}`);

      // Copy the database file
      fs.copyFileSync(sourcePath, filepath);

      // Also copy WAL and SHM files if they exist
      const walPath = `${sourcePath}-wal`;
      const shmPath = `${sourcePath}-shm`;
      const walDest = `${filepath}-wal`;
      const shmDest = `${filepath}-shm`;

      if (fs.existsSync(walPath)) {
        fs.copyFileSync(walPath, walDest);
      }
      if (fs.existsSync(shmPath)) {
        fs.copyFileSync(shmPath, shmDest);
      }

      this.logger.log(`SQLite snapshot created successfully: ${filepath}`);
    } catch (error) {
      this.logger.error(`Failed to create SQLite snapshot: ${error.message}`);
      throw new Error(`SQLite snapshot failed: ${error.message}`);
    }
  }

  async restoreSnapshot(database: string, filepath: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('SQLite driver is not configured');
    }

    try {
      const targetPath = this.dbPath!;

      // Check if snapshot file exists
      if (!fs.existsSync(filepath)) {
        throw new Error(`Snapshot file not found: ${filepath}`);
      }

      this.logger.log(
        `Restoring SQLite snapshot: ${filepath} -> ${targetPath}`,
      );

      // Close any existing connections by attempting to open in read-only mode first
      try {
        const testDb = new Database(targetPath, { readonly: true });
        testDb.close();
      } catch {
        // Database might be locked, continue anyway
      }

      // Copy the database file
      fs.copyFileSync(filepath, targetPath);

      // Also restore WAL and SHM files if they exist
      const walPath = `${filepath}-wal`;
      const shmPath = `${filepath}-shm`;
      const walDest = `${targetPath}-wal`;
      const shmDest = `${targetPath}-shm`;

      if (fs.existsSync(walPath)) {
        fs.copyFileSync(walPath, walDest);
      } else if (fs.existsSync(walDest)) {
        // Remove existing WAL if snapshot doesn't have one
        fs.unlinkSync(walDest);
      }

      if (fs.existsSync(shmPath)) {
        fs.copyFileSync(shmPath, shmDest);
      } else if (fs.existsSync(shmDest)) {
        // Remove existing SHM if snapshot doesn't have one
        fs.unlinkSync(shmDest);
      }

      this.logger.log(`SQLite snapshot restored successfully: ${filepath}`);
    } catch (error) {
      this.logger.error(`Failed to restore SQLite snapshot: ${error.message}`);
      throw new Error(`SQLite restore failed: ${error.message}`);
    }
  }
}
