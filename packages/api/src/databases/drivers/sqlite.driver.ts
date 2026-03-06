import { Injectable } from '@nestjs/common';
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
}
