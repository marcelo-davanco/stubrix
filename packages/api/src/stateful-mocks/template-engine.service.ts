import { Injectable, BadRequestException } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import type { StateQueryResult } from './state-resolver.service';

export interface TemplateContext {
  state: {
    rows: Record<string, unknown>[];
    rowCount: number;
    queryTimeMs: number;
    fromCache: boolean;
  };
  request: {
    method?: string;
    url?: string;
    query?: Record<string, unknown>;
    headers?: Record<string, unknown>;
    body?: unknown;
  };
}

@Injectable()
export class TemplateEngineService {
  private readonly handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  render(template: string, context: TemplateContext): string {
    try {
      const compiled = this.handlebars.compile(template, { noEscape: true });
      return compiled(context);
    } catch (err) {
      throw new BadRequestException(
        `Template rendering failed: ${(err as Error).message}`,
      );
    }
  }

  validate(template: string): { valid: boolean; error?: string } {
    try {
      this.handlebars.precompile(template);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: (err as Error).message };
    }
  }

  buildContext(
    stateResult: StateQueryResult,
    requestContext?: TemplateContext['request'],
  ): TemplateContext {
    return {
      state: {
        rows: stateResult.rows,
        rowCount: stateResult.rowCount,
        queryTimeMs: stateResult.queryTimeMs,
        fromCache: stateResult.fromCache,
      },
      request: requestContext ?? {},
    };
  }

  private registerHelpers(): void {
    this.handlebars.registerHelper(
      'json',
      (value: unknown) => new Handlebars.SafeString(JSON.stringify(value)),
    );

    this.handlebars.registerHelper(
      'jsonPretty',
      (value: unknown) =>
        new Handlebars.SafeString(JSON.stringify(value, null, 2)),
    );

    this.handlebars.registerHelper('pick', (arr: unknown[], index: number) => {
      if (!Array.isArray(arr)) return '';
      return arr[index] ?? '';
    });

    this.handlebars.registerHelper('first', (arr: unknown[]) =>
      Array.isArray(arr) ? (arr[0] ?? '') : '',
    );

    this.handlebars.registerHelper('last', (arr: unknown[]) =>
      Array.isArray(arr) ? (arr[arr.length - 1] ?? '') : '',
    );

    this.handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

    this.handlebars.registerHelper('gt', (a: number, b: number) => a > b);

    this.handlebars.registerHelper('lt', (a: number, b: number) => a < b);
  }
}
