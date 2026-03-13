import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { FaultProfile, FaultRule, ChaosPreset, ChaosResult } from './chaos.types';

const PRESETS: Record<string, ChaosPreset> = {
  'slow-network': {
    name: 'Slow Network',
    description: 'Simulates a slow 3G connection with 2s delay',
    faults: [{ type: 'delay', probability: 1.0, delayMs: 2000 }],
  },
  'flaky-service': {
    name: 'Flaky Service',
    description: '30% chance of 500 error, 20% chance of 1s delay',
    faults: [
      { type: 'random_error', probability: 0.3, errorStatus: 500, errorMessage: 'Internal Server Error' },
      { type: 'delay', probability: 0.2, delayMs: 1000 },
    ],
  },
  'total-outage': {
    name: 'Total Outage',
    description: '100% of requests fail with 503',
    faults: [{ type: 'error', probability: 1.0, errorStatus: 503, errorMessage: 'Service Unavailable' }],
  },
  'timeout': {
    name: 'Request Timeout',
    description: 'All requests timeout after 30s',
    faults: [{ type: 'timeout', probability: 1.0, delayMs: 30000 }],
  },
};

@Injectable()
export class ChaosService {
  private readonly logger = new Logger(ChaosService.name);
  private readonly profilesDir: string;

  constructor(private readonly config: ConfigService) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ?? path.join(process.cwd(), '../../mocks');
    this.profilesDir = path.join(mocksDir, 'chaos');
    fs.mkdirSync(this.profilesDir, { recursive: true });
  }

  listProfiles(): FaultProfile[] {
    return fs
      .readdirSync(this.profilesDir)
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) => {
        try {
          return [JSON.parse(fs.readFileSync(path.join(this.profilesDir, f), 'utf-8')) as FaultProfile];
        } catch {
          return [];
        }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getProfile(id: string): FaultProfile | undefined {
    return this.listProfiles().find((p) => p.id === id);
  }

  createProfile(
    name: string,
    faults: FaultRule[],
    description?: string,
    urlPattern?: string,
    methods?: string[],
  ): FaultProfile {
    const profile: FaultProfile = {
      id: uuidv4(),
      name,
      description,
      enabled: true,
      urlPattern,
      methods,
      faults,
      createdAt: new Date().toISOString(),
    };
    const filename = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${profile.id}.json`;
    fs.writeFileSync(path.join(this.profilesDir, filename), JSON.stringify(profile, null, 2));
    this.logger.log(`Chaos profile created: ${name} (${profile.id})`);
    return profile;
  }

  toggleProfile(id: string, enabled: boolean): FaultProfile {
    const profile = this.getProfile(id);
    if (!profile) throw new Error(`Profile not found: ${id}`);

    profile.enabled = enabled;
    this.saveProfile(profile);
    return profile;
  }

  deleteProfile(id: string): void {
    const files = fs.readdirSync(this.profilesDir).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      try {
        const p = JSON.parse(fs.readFileSync(path.join(this.profilesDir, f), 'utf-8')) as FaultProfile;
        if (p.id === id) {
          fs.unlinkSync(path.join(this.profilesDir, f));
          return;
        }
      } catch {
        // skip
      }
    }
    throw new Error(`Profile not found: ${id}`);
  }

  listPresets(): ChaosPreset[] {
    return Object.values(PRESETS);
  }

  applyPreset(presetName: string, urlPattern?: string): FaultProfile {
    const preset = PRESETS[presetName];
    if (!preset) throw new Error(`Unknown preset: ${presetName}`);
    return this.createProfile(preset.name, preset.faults, preset.description, urlPattern);
  }

  evaluate(urlPath: string, method: string): ChaosResult {
    const active = this.listProfiles().filter((p) => p.enabled);
    for (const profile of active) {
      if (profile.urlPattern) {
        try {
          if (!new RegExp(profile.urlPattern).test(urlPath)) continue;
        } catch {
          continue;
        }
      }
      if (profile.methods?.length && !profile.methods.includes(method.toUpperCase())) continue;

      for (const fault of profile.faults) {
        if (Math.random() < fault.probability) {
          return { triggered: true, fault, profile: profile.name };
        }
      }
    }
    return { triggered: false };
  }

  private saveProfile(profile: FaultProfile): void {
    const files = fs.readdirSync(this.profilesDir).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      try {
        const p = JSON.parse(fs.readFileSync(path.join(this.profilesDir, f), 'utf-8')) as FaultProfile;
        if (p.id === profile.id) {
          fs.writeFileSync(path.join(this.profilesDir, f), JSON.stringify(profile, null, 2));
          return;
        }
      } catch {
        // skip
      }
    }
  }
}
