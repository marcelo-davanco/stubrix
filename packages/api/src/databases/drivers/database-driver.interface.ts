export type ConnectionOverrides = {
  host?: string | null;
  port?: string | null;
  username?: string | null;
  password?: string | null;
};

export interface DatabaseDriverInterface {
  readonly engine: string;
  isConfigured(): boolean;
  healthCheck(): Promise<boolean>;
  listDatabases(overrides?: ConnectionOverrides): Promise<Array<string>>;
  getDatabaseInfo(
    dbName: string,
    overrides?: ConnectionOverrides,
  ): Promise<{
    database: string;
    totalSize: string;
    tables: Array<{ name: string; size: string }>;
  }>;
  createSnapshot?(
    database: string,
    filepath: string,
    overrides?: ConnectionOverrides,
  ): Promise<void>;
  restoreSnapshot?(
    database: string,
    filepath: string,
    overrides?: ConnectionOverrides,
  ): Promise<void>;
  executeQuery?(
    query: string,
    params?: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]>;
}
