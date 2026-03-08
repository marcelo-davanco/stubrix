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
}
