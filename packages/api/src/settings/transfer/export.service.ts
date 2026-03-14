import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import * as yaml from 'js-yaml';
import { ConfigDatabaseService } from '../database/config-database.service';
import { CryptoService } from '../crypto/crypto.service';
import { ServiceRegistryService } from '../registry/service-registry.service';
import type { ExportConfigDto } from './dto/export-config.dto';

const REDACTED = '[REDACTED]';
const FORMAT_VERSION = '1.0.0';
const FORMAT_NAME = 'stubrix-config-export';

// ─── Interfaces ───────────────────────────────────────────────

export interface ConfigValue {
  value: string;
  dataType: string;
}

interface ExportServiceEntry {
  name: string;
  category: string;
  enabled: boolean;
  configs: Record<string, ConfigValue | string>;
}

export interface ExportPayload {
  meta: {
    version: string;
    format: string;
    exportedAt: string;
    exportedBy: string;
    scope: string;
    servicesIncluded: string[];
    encrypted: boolean;
    includeSensitive: boolean;
    checksum: string;
  };
  services?: Record<string, ExportServiceEntry>;
  payload?: string;
}

export interface ExportResult {
  content: string;
  filename: string;
  contentType: string;
  servicesExported: number;
  configsExported: number;
  sensitiveRedacted: number;
}

// ─── Helper ───────────────────────────────────────────────────

function computeChecksum(content: string): string {
  return 'sha256:' + createHash('sha256').update(content).digest('hex');
}

// ─── Service ─────────────────────────────────────────────────

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly configDb: ConfigDatabaseService,
    private readonly crypto: CryptoService,
    private readonly registry: ServiceRegistryService,
  ) {}

  async exportConfigs(options: ExportConfigDto): Promise<ExportResult> {
    const format = options.format ?? 'json';
    const includeSensitive = options.includeSensitive ?? false;

    const allServices = this.configDb.getAllServices();
    const targetServices =
      options.serviceIds && options.serviceIds.length > 0
        ? allServices.filter((s) => options.serviceIds!.includes(s.id))
        : allServices;

    const scope =
      options.serviceIds && options.serviceIds.length > 0 ? 'partial' : 'full';
    const exportedAt = new Date().toISOString();
    const servicesIncluded = targetServices.map((s) => s.id);

    let configsExported = 0;
    let sensitiveRedacted = 0;
    const servicesMap: Record<string, ExportServiceEntry> = {};

    for (const svc of targetServices) {
      const svcDef = this.registry.getService(svc.id);
      const cfgRows = this.configDb.getServiceConfigs(svc.id);
      const configsMap: Record<string, ConfigValue | string> = {};

      for (const cfg of cfgRows) {
        if (cfg.is_sensitive === 1 && !includeSensitive) {
          configsMap[cfg.key] = REDACTED;
          sensitiveRedacted++;
        } else {
          let value = cfg.value;
          // Decrypt if session is active and value is encrypted
          if (cfg.is_sensitive === 1 && this.crypto.isEncrypted(value)) {
            try {
              value = this.crypto.decrypt(value);
            } catch {
              value = REDACTED;
              sensitiveRedacted++;
            }
          }
          configsMap[cfg.key] = { value, dataType: cfg.data_type ?? 'string' };
        }
        configsExported++;
      }

      servicesMap[svc.id] = {
        name: svcDef.name,
        category: svcDef.category,
        enabled: svc.enabled === 1,
        configs: configsMap,
      };
    }

    let payload: ExportPayload;

    if (options.encrypted) {
      if (!options.masterPassword) {
        throw new BadRequestException(
          'masterPassword is required for encrypted exports.',
        );
      }
      const verified = await this.crypto.verifyMasterPassword(
        options.masterPassword,
      );
      if (!verified) {
        throw new BadRequestException('Invalid master password.');
      }
      const encryptedPayload = this.crypto.encrypt(JSON.stringify(servicesMap));
      payload = {
        meta: {
          version: FORMAT_VERSION,
          format: FORMAT_NAME,
          exportedAt,
          exportedBy: 'Stubrix Settings Panel',
          scope,
          servicesIncluded,
          encrypted: true,
          includeSensitive,
          checksum: '',
        },
        payload: encryptedPayload,
      };
    } else {
      payload = {
        meta: {
          version: FORMAT_VERSION,
          format: FORMAT_NAME,
          exportedAt,
          exportedBy: 'Stubrix Settings Panel',
          scope,
          servicesIncluded,
          encrypted: false,
          includeSensitive,
          checksum: '',
        },
        services: servicesMap,
      };
    }

    const rawForChecksum =
      format === 'yaml' ? yaml.dump(payload) : JSON.stringify(payload);
    payload.meta.checksum = computeChecksum(rawForChecksum);

    let content: string;
    let contentType: string;
    let ext: string;

    if (format === 'yaml') {
      content = yaml.dump(payload, { indent: 2, lineWidth: 120 });
      contentType = 'application/x-yaml';
      ext = options.encrypted ? 'enc.yaml' : 'yaml';
    } else {
      content = JSON.stringify(payload, null, 2);
      contentType = 'application/json';
      ext = options.encrypted ? 'enc.json' : 'json';
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `stubrix-config-${scope}-${dateStr}.${ext}`;

    this.logger.log(
      `Exported ${servicesIncluded.length} services, ${configsExported} configs (${sensitiveRedacted} redacted)`,
    );

    return {
      content,
      filename,
      contentType,
      servicesExported: servicesIncluded.length,
      configsExported,
      sensitiveRedacted,
    };
  }
}
