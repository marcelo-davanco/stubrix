import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface StorageObject {
  key: string;
  size: number;
  lastModified: string;
  bucket: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly minioUrl: string;
  private readonly minioUser: string;
  private readonly minioPass: string;
  private readonly defaultBucket: string;

  constructor(private readonly config: ConfigService) {
    this.minioUrl =
      this.config.get<string>('MINIO_URL') ?? 'http://localhost:9000';
    this.minioUser = this.config.get<string>('MINIO_ROOT_USER') ?? 'minioadmin';
    this.minioPass =
      this.config.get<string>('MINIO_ROOT_PASSWORD') ?? 'minioadmin';
    this.defaultBucket = this.config.get<string>('MINIO_BUCKET') ?? 'stubrix';
  }

  async health(): Promise<{ available: boolean; url: string }> {
    try {
      const res = await fetch(`${this.minioUrl}/minio/health/live`, {
        signal: AbortSignal.timeout(3_000),
      });
      return { available: res.ok, url: this.minioUrl };
    } catch {
      return { available: false, url: this.minioUrl };
    }
  }

  async uploadFile(
    bucket: string,
    key: string,
    content: Buffer | string,
    contentType = 'application/octet-stream',
  ): Promise<{ bucket: string; key: string; url: string }> {
    const buf = typeof content === 'string' ? Buffer.from(content) : content;
    const body = new Uint8Array(buf);
    const auth = Buffer.from(`${this.minioUser}:${this.minioPass}`).toString(
      'base64',
    );

    const res = await fetch(
      `${this.minioUrl}/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(body.length),
          Authorization: `Basic ${auth}`,
        },
        body,
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!res.ok) throw new Error(`MinIO upload failed: HTTP ${res.status}`);
    this.logger.log(`Uploaded to MinIO: ${bucket}/${key}`);
    return { bucket, key, url: `${this.minioUrl}/${bucket}/${key}` };
  }

  async archiveSnapshot(
    snapshotPath: string,
    projectId: string,
  ): Promise<StorageObject> {
    const resolvedPath = path.resolve(snapshotPath);
    const dumpsBase = path.resolve(
      process.env['DUMPS_DIR'] ?? path.join(process.cwd(), 'dumps'),
    );
    if (
      resolvedPath !== dumpsBase &&
      !resolvedPath.startsWith(dumpsBase + path.sep)
    ) {
      throw new Error(`Snapshot path is outside the allowed directory`);
    }
    // Reconstruct from trusted base + basename to break taint chain
    const safeFilename = path.basename(resolvedPath);
    const safePath = path.join(
      dumpsBase,
      path.relative(dumpsBase, resolvedPath),
    );
    if (!fs.existsSync(safePath)) {
      throw new Error(`Snapshot not found: ${safeFilename}`);
    }
    const content = fs.readFileSync(safePath);
    const filename = safeFilename;
    const key = `snapshots/${projectId}/${filename}`;

    await this.uploadFile(
      this.defaultBucket,
      key,
      content,
      'application/octet-stream',
    );

    return {
      key,
      size: content.length,
      lastModified: new Date().toISOString(),
      bucket: this.defaultBucket,
    };
  }

  async uploadMockBody(
    filename: string,
    content: string,
  ): Promise<StorageObject> {
    const key = `mock-bodies/${filename}`;
    const buf = Buffer.from(content, 'utf-8');
    await this.uploadFile(this.defaultBucket, key, buf, 'application/json');
    return {
      key,
      size: buf.length,
      lastModified: new Date().toISOString(),
      bucket: this.defaultBucket,
    };
  }

  getPublicUrl(bucket: string, key: string): string {
    return `${this.minioUrl}/${bucket}/${key}`;
  }

  getConfig(): Record<string, unknown> {
    return {
      url: this.minioUrl,
      consolUrl: `${this.minioUrl.replace(':9000', ':9001')}`,
      defaultBucket: this.defaultBucket,
    };
  }
}
