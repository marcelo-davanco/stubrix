import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class ProtocolsService {
  private readonly logger = new Logger(ProtocolsService.name);
  private readonly storageDir: string;
  private readonly gripMockUrl: string;

  constructor(private readonly config: ConfigService) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ?? path.join(process.cwd(), '../../mocks');
    this.storageDir = path.join(mocksDir, 'protocols');
    this.gripMockUrl = this.config.get<string>('GRIPMOCK_URL') ?? 'http://localhost:4771';
    fs.mkdirSync(this.storageDir, { recursive: true });
  }

  listMocks(protocol?: ProtocolType): ProtocolMock[] {
    return fs
      .readdirSync(this.storageDir)
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) => {
        try {
          return [JSON.parse(fs.readFileSync(path.join(this.storageDir, f), 'utf-8')) as ProtocolMock];
        } catch { return []; }
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
    const filename = `${protocol}_${name.replace(/[^a-z0-9]/gi, '_')}_${mock.id}.json`;
    fs.writeFileSync(path.join(this.storageDir, filename), JSON.stringify(mock, null, 2));
    this.logger.log(`Protocol mock created: ${protocol}/${name}`);
    return mock;
  }

  deleteMock(id: string): void {
    const files = fs.readdirSync(this.storageDir).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      try {
        const m = JSON.parse(fs.readFileSync(path.join(this.storageDir, f), 'utf-8')) as ProtocolMock;
        if (m.id === id) {
          fs.unlinkSync(path.join(this.storageDir, f));
          return;
        }
      } catch { /* skip */ }
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
        const block = schema.slice(m.index).match(/\{([^}]+)\}/);
        if (block) queries.push(...block[1].trim().split('\n').map((l) => l.trim().split('(')[0]).filter(Boolean));
      } else if (typeName === 'Mutation') {
        const block = schema.slice(m.index).match(/\{([^}]+)\}/);
        if (block) mutations.push(...block[1].trim().split('\n').map((l) => l.trim().split('(')[0]).filter(Boolean));
      } else if (typeName === 'Subscription') {
        const block = schema.slice(m.index).match(/\{([^}]+)\}/);
        if (block) subscriptions.push(...block[1].trim().split('\n').map((l) => l.trim().split('(')[0]).filter(Boolean));
      } else {
        types.push(typeName);
      }
    }

    return { types, queries, mutations, subscriptions };
  }

  async gripMockHealth(): Promise<{ available: boolean; url: string }> {
    try {
      const res = await fetch(`${this.gripMockUrl}/api/stubs`, { signal: AbortSignal.timeout(3_000) });
      return { available: res.ok, url: this.gripMockUrl };
    } catch {
      return { available: false, url: this.gripMockUrl };
    }
  }
}
