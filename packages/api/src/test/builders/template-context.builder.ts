import { TemplateContext } from '../../stateful-mocks/template-engine.service';

export class TemplateContextBuilder {
  private readonly data: TemplateContext = {
    state: {
      rows: [],
      rowCount: 0,
      queryTimeMs: 0,
      fromCache: false,
    },
    request: {
      method: 'GET',
      url: '/api/test',
      query: {},
      headers: {},
    },
  };

  static create(): TemplateContextBuilder {
    return new TemplateContextBuilder();
  }

  withRows(rows: Record<string, unknown>[]): this {
    this.data.state.rows = rows;
    this.data.state.rowCount = rows.length;
    return this;
  }

  withRowCount(rowCount: number): this {
    this.data.state.rowCount = rowCount;
    return this;
  }

  withQueryTimeMs(queryTimeMs: number): this {
    this.data.state.queryTimeMs = queryTimeMs;
    return this;
  }

  withFromCache(fromCache: boolean): this {
    this.data.state.fromCache = fromCache;
    return this;
  }

  withRequestMethod(method: string): this {
    this.data.request.method = method;
    return this;
  }

  withRequestUrl(url: string): this {
    this.data.request.url = url;
    return this;
  }

  withRequestQuery(query: Record<string, unknown>): this {
    this.data.request.query = query;
    return this;
  }

  withRequestHeaders(headers: Record<string, unknown>): this {
    this.data.request.headers = headers;
    return this;
  }

  build(): TemplateContext {
    return {
      state: { ...this.data.state },
      request: { ...this.data.request },
    };
  }
}
