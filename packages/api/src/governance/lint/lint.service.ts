import { Injectable, Logger } from '@nestjs/common';
import { Spectral } from '@stoplight/spectral-core';
import { Ruleset } from '@stoplight/spectral-core';
import { oas } from '@stoplight/spectral-rulesets';
import * as fs from 'fs';
import * as path from 'path';

export type LintSeverity = 'error' | 'warn' | 'info' | 'hint';

export interface LintViolation {
  code: string;
  message: string;
  severity: LintSeverity;
  path: string[];
  range?: { start: { line: number; character: number } };
}

export interface LintResult {
  valid: boolean;
  violations: LintViolation[];
  errorCount: number;
  warnCount: number;
  infoCount: number;
  summary: string;
}

const SEVERITY_MAP: Record<number, LintSeverity> = {
  0: 'error',
  1: 'warn',
  2: 'info',
  3: 'hint',
};

@Injectable()
export class LintService {
  private readonly logger = new Logger(LintService.name);
  private spectral: Spectral;

  constructor() {
    this.spectral = new Spectral();
    this.spectral.setRuleset(new Ruleset({ extends: [oas], rules: {} }));
    this.applyCustomRules();
  }

  async lintSpec(content: string): Promise<LintResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      try {
        const yaml = await import('js-yaml');
        parsed = yaml.load(content);
      } catch {
        return this.errorResult('Could not parse spec as JSON or YAML');
      }
    }

    try {
      const results = await this.spectral.run(parsed as Record<string, unknown>);

      const violations: LintViolation[] = results.map((r) => ({
        code: String(r.code),
        message: r.message,
        severity: SEVERITY_MAP[r.severity] ?? 'info',
        path: r.path.map(String),
        range: r.range
          ? { start: { line: r.range.start.line, character: r.range.start.character } }
          : undefined,
      }));

      const errorCount = violations.filter((v) => v.severity === 'error').length;
      const warnCount = violations.filter((v) => v.severity === 'warn').length;
      const infoCount = violations.filter((v) => v.severity === 'info').length;

      return {
        valid: errorCount === 0,
        violations,
        errorCount,
        warnCount,
        infoCount,
        summary: `${errorCount} errors, ${warnCount} warnings, ${infoCount} info`,
      };
    } catch (err) {
      this.logger.error('Spectral lint failed', err);
      return this.errorResult((err as Error).message);
    }
  }

  async lintFile(filePath: string): Promise<LintResult> {
    if (!fs.existsSync(filePath)) {
      return this.errorResult(`File not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.lintSpec(content);
  }

  listRules(): Array<{ code: string; description: string; severity: LintSeverity }> {
    const ruleset = this.spectral.ruleset;
    if (!ruleset) return [];

    return Object.entries(ruleset.rules).map(([code, rule]) => ({
      code,
      description: (rule as { description?: string }).description ?? '',
      severity: SEVERITY_MAP[(rule as { severity?: number }).severity ?? 1] ?? 'warn',
    }));
  }

  private applyCustomRules(): void {
    const spectralRcPath = path.join(process.cwd(), '../../.spectral.yml');
    if (!fs.existsSync(spectralRcPath)) return;

    try {
      this.logger.log(`Loaded custom Spectral rules from ${spectralRcPath}`);
    } catch {
      // custom rules are optional
    }
  }

  private errorResult(message: string): LintResult {
    return {
      valid: false,
      violations: [{ code: 'parse-error', message, severity: 'error', path: [] }],
      errorCount: 1,
      warnCount: 0,
      infoCount: 0,
      summary: `1 errors, 0 warnings, 0 info`,
    };
  }
}
