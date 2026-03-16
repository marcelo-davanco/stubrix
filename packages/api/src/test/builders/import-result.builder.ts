import { ImportResult } from '../../import/import.service';

export class ImportResultBuilder {
  private readonly data: ImportResult = {
    created: 0,
    skipped: 0,
    errors: [],
    summary: 'No changes',
  };

  static create(): ImportResultBuilder {
    return new ImportResultBuilder();
  }

  withCreated(created: number): this {
    this.data.created = created;
    return this;
  }

  withSkipped(skipped: number): this {
    this.data.skipped = skipped;
    return this;
  }

  withErrors(errors: string[]): this {
    this.data.errors = [...errors];
    return this;
  }

  withSummary(summary: string): this {
    this.data.summary = summary;
    return this;
  }

  build(): ImportResult {
    return { ...this.data, errors: [...this.data.errors] };
  }
}
