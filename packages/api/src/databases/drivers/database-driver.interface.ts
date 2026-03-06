export interface DatabaseDriverInterface {
  readonly engine: string;
  isConfigured(): boolean;
  healthCheck(): Promise<boolean>;
  listDatabases(): Promise<Array<string>>;
  getDatabaseInfo(dbName: string): Promise<{
    database: string;
    totalSize: string;
    tables: Array<{ name: string; size: string }>;
  }>;
}
