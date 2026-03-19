import { StartRecordingDto } from '../../recording/dto/start-recording.dto';

export class StartRecordingDtoBuilder {
  private readonly data: StartRecordingDto = {
    proxyTarget: 'https://api.example.com',
    includePatterns: undefined,
    excludePatterns: undefined,
  };

  static create(): StartRecordingDtoBuilder {
    return new StartRecordingDtoBuilder();
  }

  withProxyTarget(proxyTarget: string): this {
    this.data.proxyTarget = proxyTarget;
    return this;
  }

  withIncludePatterns(patterns: string[]): this {
    this.data.includePatterns = patterns;
    return this;
  }

  withExcludePatterns(patterns: string[]): this {
    this.data.excludePatterns = patterns;
    return this;
  }

  build(): StartRecordingDto {
    return { ...this.data };
  }
}
