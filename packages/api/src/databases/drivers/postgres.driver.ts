import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Client } from 'pg';
import type {
  ConnectionOverrides,
  DatabaseDriverInterface,
} from './database-driver.interface';

const execFileAsync = promisify(execFile);

@Injectable()
export class PostgresDriver implements DatabaseDriverInterface {
  readonly engine = 'postgres';

  private readonly host: string;
  private readonly port: string;
  private readonly user: string;
  private readonly password: string;
  private readonly database: string;

  constructor(private readonly config: ConfigService) {
    this.host = this.config.get<string>('PG_HOST') ?? 'localhost';
    this.port = this.config.get<string>('PG_PORT') ?? '5432';
    this.user = this.config.get<string>('PG_USER') ?? 'postgres';
    this.password = this.config.get<string>('PG_PASSWORD') ?? 'postgres';
    this.database = this.config.get<string>('PG_DATABASE') ?? 'postgres';
  }

  private getEnv(
    database?: string,
    overrides?: ConnectionOverrides,
  ): NodeJS.ProcessEnv {
    return {
      ...process.env,
      PGHOST: overrides?.host ?? this.host,
      PGPORT: overrides?.port ?? this.port,
      PGUSER: overrides?.username ?? this.user,
      PGPASSWORD: overrides?.password ?? this.password,
      PGDATABASE: database ?? this.database,
    };
  }

  isConfigured(): boolean {
    return Boolean(this.host);
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await execFileAsync('pg_isready', ['-h', this.host, '-p', this.port], {
        env: this.getEnv(),
      });
      return true;
    } catch {
      return false;
    }
  }

  async listDatabases(overrides?: ConnectionOverrides): Promise<string[]> {
    const host = overrides?.host ?? this.host;
    const port = overrides?.port ?? this.port;
    const user = overrides?.username ?? this.user;
    const { stdout } = await execFileAsync(
      'psql',
      [
        '-h',
        host,
        '-p',
        port,
        '-U',
        user,
        '-t',
        '-A',
        '-c',
        'SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;',
      ],
      { env: this.getEnv(undefined, overrides) },
    );
    return stdout.trim().split('\n').filter(Boolean);
  }

  async executeQuery(
    query: string,
    params?: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const client = new Client({
      host: this.host,
      port: Number(this.port),
      user: this.user,
      password: this.password,
      database: this.database,
    });
    await client.connect();
    try {
      const values = params ? Object.values(params) : [];
      const result = await client.query(query, values);
      return result.rows as Record<string, unknown>[];
    } finally {
      await client.end();
    }
  }

  async getDatabaseInfo(
    dbName: string,
    overrides?: ConnectionOverrides,
  ): Promise<{
    database: string;
    totalSize: string;
    tables: Array<{ name: string; size: string }>;
  }> {
    const host = overrides?.host ?? this.host;
    const port = overrides?.port ?? this.port;
    const user = overrides?.username ?? this.user;
    const env = this.getEnv(dbName, overrides);
    const psqlArgs = ['-h', host, '-p', port, '-U', user, '-t', '-A'];

    const { stdout: tablesOutput } = await execFileAsync(
      'psql',
      [
        ...psqlArgs,
        '-c',
        "SELECT schemaname || '.' || tablename AS table_name, pg_size_pretty(pg_total_relation_size((quote_ident(schemaname) || '.' || quote_ident(tablename))::regclass)) AS size FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY pg_total_relation_size((quote_ident(schemaname) || '.' || quote_ident(tablename))::regclass) DESC LIMIT 20;",
      ],
      { env },
    );
    const { stdout: sizeOutput } = await execFileAsync(
      'psql',
      [
        ...psqlArgs,
        '-c',
        'SELECT pg_size_pretty(pg_database_size(current_database()));',
      ],
      { env },
    );

    return {
      database: dbName,
      totalSize: sizeOutput.trim(),
      tables: tablesOutput
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line: string) => {
          const [name = '', size = ''] = line.split('|');
          return { name, size };
        }),
    };
  }
}
