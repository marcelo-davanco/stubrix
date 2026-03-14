import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFileSync } from 'child_process';
import { MongoClient } from 'mongodb';
import type {
  ConnectionOverrides,
  DatabaseDriverInterface,
} from './database-driver.interface';

@Injectable()
export class MongodbDriver implements DatabaseDriverInterface {
  readonly engine = 'mongodb';
  private readonly logger = new Logger(MongodbDriver.name);

  private readonly host: string | undefined;
  private readonly port: string;
  private readonly user: string;
  private readonly password: string;
  private readonly database: string;

  constructor(private readonly config: ConfigService) {
    this.host = this.config.get<string>('MONGO_HOST');
    this.port = this.config.get<string>('MONGO_PORT') ?? '27017';
    this.user = this.config.get<string>('MONGO_USER') ?? 'stubrix';
    this.password = this.config.get<string>('MONGO_PASSWORD') ?? 'stubrix';
    this.database = this.config.get<string>('MONGO_DATABASE') ?? 'stubrix';
  }

  /**
   * Constrói a URI de conexão MongoDB.
   * Formato: mongodb://user:pass@host:port/database?authSource=admin
   */
  private buildUri(database?: string, overrides?: ConnectionOverrides): string {
    const h = overrides?.host ?? this.host;
    const p = overrides?.port ?? this.port;
    const u = encodeURIComponent(overrides?.username ?? this.user);
    const pw = encodeURIComponent(overrides?.password ?? this.password);
    const db = database ?? this.database;
    return `mongodb://${u}:${pw}@${h}:${p}/${db}?authSource=admin`;
  }

  isConfigured(): boolean {
    return Boolean(this.host);
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    const client = new MongoClient(this.buildUri());
    try {
      await client.connect();
      await client.db().admin().ping();
      return true;
    } catch {
      return false;
    } finally {
      await client.close();
    }
  }

  async listDatabases(overrides?: ConnectionOverrides): Promise<string[]> {
    const client = new MongoClient(this.buildUri(undefined, overrides));
    try {
      await client.connect();
      const result = await client.db().admin().listDatabases();
      return result.databases
        .map((db) => db.name)
        .filter((name) => !['admin', 'config', 'local'].includes(name));
    } finally {
      await client.close();
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
    const client = new MongoClient(this.buildUri(dbName, overrides));
    try {
      await client.connect();
      const db = client.db(dbName);
      const stats = await db.stats();
      const collections = await db.listCollections().toArray();

      const tables: Array<{ name: string; size: string }> = [];
      for (const col of collections) {
        try {
          const colStats = await db.collection(col.name).stats();
          const sizeMb = (colStats.size / (1024 * 1024)).toFixed(2);
          tables.push({ name: col.name, size: `${sizeMb} MB` });
        } catch {
          tables.push({ name: col.name, size: 'n/a' });
        }
      }

      const totalSizeMb = (stats.dataSize / (1024 * 1024)).toFixed(2);
      return {
        database: dbName,
        totalSize: `${totalSizeMb} MB`,
        tables,
      };
    } finally {
      await client.close();
    }
  }

  async executeQuery(
    query: string,
    params?: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const client = new MongoClient(this.buildUri());
    try {
      await client.connect();
      const db = client.db(this.database);

      // Tenta parsear como JSON (find query simplificado)
      // Formato esperado: { "collection": "USERS", "filter": { "name": "Alice" } }
      const parsed = JSON.parse(query) as {
        collection: string;
        filter?: Record<string, unknown>;
      };
      const collection = db.collection(parsed.collection);
      const filter = parsed.filter ?? params ?? {};
      const result = await collection.find(filter).limit(100).toArray();
      return result as Record<string, unknown>[];
    } finally {
      await client.close();
    }
  }

  /**
   * Cria um snapshot usando mongodump --archive --gzip
   *
   * O comando gera um ÚNICO arquivo binário compactado,
   * encaixando perfeitamente na estrutura dumps/mongodb/.
   */
  async createSnapshot(
    database: string,
    filepath: string,
    overrides?: ConnectionOverrides,
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('MongoDB driver is not configured');
    }

    try {
      const uri = this.buildUri(database, overrides);
      const args = [`--uri=${uri}`, `--archive=${filepath}`, '--gzip'];

      this.logger.log(`Creating MongoDB snapshot: ${database} -> ${filepath}`);
      execFileSync('mongodump', args, { stdio: 'pipe' });
      this.logger.log(`MongoDB snapshot created successfully: ${filepath}`);
    } catch (error) {
      this.logger.error(`Failed to create MongoDB snapshot: ${error.message}`);
      throw new Error(`MongoDB snapshot failed: ${error.message}`);
    }
  }

  /**
   * Restaura um snapshot usando mongorestore --archive --gzip --drop
   *
   * A flag --drop é OBRIGATÓRIA (Harness Engineering).
   * Garante que antes de restaurar o BSON, o MongoDB apague
   * as coleções existentes, evitando dados duplicados.
   */
  async restoreSnapshot(
    database: string,
    filepath: string,
    overrides?: ConnectionOverrides,
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('MongoDB driver is not configured');
    }

    try {
      const uri = this.buildUri(database, overrides);
      const args = [
        `--uri=${uri}`,
        `--archive=${filepath}`,
        '--gzip',
        '--drop',
      ];

      this.logger.log(`Restoring MongoDB snapshot: ${filepath} -> ${database}`);
      execFileSync('mongorestore', args, { stdio: 'pipe' });
      this.logger.log(`MongoDB snapshot restored successfully: ${filepath}`);
    } catch (error) {
      this.logger.error(`Failed to restore MongoDB snapshot: ${error.message}`);
      throw new Error(`MongoDB restore failed: ${error.message}`);
    }
  }
}
