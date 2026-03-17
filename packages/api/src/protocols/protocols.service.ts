import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type ProtocolType = 'graphql' | 'grpc' | 'rest';

export interface ProtocolMock {
  id: string;
  protocol: ProtocolType;
  name: string;
  schema?: string;
  resolvers?: Record<string, unknown>;
  protoFile?: string;
  grpcService?: string;
  endpoint?: string;
  createdAt: string;
}

export interface GraphQLSchemaSummary {
  types: string[];
  queries: string[];
  mutations: string[];
  subscriptions: string[];
}

export interface ProtoFileInfo {
  name: string;
  size: number;
  updatedAt: string;
}

export interface GrpcStub {
  id: string;
  service: string;
  method: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

@Injectable()
export class ProtocolsService {
  private readonly logger = new Logger(ProtocolsService.name);
  private readonly storageDir: string;
  private readonly protoDir: string;
  private readonly gripMockUrl: string;

  constructor(private readonly config: ConfigService) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ??
      path.join(process.cwd(), '../../mocks');
    this.storageDir = path.join(mocksDir, 'protocols');
    this.protoDir = path.join(mocksDir, 'proto');
    this.gripMockUrl =
      this.config.get<string>('GRIPMOCK_URL') ?? 'http://localhost:4771';
    fs.mkdirSync(this.storageDir, { recursive: true });
    fs.mkdirSync(this.protoDir, { recursive: true });
    fs.mkdirSync(path.join(this.protoDir, 'stubs'), { recursive: true });
  }

  listMocks(protocol?: ProtocolType): ProtocolMock[] {
    return fs
      .readdirSync(this.storageDir)
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) => {
        try {
          return [
            JSON.parse(
              fs.readFileSync(path.join(this.storageDir, f), 'utf-8'),
            ) as ProtocolMock,
          ];
        } catch {
          return [];
        }
      })
      .filter((m) => !protocol || m.protocol === protocol)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createMock(
    protocol: ProtocolType,
    name: string,
    options: {
      schema?: string;
      resolvers?: Record<string, unknown>;
      protoFile?: string;
      grpcService?: string;
      endpoint?: string;
    },
  ): ProtocolMock {
    const mock: ProtocolMock = {
      id: uuidv4(),
      protocol,
      name,
      ...options,
      createdAt: new Date().toISOString(),
    };
    const filename = path.basename(
      `${protocol}_${name.replace(/[^a-z0-9]/gi, '_')}_${mock.id}.json`,
    );
    fs.writeFileSync(
      path.join(this.storageDir, filename),
      JSON.stringify(mock, null, 2),
    );
    this.logger.log(`Protocol mock created: ${protocol}/${name}`);
    return mock;
  }

  deleteMock(id: string): void {
    const files = fs
      .readdirSync(this.storageDir)
      .filter((f) => f.endsWith('.json'));
    for (const f of files) {
      try {
        const m = JSON.parse(
          fs.readFileSync(path.join(this.storageDir, f), 'utf-8'),
        ) as ProtocolMock;
        if (m.id === id) {
          fs.unlinkSync(path.join(this.storageDir, f));
          return;
        }
      } catch {
        /* skip */
      }
    }
    throw new Error(`Mock not found: ${id}`);
  }

  parseGraphQLSchema(schema: string): GraphQLSchemaSummary {
    const types: string[] = [];
    const queries: string[] = [];
    const mutations: string[] = [];
    const subscriptions: string[] = [];

    const typeRegex = /^type\s+(\w+)/gm;
    let m: RegExpExecArray | null;
    while ((m = typeRegex.exec(schema)) !== null) {
      const typeName = m[1];
      if (typeName === 'Query') {
        const block = schema.slice(m.index).match(/\{([^}]{0,10000})\}/);
        if (block)
          queries.push(
            ...block[1]
              .trim()
              .split('\n')
              .map((l) => l.trim().split('(')[0])
              .filter(Boolean),
          );
      } else if (typeName === 'Mutation') {
        const block = schema.slice(m.index).match(/\{([^}]{0,10000})\}/);
        if (block)
          mutations.push(
            ...block[1]
              .trim()
              .split('\n')
              .map((l) => l.trim().split('(')[0])
              .filter(Boolean),
          );
      } else if (typeName === 'Subscription') {
        const block = schema.slice(m.index).match(/\{([^}]{0,10000})\}/);
        if (block)
          subscriptions.push(
            ...block[1]
              .trim()
              .split('\n')
              .map((l) => l.trim().split('(')[0])
              .filter(Boolean),
          );
      } else {
        types.push(typeName);
      }
    }

    return { types, queries, mutations, subscriptions };
  }

  async gripMockHealth(): Promise<{ available: boolean; url: string }> {
    try {
      const res = await fetch(`${this.gripMockUrl}/`, {
        signal: AbortSignal.timeout(3_000),
      });
      return { available: res.ok, url: this.gripMockUrl };
    } catch {
      return { available: false, url: this.gripMockUrl };
    }
  }

  // ─── Proto file management ────────────────────────────────────

  listProtoFiles(): ProtoFileInfo[] {
    return fs
      .readdirSync(this.protoDir)
      .filter((f) => f.endsWith('.proto'))
      .map((f) => {
        const stat = fs.statSync(path.join(this.protoDir, f));
        return {
          name: f,
          size: stat.size,
          updatedAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getProtoFile(name: string): string {
    const filePath = path.join(this.protoDir, this.sanitizeProtoName(name));
    if (!fs.existsSync(filePath))
      throw new NotFoundException(`Proto file "${name}" not found`);
    return fs.readFileSync(filePath, 'utf-8');
  }

  saveProtoFile(name: string, content: string): ProtoFileInfo {
    const safeName = this.sanitizeProtoName(name);
    const filePath = path.join(this.protoDir, safeName);
    fs.writeFileSync(filePath, content, 'utf-8');
    this.logger.log(`Proto file saved: ${safeName}`);
    const stat = fs.statSync(filePath);
    return {
      name: safeName,
      size: stat.size,
      updatedAt: stat.mtime.toISOString(),
    };
  }

  deleteProtoFile(name: string): void {
    const filePath = path.join(this.protoDir, this.sanitizeProtoName(name));
    if (!fs.existsSync(filePath))
      throw new NotFoundException(`Proto file "${name}" not found`);
    fs.unlinkSync(filePath);
    this.logger.log(`Proto file deleted: ${name}`);
  }

  private sanitizeProtoName(name: string): string {
    const base = path.basename(name);
    if (!base.endsWith('.proto'))
      throw new BadRequestException('File must have .proto extension');
    if (base.includes('..') || base.includes('/'))
      throw new BadRequestException('Invalid file name');
    return base;
  }

  // ─── GripMock stub proxy ──────────────────────────────────────

  async listGrpcStubs(): Promise<GrpcStub[]> {
    const res = await fetch(`${this.gripMockUrl}/`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`GripMock error: ${res.status}`);
    const data = (await res.json()) as Record<string, unknown> | GrpcStub[];
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object')
      return Object.values(data) as GrpcStub[];
    return [];
  }

  async addGrpcStub(stub: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`${this.gripMockUrl}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stub),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GripMock error: ${res.status} — ${text}`);
    }
    return res.json();
  }

  async clearGrpcStubs(): Promise<void> {
    const res = await fetch(`${this.gripMockUrl}/clear`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`GripMock error: ${res.status}`);
  }
}
