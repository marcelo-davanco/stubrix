import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WireMockClientService } from '../common/wiremock-client.service';

@Injectable()
export class EngineService {
  constructor(
    private readonly config: ConfigService,
    private readonly wireMock: WireMockClientService,
  ) {}

  async getEngine() {
    const engine = this.config.get<string>('MOCK_ENGINE') ?? 'wiremock';
    const port = this.config.get<string>('MOCK_PORT') ?? '8081';
    let healthy = false;

    try {
      await this.wireMock.get('/settings');
      healthy = true;
    } catch {
      healthy = false;
    }

    return { engine, port: parseInt(port, 10), healthy };
  }

  async resetMappings() {
    await this.wireMock.post('/mappings/reset', {});
    return { message: 'Mappings reset to defaults' };
  }
}
