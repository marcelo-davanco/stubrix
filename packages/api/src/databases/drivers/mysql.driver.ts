import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as mysql from 'mysql2/promise';
import type {
  ConnectionOverrides,
  DatabaseDriverInterface,
} from './database-driver.interface';

@Injectable()
export class MysqlDriver implements DatabaseDriverInterface {
  readonly engine = 'mysql';
  private readonly logger = new Logger(MysqlDriver.name);

  private readonly host: string | undefined;
  private readonly port: string;
  private readonly user: string;
  private readonly password: string;
  private readonly database: string;

  constructor(private readonly config: ConfigService) {
    this.host = this.config.get<string>('MYSQL_HOST');
    this.port = this.config.get<string>('MYSQL_PORT') ?? '3306';
    this.user = this.config.get<string>('MYSQL_USER') ?? 'stubrix';
    this.password = this.config.get<string>('MYSQL_PASSWORD') ?? 'stubrix';
    this.database = this.config.get<string>('MYSQL_DATABASE') ?? 'stubrix';
  }

  private async getConnection(
    database?: string,
    overrides?: ConnectionOverrides,
  ): Promise<mysql.Connection> {
    return mysql.createConnection({
      host: overrides?.host ?? this.host,
      port: Number(overrides?.port ?? this.port),
      user: overrides?.username ?? this.user,
      password: overrides?.password ?? this.password,
      database: database ?? this.database,
    });
  }

  isConfigured(): boolean {
    return Boolean(this.host);
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const conn = await this.getConnection();
      await conn.query('SELECT 1');
      await conn.end();
      return true;
    } catch {
      return false;
    }
  }

  async listDatabases(overrides?: ConnectionOverrides): Promise<string[]> {
    const conn = await this.getConnection(undefined, overrides);
    const [rows] = await conn.query('SHOW DATABASES');
    await conn.end();
    return (rows as Array<{ Database: string }>).map((row) => row.Database);
  }

  async getDatabaseInfo(dbName: string, overrides?: ConnectionOverrides) {
    const conn = await this.getConnection('information_schema', overrides);
    const [sizeRows] = await conn.query(
      `SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb FROM tables WHERE table_schema = ?`,
      [dbName],
    );
    const [tableRows] = await conn.query(
      `SELECT table_name AS name, ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb FROM tables WHERE table_schema = ? ORDER BY (data_length + index_length) DESC LIMIT 20`,
      [dbName],
    );
    await conn.end();

    const sizeMb = (sizeRows as Array<{ size_mb: number }>)[0]?.size_mb ?? 0;

    return {
      database: dbName,
      totalSize: `${sizeMb} MB`,
      tables: (tableRows as Array<{ name: string; size_mb: number }>).map(
        (row) => ({
          name: row.name,
          size: `${row.size_mb ?? 0} MB`,
        }),
      ),
    };
  }

  async executeQuery(
    query: string,
    params?: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const conn = await this.getConnection();
    try {
      const values = params ? Object.values(params) : [];
      const [rows] = await conn.query(query, values);
      return rows as Record<string, unknown>[];
    } finally {
      await conn.end();
    }
  }

  async createSnapshot(
    database: string,
    filepath: string,
    overrides?: ConnectionOverrides,
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('MySQL driver is not configured');
    }

    try {
      // Build mysqldump command
      const args = [
        '--single-transaction',
        '--routines',
        '--triggers',
        '--databases',
        database,
        '--result-file=' + filepath,
      ];

      // Add connection parameters
      if (overrides?.host ?? this.host) {
        args.push(`--host=${overrides?.host ?? this.host}`);
      }
      if (overrides?.port ?? this.port) {
        args.push(`--port=${overrides?.port ?? this.port}`);
      }
      if (overrides?.username ?? this.user) {
        args.push(`--user=${overrides?.username ?? this.user}`);
      }
      
      // Execute mysqldump
      this.logger.log(`Creating MySQL snapshot: ${database} -> ${filepath}`);
      execFileSync('mysqldump', args, {
        env: {
          ...process.env,
          MYSQL_PWD: overrides?.password ?? this.password,
        },
        stdio: 'pipe',
      });

      this.logger.log(`MySQL snapshot created successfully: ${filepath}`);
    } catch (error) {
      this.logger.error(`Failed to create MySQL snapshot: ${error.message}`);
      throw new Error(`MySQL snapshot failed: ${error.message}`);
    }
  }

  async restoreSnapshot(
    database: string,
    filepath: string,
    overrides?: ConnectionOverrides,
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('MySQL driver is not configured');
    }

    try {
      // Build mysql command
      const args = [database];

      // Add connection parameters
      if (overrides?.host ?? this.host) {
        args.push(`--host=${overrides?.host ?? this.host}`);
      }
      if (overrides?.port ?? this.port) {
        args.push(`--port=${overrides?.port ?? this.port}`);
      }
      if (overrides?.username ?? this.user) {
        args.push(`--user=${overrides?.username ?? this.user}`);
      }

      this.logger.log(`Restoring MySQL snapshot: ${filepath} -> ${database}`);
      execFileSync('mysql', args, {
        input: fs.readFileSync(filepath, 'utf8'),
        env: {
          ...process.env,
          MYSQL_PWD: overrides?.password ?? this.password,
        },
        stdio: 'pipe',
      });

      this.logger.log(`MySQL snapshot restored successfully: ${filepath}`);
    } catch (error) {
      this.logger.error(`Failed to restore MySQL snapshot: ${error.message}`);
      throw new Error(`MySQL restore failed: ${error.message}`);
    }
  }
}
