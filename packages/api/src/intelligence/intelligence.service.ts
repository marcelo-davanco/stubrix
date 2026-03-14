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

interface OpenRagChatResponse {
  response?: string;
  answer?: string;
  output?: string;
  message?: string;
  sources?: Array<{ id?: string; content?: string; score?: number }>;
  model?: string;
}

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);
  private readonly openragUrl: string;
  private readonly mappingsDir: string;

  constructor(private readonly config: ConfigService) {
    this.openragUrl =
      this.config.get<string>('OPENRAG_URL') ?? 'http://localhost:8888';
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ??
      path.join(process.cwd(), '../../mocks');
    this.mappingsDir = path.join(mocksDir, 'mappings');
  }

  async query(question: string): Promise<RagQueryResult> {
    try {
      const res = await fetch(`${this.openragUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: question }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        throw new Error(`OpenRAG returned HTTP ${res.status}`);
      }

      const raw = (await res.json()) as OpenRagChatResponse;
      return {
        answer: raw.response ?? raw.answer ?? raw.output ?? raw.message ?? '',
        sources: (raw.sources ?? []).map((s, i) => ({
          id: s.id ?? String(i),
          content: s.content ?? '',
          score: s.score ?? 0,
        })),
        model: raw.model,
      };
    } catch (err) {
      this.logger.warn(
        `OpenRAG unavailable: ${(err as Error).message} — returning stub`,
      );
      return this.stubQueryResult(question);
    }
  }

  async suggestMock(description: string): Promise<MockSuggestion> {
    const context = this.buildMockContext();
    const prompt = [
      'Generate a WireMock JSON mapping for the following description:',
      description,
      context ? `\nExisting mocks context:\n${context}` : '',
      '\nRespond ONLY with valid JSON in the format:',
      '{"method":"GET","urlPath":"/api/...","responseStatus":200,"responseBody":"{}","responseHeaders":{"Content-Type":"application/json"}}',
    ].join('\n');

    try {
      const res = await fetch(`${this.openragUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) throw new Error(`OpenRAG HTTP ${res.status}`);

      const raw = (await res.json()) as OpenRagChatResponse;
      const text =
        raw.response ?? raw.answer ?? raw.output ?? raw.message ?? '';
      return this.parseMockSuggestion(text, description);
    } catch {
      return this.heuristicMockSuggestion(description);
    }
  }

  async suggestData(description: string): Promise<DataSuggestion> {
    const prompt = [
      'Generate SQL INSERT statements for the following description:',
      description,
      '\nRespond ONLY with valid JSON in the format:',
      '{"sql":"INSERT INTO ...","tableName":"...","rows":10}',
    ].join('\n');

    try {
      const res = await fetch(`${this.openragUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) throw new Error(`OpenRAG HTTP ${res.status}`);

      const raw = (await res.json()) as OpenRagChatResponse;
      const text =
        raw.response ?? raw.answer ?? raw.output ?? raw.message ?? '';
      return this.parseDataSuggestion(text, description);
    } catch {
      return this.heuristicDataSuggestion(description);
    }
  }

  async indexMocks(): Promise<{ indexed: number }> {
    if (!fs.existsSync(this.mappingsDir)) return { indexed: 0 };

    const files = fs
      .readdirSync(this.mappingsDir)
      .filter((f) => f.endsWith('.json'));
    if (files.length === 0) return { indexed: 0 };

    let indexed = 0;
    for (const filename of files) {
      try {
        const content = fs.readFileSync(path.join(this.mappingsDir, filename));
        const form = new FormData();
        form.append(
          'file',
          new Blob([content], { type: 'application/json' }),
          filename,
        );

        const res = await fetch(`${this.openragUrl}/upload_context`, {
          method: 'POST',
          body: form,
          signal: AbortSignal.timeout(10_000),
        });

        if (res.ok) indexed++;
        else
          this.logger.warn(`Failed to index ${filename}: HTTP ${res.status}`);
      } catch (err) {
        this.logger.warn(
          `Error indexing ${filename}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Indexed ${indexed}/${files.length} mock files into OpenRAG`,
    );
    return { indexed };
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
          return [
            {
              id: f.replace('.json', ''),
              content: JSON.stringify(m),
              metadata: { filename: f, type: 'wiremock-mapping' },
            },
          ];
        } catch {
          return [];
        }
      });
  }

  private buildMockContext(): string {
    const docs = this.loadMockDocuments();
    return docs
      .slice(0, 5)
      .map((d) => d.content)
      .join('\n\n');
  }

  private parseMockSuggestion(
    text: string,
    description: string,
  ): MockSuggestion {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Partial<MockSuggestion>;
        if (parsed.method && parsed.urlPath) {
          return {
            method: parsed.method,
            urlPath: parsed.urlPath,
            responseStatus: parsed.responseStatus ?? 200,
            responseBody: parsed.responseBody ?? '{}',
            responseHeaders: parsed.responseHeaders ?? {
              'Content-Type': 'application/json',
            },
            reasoning: parsed.reasoning ?? text,
          };
        }
      }
    } catch {}
    return this.heuristicMockSuggestion(description);
  }

  private parseDataSuggestion(
    text: string,
    description: string,
  ): DataSuggestion {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Partial<DataSuggestion>;
        if (parsed.sql && parsed.tableName) {
          return {
            sql: parsed.sql,
            tableName: parsed.tableName,
            rows: parsed.rows ?? 10,
            reasoning: parsed.reasoning ?? text,
          };
        }
      }
    } catch {}
    return this.heuristicDataSuggestion(description);
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
    const method =
      lower.includes('creat') || lower.includes('post')
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
