import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ToxiProxy {
  name: string;
  listen: string;
  upstream: string;
  enabled: boolean;
  toxics: Toxic[];
}

export interface Toxic {
  name: string;
  type: string;
  stream: 'upstream' | 'downstream';
  toxicity: number;
  attributes: Record<string, unknown>;
}

export interface NetworkPreset {
  name: string;
  description: string;
  toxics: Omit<Toxic, 'name'>[];
}

const NETWORK_PRESETS: Record<string, NetworkPreset> = {
  'latency': {
    name: 'High Latency',
    description: 'Add 500ms latency to all connections',
    toxics: [{ type: 'latency', stream: 'downstream', toxicity: 1.0, attributes: { latency: 500, jitter: 50 } }],
  },
  'bandwidth': {
    name: 'Low Bandwidth',
    description: 'Limit bandwidth to 100KB/s',
    toxics: [{ type: 'bandwidth', stream: 'downstream', toxicity: 1.0, attributes: { rate: 100 } }],
  },
  'packet-loss': {
    name: 'Packet Loss',
    description: '30% packet loss simulation',
    toxics: [{ type: 'timeout', stream: 'downstream', toxicity: 0.3, attributes: { timeout: 0 } }],
  },
  'slow-close': {
    name: 'Slow Close',
    description: 'Delay connection closing by 2s',
    toxics: [{ type: 'slow_close', stream: 'downstream', toxicity: 1.0, attributes: { delay: 2000 } }],
  },
};

@Injectable()
export class ChaosNetworkService {
  private readonly logger = new Logger(ChaosNetworkService.name);
  private readonly toxiproxyUrl: string;

  constructor(private readonly config: ConfigService) {
    this.toxiproxyUrl = this.config.get<string>('TOXIPROXY_URL') ?? 'http://localhost:8474';
  }

  async listProxies(): Promise<ToxiProxy[]> {
    try {
      const res = await fetch(`${this.toxiproxyUrl}/proxies`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) throw new Error(`Toxiproxy HTTP ${res.status}`);
      const data = (await res.json()) as Record<string, ToxiProxy>;
      return Object.values(data);
    } catch (err) {
      this.logger.warn(`Toxiproxy unavailable: ${(err as Error).message}`);
      return [];
    }
  }

  async createProxy(name: string, listen: string, upstream: string): Promise<ToxiProxy> {
    const res = await fetch(`${this.toxiproxyUrl}/proxies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, listen, upstream, enabled: true }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`Toxiproxy HTTP ${res.status}`);
    return (await res.json()) as ToxiProxy;
  }

  async addToxic(proxyName: string, toxic: Omit<Toxic, 'name'> & { name?: string }): Promise<Toxic> {
    const name = toxic.name ?? `${toxic.type}_${Date.now()}`;
    const res = await fetch(`${this.toxiproxyUrl}/proxies/${proxyName}/toxics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toxic, name }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`Toxiproxy HTTP ${res.status}`);
    return (await res.json()) as Toxic;
  }

  async removeToxic(proxyName: string, toxicName: string): Promise<void> {
    await fetch(`${this.toxiproxyUrl}/proxies/${proxyName}/toxics/${toxicName}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(5_000),
    });
  }

  async deleteProxy(name: string): Promise<void> {
    await fetch(`${this.toxiproxyUrl}/proxies/${name}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(5_000),
    });
  }

  listPresets(): NetworkPreset[] {
    return Object.values(NETWORK_PRESETS);
  }

  async applyPreset(proxyName: string, presetName: string): Promise<Toxic[]> {
    const preset = NETWORK_PRESETS[presetName];
    if (!preset) throw new Error(`Unknown preset: ${presetName}`);

    const results: Toxic[] = [];
    for (const toxic of preset.toxics) {
      const t = await this.addToxic(proxyName, { ...toxic, name: `${presetName}_${Date.now()}` });
      results.push(t);
    }
    return results;
  }

  async healthCheck(): Promise<{ available: boolean; url: string }> {
    try {
      const res = await fetch(`${this.toxiproxyUrl}/version`, {
        signal: AbortSignal.timeout(3_000),
      });
      return { available: res.ok, url: this.toxiproxyUrl };
    } catch {
      return { available: false, url: this.toxiproxyUrl };
    }
  }
}
