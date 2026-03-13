import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface RagDocument {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface RagQueryResult {
  answer: string;
  sources: Array<{ id: string; content: string; score: number }>;
  model?: string;
}

export interface MockSuggestion {
  method: string;
  urlPath: string;
  responseStatus: number;
  responseBody: string;
  responseHeaders: Record<string, string>;
  reasoning?: string;
}

export interface DataSuggestion {
  sql: string;
  tableName: string;
  rows: number;
  reasoning?: string;
}

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);
  private readonly openragUrl: string;
  private readonly mappingsDir: string;

  constructor(private readonly config: ConfigService) {
    this.openragUrl = this.config.get<string>('OPENRAG_URL') ?? 'http://localhost:8888';
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ?? path.join(process.cwd(), '../../mocks');
    this.mappingsDir = path.join(mocksDir, 'mappings');
  }

  async query(question: string): Promise<RagQueryResult> {
    try {
      const res = await fetch(`${this.openragUrl}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: question }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        throw new Error(`OpenRAG returned HTTP ${res.status}`);
      }

      return (await res.json()) as RagQueryResult;
    } catch (err) {
      this.logger.warn(`OpenRAG unavailable: ${(err as Error).message} — returning stub`);
      return this.stubQueryResult(question);
    }
  }

  async suggestMock(description: string): Promise<MockSuggestion> {
    const context = this.buildMockContext();

    try {
      const res = await fetch(`${this.openragUrl}/generate/mock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, context }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) throw new Error(`OpenRAG HTTP ${res.status}`);
      return (await res.json()) as MockSuggestion;
    } catch {
      return this.heuristicMockSuggestion(description);
    }
  }

  async suggestData(description: string): Promise<DataSuggestion> {
    try {
      const res = await fetch(`${this.openragUrl}/generate/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) throw new Error(`OpenRAG HTTP ${res.status}`);
      return (await res.json()) as DataSuggestion;
    } catch {
      return this.heuristicDataSuggestion(description);
    }
  }

  async indexMocks(): Promise<{ indexed: number }> {
    const docs = this.loadMockDocuments();
    if (docs.length === 0) return { indexed: 0 };

    try {
      const res = await fetch(`${this.openragUrl}/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: docs }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) throw new Error(`OpenRAG HTTP ${res.status}`);
      const result = (await res.json()) as { indexed?: number };
      this.logger.log(`Indexed ${result.indexed ?? docs.length} mock documents into RAG`);
      return { indexed: result.indexed ?? docs.length };
    } catch (err) {
      this.logger.warn(`RAG index unavailable: ${(err as Error).message}`);
      return { indexed: 0 };
    }
  }

  async healthCheck(): Promise<{ available: boolean; url: string }> {
    try {
      const res = await fetch(`${this.openragUrl}/health`, {
        signal: AbortSignal.timeout(3_000),
      });
      return { available: res.ok, url: this.openragUrl };
    } catch {
      return { available: false, url: this.openragUrl };
    }
  }

  private loadMockDocuments(): RagDocument[] {
    if (!fs.existsSync(this.mappingsDir)) return [];
    return fs
      .readdirSync(this.mappingsDir)
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) => {
        try {
          const raw = fs.readFileSync(path.join(this.mappingsDir, f), 'utf-8');
          const m = JSON.parse(raw) as Record<string, unknown>;
          return [{
            id: f.replace('.json', ''),
            content: JSON.stringify(m),
            metadata: { filename: f, type: 'wiremock-mapping' },
          }];
        } catch {
          return [];
        }
      });
  }

  private buildMockContext(): string {
    const docs = this.loadMockDocuments();
    return docs.slice(0, 5).map((d) => d.content).join('\n\n');
  }

  private stubQueryResult(question: string): RagQueryResult {
    return {
      answer: `[OpenRAG offline] Could not answer: "${question}". Start OpenRAG with: make ai-up`,
      sources: [],
      model: 'stub',
    };
  }

  private heuristicMockSuggestion(description: string): MockSuggestion {
    const lower = description.toLowerCase();
    const method = lower.includes('creat') || lower.includes('post')
      ? 'POST'
      : lower.includes('updat') || lower.includes('put')
      ? 'PUT'
      : lower.includes('delet')
      ? 'DELETE'
      : 'GET';

    const words = description.match(/\/[a-z0-9_/-]+/i);
    const urlPath = words?.[0] ?? '/api/resource';

    return {
      method,
      urlPath,
      responseStatus: method === 'POST' ? 201 : method === 'DELETE' ? 204 : 200,
      responseBody: JSON.stringify({ message: 'success', data: {} }, null, 2),
      responseHeaders: { 'Content-Type': 'application/json' },
      reasoning: 'Heuristic suggestion (OpenRAG offline)',
    };
  }

  private heuristicDataSuggestion(description: string): DataSuggestion {
    const words = description.match(/\b[a-z_]+\b/gi) ?? ['records'];
    const tableName = words.find((w) => w.length > 3) ?? 'table';

    return {
      sql: `INSERT INTO ${tableName} (id, created_at) VALUES (gen_random_uuid(), NOW());`,
      tableName,
      rows: 10,
      reasoning: 'Heuristic suggestion (OpenRAG offline)',
    };
  }
}
