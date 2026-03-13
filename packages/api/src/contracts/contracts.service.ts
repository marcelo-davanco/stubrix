import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PactContract {
  consumer: string;
  provider: string;
  pactUrl: string;
  status?: 'verified' | 'failed' | 'pending';
  verifiedAt?: string;
}

export interface CanIDeployResult {
  success: boolean;
  consumer: string;
  provider: string;
  message: string;
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);
  private readonly brokerUrl: string;

  constructor(private readonly config: ConfigService) {
    this.brokerUrl = this.config.get<string>('PACT_BROKER_URL') ?? 'http://localhost:9292';
  }

  async listContracts(): Promise<PactContract[]> {
    try {
      const res = await fetch(`${this.brokerUrl}/pacts/latest`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) throw new Error(`Pact Broker HTTP ${res.status}`);
      const data = (await res.json()) as { _embedded?: { pacts?: Array<{ _links: { self: Array<{ href: string; name: string }> }; _embedded: { consumer: { name: string }; provider: { name: string } } }> } };
      return (data._embedded?.pacts ?? []).map((p) => ({
        consumer: p._embedded.consumer.name,
        provider: p._embedded.provider.name,
        pactUrl: p._links.self[0]?.href ?? '',
        status: 'pending',
      }));
    } catch (err) {
      this.logger.warn(`Pact Broker unavailable: ${(err as Error).message}`);
      return [];
    }
  }

  async canIDeploy(pacticipant: string, version: string): Promise<CanIDeployResult> {
    try {
      const res = await fetch(
        `${this.brokerUrl}/can-i-deploy?pacticipant=${encodeURIComponent(pacticipant)}&version=${encodeURIComponent(version)}&to=production`,
        { signal: AbortSignal.timeout(10_000) },
      );
      const data = (await res.json()) as { summary?: { deployable?: boolean; reason?: string } };
      const deployable = data.summary?.deployable ?? false;
      return {
        success: deployable,
        consumer: pacticipant,
        provider: '',
        message: data.summary?.reason ?? (deployable ? 'All verifications passed' : 'Verification failed'),
      };
    } catch (err) {
      return {
        success: false,
        consumer: pacticipant,
        provider: '',
        message: `Pact Broker unavailable: ${(err as Error).message}`,
      };
    }
  }

  async healthCheck(): Promise<{ available: boolean; url: string }> {
    try {
      const res = await fetch(`${this.brokerUrl}`, { signal: AbortSignal.timeout(3_000) });
      return { available: res.ok, url: this.brokerUrl };
    } catch {
      return { available: false, url: this.brokerUrl };
    }
  }
}
