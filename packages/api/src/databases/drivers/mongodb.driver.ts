import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile, execFileSync, spawn } from 'child_process';
import * as fs from 'fs';
import { promisify } from 'util';
import { MongoClient } from 'mongodb';
import type {
  ConnectionOverrides,
  DatabaseDriverInterface,
} from './database-driver.interface';

const execFileAsync = promisify(execFile);

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
  private _mongoToolsAvailable: boolean | null = null;

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
   * Builds the MongoDB connection URI.
   * Format: mongodb://user:pass@host:port/database?authSource=admin
   */
  protected buildUri(
    database?: string,
    overrides?: ConnectionOverrides,
  ): string {
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
    if (!this.isConfigured()) {
      throw new Error('MongoDB driver is not configured');
    }
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
    if (!this.isConfigured()) {
      throw new Error('MongoDB driver is not configured');
    }
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
    if (!this.isConfigured()) {
      throw new Error('MongoDB driver is not configured');
    }
    const client = new MongoClient(this.buildUri());
    try {
      await client.connect();
      const db = client.db(this.database);

      // Parses a simplified find query in JSON format.
      // Expected format: { "collection": "USERS", "filter": { "name": "Alice" } }
      const raw: unknown = JSON.parse(query);
      if (
        !raw ||
        typeof raw !== 'object' ||
        !('collection' in raw) ||
        typeof (raw as Record<string, unknown>)['collection'] !== 'string'
      ) {
        throw new Error('Query must be JSON with a "collection" string field');
      }
      const parsed = raw as {
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
   * Checks if mongodump and mongorestore are available locally in PATH.
   * Result is cached after the first call to avoid blocking the event loop on every snapshot.
   */
  private hasMongoToolsLocal(): boolean {
    if (this._mongoToolsAvailable === null) {
      try {
        execFileSync('mongodump', ['--version'], { stdio: 'pipe' });
        execFileSync('mongorestore', ['--version'], { stdio: 'pipe' });
        this._mongoToolsAvailable = true;
      } catch {
        this._mongoToolsAvailable = false;
      }
    }
    return this._mongoToolsAvailable;
  }

  /**
   * Creates a snapshot using mongodump --archive --gzip.
   * Produces a single compressed binary file in dumps/mongodb/.
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
      this.logger.log(`Creating MongoDB snapshot: ${database} -> ${filepath}`);

      if (this.hasMongoToolsLocal()) {
        const uri = this.buildUri(database, overrides);
        await execFileAsync(
          'mongodump',
          [`--uri=${uri}`, `--archive=${filepath}`, '--gzip'],
          { maxBuffer: 512 * 1024 * 1024 },
        );
      } else {
        // Run mongodump inside the MongoDB container via docker exec.
        // mongodump connects to localhost within the container.
        const containerUri = this.buildUri(database, {
          ...overrides,
          host: 'localhost',
        });
        await this.dockerExecMongodump(containerUri, filepath);
      }
      this.logger.log(`MongoDB snapshot created successfully: ${filepath}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create MongoDB snapshot: ${msg}`);
      throw new Error(`MongoDB snapshot failed: ${msg}`);
    }
  }

  /**
   * Restores a snapshot using mongorestore --archive --gzip --drop.
   * The --drop flag is REQUIRED to drop existing collections before restoring.
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
      this.logger.log(`Restoring MongoDB snapshot: ${filepath} -> ${database}`);

      if (this.hasMongoToolsLocal()) {
        const uri = this.buildUri(database, overrides);
        await execFileAsync(
          'mongorestore',
          [`--uri=${uri}`, `--archive=${filepath}`, '--gzip', '--drop'],
          { maxBuffer: 512 * 1024 * 1024 },
        );
      } else {
        if (!fs.existsSync(filepath)) {
          throw new Error(`Snapshot file not found: ${filepath}`);
        }
        // Run mongorestore inside the MongoDB container via docker exec.
        // mongorestore connects to localhost within the container.
        const containerUri = this.buildUri(database, {
          ...overrides,
          host: 'localhost',
        });
        await this.dockerExecMongorestore(containerUri, filepath);
      }
      this.logger.log(`MongoDB snapshot restored successfully: ${filepath}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to restore MongoDB snapshot: ${msg}`);
      throw new Error(`MongoDB restore failed: ${msg}`);
    }
  }

  private dockerExecMongodump(uri: string, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('docker', [
        'exec',
        '-i',
        this.containerName,
        'mongodump',
        `--uri=${uri}`,
        '--archive',
        '--gzip',
      ]);

      const writeStream = fs.createWriteStream(filepath);
      child.stdout.pipe(writeStream);

      const stderrChunks: Buffer[] = [];
      child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

      let settled = false;
      let exitCode: number | null = null;
      let childClosed = false;
      let streamFinished = false;

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      const maybeComplete = () => {
        if (!childClosed || !streamFinished || settled) return;
        settled = true;
        if (exitCode !== 0) {
          const errMsg = Buffer.concat(stderrChunks).toString('utf8');
          reject(new Error(errMsg || 'mongodump via docker exec failed'));
          return;
        }
        resolve();
      };

      writeStream.on('error', fail);
      child.on('error', fail);

      child.on('close', (code) => {
        childClosed = true;
        exitCode = code;
        maybeComplete();
      });

      writeStream.on('finish', () => {
        streamFinished = true;
        maybeComplete();
      });
    });
  }

  private dockerExecMongorestore(uri: string, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('docker', [
        'exec',
        '-i',
        this.containerName,
        'mongorestore',
        `--uri=${uri}`,
        '--archive',
        '--gzip',
        '--drop',
      ]);

      const readStream = fs.createReadStream(filepath);
      readStream.pipe(child.stdin);

      const stderrChunks: Buffer[] = [];
      child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

      let settled = false;

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      readStream.on('error', fail);
      child.stdin.on('error', fail);
      child.on('error', fail);

      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        if (code !== 0) {
          const errMsg = Buffer.concat(stderrChunks).toString('utf8');
          reject(new Error(errMsg || 'mongorestore via docker exec failed'));
          return;
        }
        resolve();
      });
    });
  }
}
