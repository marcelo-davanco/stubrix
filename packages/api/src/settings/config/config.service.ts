import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import type {
  ConfigField,
  ServiceCategory,
  HistoryEntry,
  ValidationResult,
} from '@stubrix/shared';
import { ConfigDatabaseService } from '../database/config-database.service';
import { ServiceRegistryService } from '../registry/service-registry.service';
import type { ConfigUpdateItem } from './dto/update-config.dto';

// ─── Response types ────────────────────────────────────────────

export interface ConfigEntryDto {
  key: string;
  value: string;
  isSensitive: boolean;
  dataType: string;
  description?: string;
  label: string;
  maskedValue?: string;
}

export interface ServiceConfigResponse {
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  configs: ConfigEntryDto[];
  schema: ConfigField[];
}

export interface EffectiveConfigValue {
  key: string;
  value: unknown;
  source: 'env' | 'database' | 'default';
  overriddenBy?: 'env';
  databaseValue?: string;
  envValue?: string;
  defaultValue?: unknown;
  isSensitive: boolean;
  dataType: string;
}

export interface EffectiveConfigResponse {
  serviceId: string;
  configs: EffectiveConfigValue[];
  overrideCount: number;
}

export interface UpdateConfigResponse {
  serviceId: string;
  updated: number;
  changes: {
    key: string;
    oldValue: string;
    newValue: string;
    historyId: number;
  }[];
  validationWarnings?: string[];
}

export interface ResetConfigResponse {
  serviceId: string;
  reset: number;
  keys: string[];
}

export interface ConfigHistoryResponse {
  serviceId: string;
  entries: HistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface RollbackResponse {
  serviceId: string;
  key: string;
  rolledBackTo: string;
  historyId: number;
}

// ─── Service ──────────────────────────────────────────────────

@Injectable()
export class SettingsConfigService {
  private readonly logger = new Logger(SettingsConfigService.name);

  constructor(
    private readonly configDb: ConfigDatabaseService,
    private readonly registry: ServiceRegistryService,
  ) {}

  getServiceConfig(serviceId: string): ServiceConfigResponse {
    const def = this.registry.getService(serviceId);
    const rows = this.configDb.getServiceConfigs(serviceId);
    const schema = this.registry.getConfigSchema(serviceId);

    const configs: ConfigEntryDto[] = rows.map((row) => {
      const field = schema.find((f) => f.key === row.key);
      const isSensitive = row.is_sensitive === 1;

      return {
        key: row.key,
        value: isSensitive ? '' : row.value,
        isSensitive,
        dataType: row.data_type ?? 'string',
        description: row.description ?? field?.description,
        label: field?.label ?? row.key,
        maskedValue: isSensitive ? '••••••••' : undefined,
      };
    });

    return {
      serviceId,
      serviceName: def.name,
      category: def.category,
      configs,
      schema,
    };
  }

  getEffectiveConfig(serviceId: string): EffectiveConfigResponse {
    this.registry.getService(serviceId); // throws if unknown
    const schema = this.registry.getConfigSchema(serviceId);
    const rows = this.configDb.getServiceConfigs(serviceId);
    const rowMap = new Map(rows.map((r) => [r.key, r]));

    let overrideCount = 0;
    const configs: EffectiveConfigValue[] = schema.map((field) => {
      const row = rowMap.get(field.key);
      const envKey = `${serviceId.toUpperCase().replace(/-/g, '_')}_${field.key}`;
      const envValue = process.env[envKey];
      const dbValue = row?.value;
      const defaultValue = field.defaultValue;

      let source: EffectiveConfigValue['source'];
      let value: unknown;
      let overriddenBy: 'env' | undefined;

      if (envValue !== undefined) {
        source = 'env';
        value = envValue;
        if (dbValue !== undefined) {
          overriddenBy = 'env';
          overrideCount++;
        }
      } else if (dbValue !== undefined) {
        source = 'database';
        value = dbValue;
      } else {
        source = 'default';
        value = defaultValue;
      }

      return {
        key: field.key,
        value,
        source,
        overriddenBy,
        databaseValue: dbValue,
        envValue,
        defaultValue,
        isSensitive: field.sensitive === true,
        dataType: field.dataType,
      };
    });

    return { serviceId, configs, overrideCount };
  }

  updateConfig(
    serviceId: string,
    updates: ConfigUpdateItem[],
  ): UpdateConfigResponse {
    this.registry.getService(serviceId); // throws if unknown
    const schema = this.registry.getConfigSchema(serviceId);
    const schemaMap = new Map(schema.map((f) => [f.key, f]));

    const errors: string[] = [];
    for (const update of updates) {
      const field = schemaMap.get(update.key);
      if (!field) {
        errors.push(`Unknown config key: "${update.key}"`);
        continue;
      }
      const validation: ValidationResult = this.registry.validateConfig(
        serviceId,
        {
          [update.key]: update.value,
        },
      );
      if (!validation.valid) {
        errors.push(
          ...validation.errors.map((e) => `${update.key}: ${e.message}`),
        );
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Config validation failed',
        errors,
      });
    }

    const changes: UpdateConfigResponse['changes'] = [];

    for (const update of updates) {
      const field = schemaMap.get(update.key)!;
      const existing = this.configDb.getConfig(serviceId, update.key);
      const oldValue = existing?.value ?? '';
      const checksum = computeChecksum(update.value);

      this.configDb.setConfig(serviceId, update.key, update.value, {
        is_sensitive: field.sensitive ? 1 : 0,
        description: field.description ?? field.label,
        data_type: field.dataType,
        checksum,
      });

      this.configDb.addHistory({
        service_id: serviceId,
        key: update.key,
        old_value: oldValue || undefined,
        new_value: update.value,
        action: existing ? 'update' : 'create',
        source: 'manual',
      });

      const history = this.configDb.getHistory(serviceId, 1);
      const historyId = (history[0] as HistoryEntry & { id?: number })?.id ?? 0;

      changes.push({
        key: update.key,
        oldValue,
        newValue: update.value,
        historyId,
      });
      this.logger.debug(`Updated config ${serviceId}.${update.key}`);
    }

    return { serviceId, updated: changes.length, changes };
  }

  resetConfig(serviceId: string, keys?: string[]): ResetConfigResponse {
    this.registry.getService(serviceId);
    const schema = this.registry.getConfigSchema(serviceId);

    const fieldsToReset =
      keys && keys.length > 0
        ? schema.filter((f) => keys.includes(f.key))
        : schema;

    const resetKeys: string[] = [];

    for (const field of fieldsToReset) {
      if (field.defaultValue === undefined) continue;
      const defaultStr =
        typeof field.defaultValue === 'object'
          ? JSON.stringify(field.defaultValue)
          : `${field.defaultValue as string | number | boolean}`;
      const existing = this.configDb.getConfig(serviceId, field.key);
      const oldValue = existing?.value ?? '';
      const checksum = computeChecksum(defaultStr);

      this.configDb.setConfig(serviceId, field.key, defaultStr, {
        is_sensitive: field.sensitive ? 1 : 0,
        description: field.description ?? field.label,
        data_type: field.dataType,
        checksum,
      });

      this.configDb.addHistory({
        service_id: serviceId,
        key: field.key,
        old_value: oldValue || undefined,
        new_value: defaultStr,
        action: 'reset',
        source: 'manual',
      });

      resetKeys.push(field.key);
    }

    this.logger.log(
      `Reset ${resetKeys.length} config(s) for service: ${serviceId}`,
    );
    return { serviceId, reset: resetKeys.length, keys: resetKeys };
  }

  getConfigHistory(
    serviceId: string,
    limit = 50,
    offset = 0,
  ): ConfigHistoryResponse {
    this.registry.getService(serviceId);
    const entries = this.configDb
      .getHistory(serviceId, limit + offset)
      .slice(offset);
    const total = this.configDb.getHistory(serviceId, 9999).length;
    return { serviceId, entries, total, limit, offset };
  }

  rollbackConfig(serviceId: string, historyId: number): RollbackResponse {
    this.registry.getService(serviceId);
    const history = this.configDb.getHistory(
      serviceId,
      9999,
    ) as (HistoryEntry & {
      id?: number;
    })[];
    const entry = history.find((h) => h.id === historyId);

    if (!entry) {
      throw new BadRequestException(
        `History entry ${historyId} not found for service "${serviceId}"`,
      );
    }

    const targetValue = entry.old_value ?? '';
    if (!targetValue) {
      throw new BadRequestException(
        `Cannot rollback: history entry has no previous value`,
      );
    }

    const current = this.configDb.getConfig(serviceId, entry.key);
    const schema = this.registry.getConfigSchema(serviceId);
    const field = schema.find((f) => f.key === entry.key);
    const checksum = computeChecksum(targetValue);

    this.configDb.setConfig(serviceId, entry.key, targetValue, {
      is_sensitive: field?.sensitive ? 1 : 0,
      description: field?.description ?? field?.label,
      data_type: field?.dataType ?? 'string',
      checksum,
    });

    this.configDb.addHistory({
      service_id: serviceId,
      key: entry.key,
      old_value: current?.value,
      new_value: targetValue,
      action: 'rollback',
      source: 'rollback',
    });

    this.logger.log(
      `Rolled back ${serviceId}.${entry.key} to history #${historyId}`,
    );
    return { serviceId, key: entry.key, rolledBackTo: targetValue, historyId };
  }
}

function computeChecksum(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
