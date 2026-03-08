import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';
import type {
  ConnectionOverrides,
  DatabaseDriverInterface,
} from './database-driver.interface';

@Injectable()
export class MysqlDriver implements DatabaseDriverInterface {
  readonly engine = 'mysql';

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
}
