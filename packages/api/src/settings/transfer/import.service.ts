import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { ConfigDatabaseService } from '../database/config-database.service';
import { CryptoService } from '../crypto/crypto.service';
import { ServiceRegistryService } from '../registry/service-registry.service';
import { BackupService } from '../backup/backup.service';
import type { ImportConfigDto } from './dto/import-config.dto';
import type { ExportPayload, ConfigValue } from './export.service';

const REDACTED = '[REDACTED]';
const SUPPORTED_FORMATS = ['stubrix-config-export', 'stubrix-config-backup'];

// ─── Interfaces ───────────────────────────────────────────────

export interface ParsedServiceConfig {
  name: string;
  category: string;
  enabled: boolean;
  configs: Record<string, ConfigValue | string>;
}

export interface ParsedImport {
  meta: ExportPayload['meta'];
  services: Record<string, ParsedServiceConfig>;
  validationErrors: string[];
  warnings: string[];
}

export interface ImportPreview {
  services: {
    serviceId: string;
    serviceName: string;
    status: 'new' | 'modified' | 'unchanged' | 'unknown-service';
    changes: {
      key: string;
      action: 'create' | 'update' | 'skip';
      currentValue?: string;
      importedValue: string;
      reason?: string;
    }[];
  }[];
  totalChanges: number;
  totalSkipped: number;
  warnings: string[];
  errors: string[];
}

export interface ImportResult {
  autoBackupId?: string;
  servicesImported: number;
  configsCreated: number;
  configsUpdated: number;
  configsSkipped: number;
  errors: { serviceId: string; key: string; error: string }[];
}

// ─── Service ─────────────────────────────────────────────────

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly configDb: ConfigDatabaseService,
    private readonly crypto: CryptoService,
    private readonly registry: ServiceRegistryService,
    private readonly backup: BackupService,
  ) {}

  // ─── Parse ───────────────────────────────────────────────────

  async parseImportFile(
    content: string,
    password?: string,
  ): Promise<ParsedImport> {
    let payload: ExportPayload;

    // Auto-detect format
    const trimmed = content.trimStart();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      payload = JSON.parse(content) as ExportPayload;
    } else {
      payload = yaml.load(content) as ExportPayload;
    }

    const validationErrors: string[] = [];
    const warnings: string[] = [];

    // Validate meta
    if (!payload?.meta) {
      throw new BadRequestException('Invalid import file: missing meta block.');
    }
    if (!SUPPORTED_FORMATS.includes(payload.meta.format)) {
      throw new BadRequestException(
        `Unsupported format: "${payload.meta.format}". Expected one of: ${SUPPORTED_FORMATS.join(', ')}`,
      );
    }

    // Decrypt if needed
    let services: Record<string, ParsedServiceConfig>;
    if (payload.meta.encrypted === true) {
      if (!password) {
        throw new BadRequestException(
          'masterPassword is required to decrypt this file.',
        );
      }
      const verified = await this.crypto.verifyMasterPassword(password);
      if (!verified) {
        throw new BadRequestException('Invalid master password.');
      }
      if (!payload.payload) {
        throw new BadRequestException('Encrypted file has no payload.');
      }
      const decrypted = this.crypto.decrypt(payload.payload);
      services = JSON.parse(decrypted) as Record<string, ParsedServiceConfig>;
    } else {
      services = (payload.services ?? {}) as Record<
        string,
        ParsedServiceConfig
      >;
    }

    // Validate each service's configs against registry schema
    for (const [serviceId, svc] of Object.entries(services)) {
      let schema: import('@stubrix/shared').ConfigField[];
      try {
        schema = this.registry.getConfigSchema(serviceId);
      } catch {
        warnings.push(
          `Service "${serviceId}" is not registered in this instance — will be skipped.`,
        );
        continue;
      }

      const schemaKeys = new Set(schema.map((f) => f.key));
      for (const [key, entry] of Object.entries(svc.configs)) {
        const value = typeof entry === 'string' ? entry : entry.value;
        if (value === REDACTED) continue;

        if (!schemaKeys.has(key)) {
          warnings.push(
            `[${serviceId}] Unknown config key: "${key}" — will be skipped.`,
          );
          continue;
        }

        const validation = this.registry.validateConfig(serviceId, {
          [key]: value,
        });
        if (!validation.valid) {
          const msgs = validation.errors.map((e) => e.message).join(', ');
          validationErrors.push(`[${serviceId}] ${key}: ${msgs}`);
        }
      }
    }

    return {
      meta: payload.meta,
      services,
      validationErrors,
      warnings,
    };
  }

  // ─── Preview ─────────────────────────────────────────────────

  previewImport(
    parsed: ParsedImport,
    options: Pick<ImportConfigDto, 'serviceIds' | 'conflictStrategy'>,
  ): ImportPreview {
    const targetIds = options.serviceIds ?? Object.keys(parsed.services);
    const result: ImportPreview['services'] = [];
    let totalChanges = 0;
    let totalSkipped = 0;

    for (const serviceId of targetIds) {
      const importSvc = parsed.services[serviceId];
      if (!importSvc) continue;

      let isRegistered = true;
      try {
        this.registry.getService(serviceId);
      } catch {
        isRegistered = false;
      }

      if (!isRegistered) {
        result.push({
          serviceId,
          serviceName: importSvc.name,
          status: 'unknown-service',
          changes: [],
        });
        continue;
      }

      const schema = this.registry.getConfigSchema(serviceId);
      const schemaKeys = new Set(schema.map((f) => f.key));
      const currentCfgs = this.configDb.getServiceConfigs(serviceId);
      const currentMap = new Map(currentCfgs.map((c) => [c.key, c.value]));

      const changes: ImportPreview['services'][number]['changes'] = [];

      for (const [key, entry] of Object.entries(importSvc.configs)) {
        const importedValue = typeof entry === 'string' ? entry : entry.value;

        if (importedValue === REDACTED) {
          changes.push({
            key,
            action: 'skip',
            importedValue: REDACTED,
            reason: 'skipped: sensitive value redacted',
          });
          totalSkipped++;
          continue;
        }

        if (!schemaKeys.has(key)) {
          changes.push({
            key,
            action: 'skip',
            importedValue,
            reason: 'skipped: unknown key',
          });
          totalSkipped++;
          continue;
        }

        const currentValue = currentMap.get(key);

        if (options.conflictStrategy === 'skip' && currentValue !== undefined) {
          changes.push({
            key,
            action: 'skip',
            currentValue,
            importedValue,
            reason: 'skipped: key already exists (skip strategy)',
          });
          totalSkipped++;
          continue;
        }

        if (currentValue === undefined) {
          changes.push({ key, action: 'create', importedValue });
          totalChanges++;
        } else if (currentValue !== importedValue) {
          changes.push({
            key,
            action: 'update',
            currentValue,
            importedValue,
          });
          totalChanges++;
        } else {
          changes.push({
            key,
            action: 'skip',
            currentValue,
            importedValue,
            reason: 'unchanged',
          });
          totalSkipped++;
        }
      }

      const hasChanges = changes.some((c) => c.action !== 'skip');
      const status =
        currentCfgs.length === 0
          ? 'new'
          : hasChanges
            ? 'modified'
            : 'unchanged';

      result.push({ serviceId, serviceName: importSvc.name, status, changes });
    }

    return {
      services: result,
      totalChanges,
      totalSkipped,
      warnings: parsed.warnings,
      errors: parsed.validationErrors,
    };
  }

  // ─── Apply ───────────────────────────────────────────────────

  async applyImport(
    parsed: ParsedImport,
    options: ImportConfigDto,
  ): Promise<ImportResult> {
    let autoBackupId: string | undefined;
    if (options.createAutoBackup !== false) {
      const ab = await this.backup.createAutoBackup('pre-import');
      autoBackupId = ab.id;
    }

    const targetIds = options.serviceIds ?? Object.keys(parsed.services);
    const errors: ImportResult['errors'] = [];
    let servicesImported = 0;
    let configsCreated = 0;
    let configsUpdated = 0;
    let configsSkipped = 0;

    for (const serviceId of targetIds) {
      const importSvc = parsed.services[serviceId];
      if (!importSvc) continue;

      try {
        this.registry.getService(serviceId);
      } catch {
        errors.push({
          serviceId,
          key: '*',
          error: `Service "${serviceId}" not registered — skipped.`,
        });
        continue;
      }

      const schema = this.registry.getConfigSchema(serviceId);
      const schemaMap = new Map(schema.map((f) => [f.key, f]));
      const currentCfgs = this.configDb.getServiceConfigs(serviceId);
      const currentMap = new Map(currentCfgs.map((c) => [c.key, c.value]));

      for (const [key, entry] of Object.entries(importSvc.configs)) {
        const importedValue = typeof entry === 'string' ? entry : entry.value;

        if (importedValue === REDACTED) {
          configsSkipped++;
          continue;
        }

        if (!schemaMap.has(key)) {
          configsSkipped++;
          continue;
        }

        const existing = currentMap.get(key);

        if (options.conflictStrategy === 'skip' && existing !== undefined) {
          configsSkipped++;
          continue;
        }

        if (
          options.conflictStrategy === 'merge' &&
          existing !== undefined &&
          existing === importedValue
        ) {
          configsSkipped++;
          continue;
        }

        const field = schemaMap.get(key)!;
        const checksum = this.crypto.computeChecksum(importedValue);

        try {
          this.configDb.setConfig(serviceId, key, importedValue, {
            is_sensitive: field.sensitive ? 1 : 0,
            data_type: field.dataType,
            description: field.description ?? field.label,
            checksum,
          });

          this.configDb.addHistory({
            service_id: serviceId,
            key,
            old_value: existing,
            new_value: importedValue,
            action: existing !== undefined ? 'update' : 'create',
            source: 'import',
          });

          if (existing !== undefined) {
            configsUpdated++;
          } else {
            configsCreated++;
          }
        } catch (err) {
          errors.push({
            serviceId,
            key,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      servicesImported++;
    }

    this.logger.log(
      `Import complete: ${servicesImported} services, ${configsCreated} created, ${configsUpdated} updated, ${configsSkipped} skipped.`,
    );

    return {
      autoBackupId,
      servicesImported,
      configsCreated,
      configsUpdated,
      configsSkipped,
      errors,
    };
  }
}
