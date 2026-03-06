import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execSync } from 'child_process';
import type { DatabaseDriverInterface } from './database-driver.interface';

@Injectable()
export class PostgresDriver implements DatabaseDriverInterface {
  readonly engine = 'postgres';

  private readonly host: string | undefined;
  private readonly port: string;
  private readonly user: string;
  private readonly password: string;
  private readonly database: string;

  constructor(private readonly config: ConfigService) {
    this.host = this.config.get<string>('PG_HOST');
    this.port = this.config.get<string>('PG_PORT') ?? '5432';
    this.user = this.config.get<string>('PG_USER') ?? 'postgres';
    this.password = this.config.get<string>('PG_PASSWORD') ?? 'postgres';
    this.database = this.config.get<string>('PG_DATABASE') ?? 'postgres';
  }

  private getEnv(database?: string): NodeJS.ProcessEnv {
    return {
      ...process.env,
      PGHOST: this.host,
      PGPORT: this.port,
      PGUSER: this.user,
      PGPASSWORD: this.password,
      PGDATABASE: database ?? this.database,
    };
  }

  isConfigured(): boolean {
    return Boolean(this.host);
  }

  healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return Promise.resolve(false);
    try {
      execSync('pg_isready', { env: this.getEnv(), stdio: 'ignore' });
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }

  listDatabases(): Promise<string[]> {
    const output = execSync(
      `psql -t -A -c "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;"`,
      { env: this.getEnv(), encoding: 'utf-8' },
    );
    return Promise.resolve(output.trim().split('\n').filter(Boolean));
  }

  getDatabaseInfo(dbName: string): Promise<{
    database: string;
    totalSize: string;
    tables: Array<{ name: string; size: string }>;
  }> {
    const env = this.getEnv(dbName);
    const tablesOutput = execSync(
      `psql -t -A -c "SELECT schemaname || '.' || tablename AS table_name, pg_size_pretty(pg_total_relation_size((quote_ident(schemaname) || '.' || quote_ident(tablename))::regclass)) AS size FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY pg_total_relation_size((quote_ident(schemaname) || '.' || quote_ident(tablename))::regclass) DESC LIMIT 20;"`,
      { env, encoding: 'utf-8' },
    );
    const sizeOutput = execSync(
      `psql -t -A -c "SELECT pg_size_pretty(pg_database_size(current_database()));"`,
      { env, encoding: 'utf-8' },
    );

    return Promise.resolve({
      database: dbName,
      totalSize: sizeOutput.trim(),
      tables: tablesOutput
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line: string) => {
          const [name, size] = line.split('|');
          return { name, size };
        }),
    });
  }
}
