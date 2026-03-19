import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
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
  private readonly containerName: string;

  constructor(private readonly config: ConfigService) {
    this.host = this.config.get<string>('MONGO_HOST');
    this.port = this.config.get<string>('MONGO_PORT') ?? '27017';
    this.user = this.config.get<string>('MONGO_USER') ?? 'stubrix';
    this.password = this.config.get<string>('MONGO_PASSWORD') ?? 'stubrix';
    this.database = this.config.get<string>('MONGO_DATABASE') ?? 'stubrix';
    this.containerName =
      this.config.get<string>('MONGO_CONTAINER') ?? 'stubrix-mongodb';
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
    const db = encodeURIComponent(database ?? this.database);
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
          const colStats = await db.command({ collStats: col.name });
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
   * Verifica se mongodump está disponível localmente no PATH.
   */
  private hasMongodumpLocal(): boolean {
    try {
      execFileSync('mongodump', ['--version'], { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cria um snapshot usando mongodump --archive --gzip
   *
   * O comando gera um ÚNICO arquivo binário compactado,
   * encaixando perfeitamente na estrutura dumps/mongodb/.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
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
      this.logger.log(`Creating MongoDB snapshot: ${database} -> ${filepath}`);

      if (this.hasMongodumpLocal()) {
        execFileSync(
          'mongodump',
          [`--uri=${uri}`, `--archive=${filepath}`, '--gzip'],
          { stdio: 'pipe', maxBuffer: 512 * 1024 * 1024 },
        );
      } else {
        // Use --add-host to make host.docker.internal work on all platforms (Linux/Windows/macOS)
        const dockerUri = uri.replace(
          /localhost|127\.0\.0\.1/g,
          'host.docker.internal',
        );
        const result = spawnSync(
          'docker',
          [
            'exec',
            '-i',
            '--add-host=host.docker.internal:host-gateway',
            this.containerName,
            'mongodump',
            `--uri=${dockerUri}`,
            '--archive',
            '--gzip',
          ],
          { encoding: 'buffer', maxBuffer: 512 * 1024 * 1024 },
        );
        if (result.error) throw result.error;
        if (result.status !== 0) {
          throw new Error(
            result.stderr?.toString('utf8') ??
              'mongodump via docker exec failed',
          );
        }
        if (!result.stdout || result.stdout.length === 0) {
          this.logger.warn(
            'mongodump produced no output (empty database?) — creating empty snapshot file',
          );
        }
        fs.writeFileSync(filepath, result.stdout);
      }
      this.logger.log(`MongoDB snapshot created successfully: ${filepath}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create MongoDB snapshot: ${msg}`);
      throw new Error(`MongoDB snapshot failed: ${msg}`);
    }
  }

  /**
   * Restaura um snapshot usando mongorestore --archive --gzip --drop
   *
   * A flag --drop é OBRIGATÓRIA.
   * Garante que as coleções existentes sejam apagadas antes da restauração.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
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
      this.logger.log(`Restoring MongoDB snapshot: ${filepath} -> ${database}`);

      if (this.hasMongodumpLocal()) {
        execFileSync(
          'mongorestore',
          [`--uri=${uri}`, `--archive=${filepath}`, '--gzip', '--drop'],
          { stdio: 'pipe', maxBuffer: 512 * 1024 * 1024 },
        );
      } else {
        // Use --add-host to make host.docker.internal work on all platforms (Linux/Windows/macOS)
        const dockerUri = uri.replace(
          /localhost|127\.0\.0\.1/g,
          'host.docker.internal',
        );
        if (!fs.existsSync(filepath)) {
          throw new Error(`Snapshot file not found: ${filepath}`);
        }
        const fileData = fs.readFileSync(filepath);
        const result = spawnSync(
          'docker',
          [
            'exec',
            '-i',
            '--add-host=host.docker.internal:host-gateway',
            this.containerName,
            'mongorestore',
            `--uri=${dockerUri}`,
            '--archive',
            '--gzip',
            '--drop',
          ],
          { input: fileData, encoding: 'buffer', maxBuffer: 512 * 1024 * 1024 },
        );
        if (result.error) throw result.error;
        if (result.status !== 0) {
          throw new Error(
            result.stderr?.toString('utf8') ??
              'mongorestore via docker exec failed',
          );
        }
      }
      this.logger.log(`MongoDB snapshot restored successfully: ${filepath}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to restore MongoDB snapshot: ${msg}`);
      throw new Error(`MongoDB restore failed: ${msg}`);
    }
  }
}
