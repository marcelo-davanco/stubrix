import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ConfigDatabaseService } from '../database/config-database.service';
import type { ConfigRow } from '@stubrix/shared';

export interface IntegrityViolation {
  serviceId: string;
  key: string;
  expectedChecksum: string;
  actualChecksum: string;
  type: 'mismatch' | 'missing';
}

export interface IntegrityReport {
  totalEntries: number;
  verified: number;
  corrupted: IntegrityViolation[];
  missing: IntegrityViolation[];
  checkedAt: string;
  healthy: boolean;
}

export interface RepairReport {
  repaired: number;
  entries: { serviceId: string; key: string }[];
}

@Injectable()
export class IntegrityService {
  constructor(private readonly configDb: ConfigDatabaseService) {}

  private getAllConfigs(): ConfigRow[] {
    const services = this.configDb.getAllServices();
    return services.flatMap((s) => this.configDb.getServiceConfigs(s.id));
  }

  verifyAll(): IntegrityReport {
    const allConfigs = this.getAllConfigs();
    const corrupted: IntegrityViolation[] = [];
    const missing: IntegrityViolation[] = [];

    for (const cfg of allConfigs) {
      const computed = this.computeChecksum(cfg.value);
      if (!cfg.checksum) {
        missing.push({
          serviceId: cfg.service_id,
          key: cfg.key,
          expectedChecksum: computed,
          actualChecksum: '',
          type: 'missing',
        });
      } else if (cfg.checksum !== computed) {
        corrupted.push({
          serviceId: cfg.service_id,
          key: cfg.key,
          expectedChecksum: computed,
          actualChecksum: cfg.checksum,
          type: 'mismatch',
        });
      }
    }

    const verified = allConfigs.length - corrupted.length - missing.length;

    return {
      totalEntries: allConfigs.length,
      verified,
      corrupted,
      missing,
      checkedAt: new Date().toISOString(),
      healthy: corrupted.length === 0 && missing.length === 0,
    };
  }

  verifyService(serviceId: string): IntegrityReport {
    const allConfigs = this.configDb.getServiceConfigs(serviceId);
    const corrupted: IntegrityViolation[] = [];
    const missing: IntegrityViolation[] = [];

    for (const cfg of allConfigs) {
      const computed = this.computeChecksum(cfg.value);
      if (!cfg.checksum) {
        missing.push({
          serviceId,
          key: cfg.key,
          expectedChecksum: computed,
          actualChecksum: '',
          type: 'missing',
        });
      } else if (cfg.checksum !== computed) {
        corrupted.push({
          serviceId,
          key: cfg.key,
          expectedChecksum: computed,
          actualChecksum: cfg.checksum,
          type: 'mismatch',
        });
      }
    }

    return {
      totalEntries: allConfigs.length,
      verified: allConfigs.length - corrupted.length - missing.length,
      corrupted,
      missing,
      checkedAt: new Date().toISOString(),
      healthy: corrupted.length === 0 && missing.length === 0,
    };
  }

  repairChecksums(): RepairReport {
    const allConfigs = this.getAllConfigs();
    const repaired: { serviceId: string; key: string }[] = [];

    for (const cfg of allConfigs) {
      const computed = this.computeChecksum(cfg.value);
      if (!cfg.checksum || cfg.checksum !== computed) {
        this.configDb.setConfig(cfg.service_id, cfg.key, cfg.value, {
          is_sensitive: cfg.is_sensitive,
          description: cfg.description ?? undefined,
          data_type: cfg.data_type ?? undefined,
          checksum: computed,
        });
        repaired.push({ serviceId: cfg.service_id, key: cfg.key });
      }
    }

    return { repaired: repaired.length, entries: repaired };
  }

  computeChecksum(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
