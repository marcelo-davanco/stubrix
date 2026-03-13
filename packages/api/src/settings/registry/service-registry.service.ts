import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type {
  ServiceCategory,
  ServiceDefinition,
  ServiceDefinitionSeed,
  ConfigField,
  ValidationResult,
} from '@stubrix/shared';
import { CATEGORY_LABELS } from '@stubrix/shared';
import { ConfigDatabaseService } from '../database/config-database.service';
import { SERVICE_DEFINITIONS } from './service-definitions';

/**
 * F34.02 — ServiceRegistryService
 *
 * Single source of truth for all manageable Stubrix services.
 * Seeds definitions into SQLite on first startup, manages dependency graph,
 * and provides config schema + validation.
 */
@Injectable()
export class ServiceRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ServiceRegistryService.name);
  private readonly definitionsMap = new Map<string, ServiceDefinitionSeed>();

  constructor(private readonly configDb: ConfigDatabaseService) {
    for (const def of SERVICE_DEFINITIONS) {
      this.definitionsMap.set(def.id, def);
    }
  }

  onModuleInit(): void {
    this.seedServices();
  }

  // ─── Seeding ──────────────────────────────────────────────────

  private seedServices(): void {
    const existing = this.configDb.getAllServices();
    const existingIds = new Set(existing.map((s) => s.id));

    let seeded = 0;
    let updated = 0;

    for (const def of SERVICE_DEFINITIONS) {
      if (!existingIds.has(def.id)) {
        // New service — insert with defaults
        this.configDb.upsertService({
          id: def.id,
          name: def.name,
          category: def.category,
          docker_profile: def.dockerProfile,
          docker_service: def.dockerService,
          default_port: def.defaultPort,
          external_url: def.externalUrl,
          enabled: 0,
          auto_start: 0,
          health_status: 'unknown',
          last_health_check: undefined,
        });

        // Seed default config values
        this.seedDefaultConfigs(def);
        seeded++;
      } else {
        // Existing service — update metadata only, preserve user settings
        const row = this.configDb.getService(def.id);
        if (row) {
          this.configDb.upsertService({
            id: def.id,
            name: def.name,
            category: def.category,
            docker_profile: def.dockerProfile,
            docker_service: def.dockerService,
            default_port: def.defaultPort,
            external_url: def.externalUrl,
            enabled: row.enabled,
            auto_start: Number(row.auto_start ?? 0),
            health_status: row.health_status,
            last_health_check: row.last_health_check,
          });
        }

        // Add new config fields without overwriting existing
        this.seedNewConfigFields(def);
        updated++;
      }
    }

    if (seeded > 0) {
      this.logger.log(`Seeded ${seeded} new service definitions`);
    }
    if (updated > 0) {
      this.logger.log(`Updated metadata for ${updated} existing services`);
    }
  }

  private seedDefaultConfigs(def: ServiceDefinitionSeed): void {
    for (const field of def.configSchema) {
      if (field.defaultValue !== undefined) {
        this.configDb.setConfig(
          def.id,
          field.key,
          this.serializeValue(field.defaultValue),
          {
            is_sensitive: field.sensitive ? 1 : 0,
            description: field.description ?? field.label,
            data_type: field.dataType,
          },
        );
      }
    }
  }

  private seedNewConfigFields(def: ServiceDefinitionSeed): void {
    const existingConfigs = this.configDb.getServiceConfigs(def.id);
    const existingKeys = new Set(existingConfigs.map((c) => c.key));

    for (const field of def.configSchema) {
      if (!existingKeys.has(field.key) && field.defaultValue !== undefined) {
        this.configDb.setConfig(
          def.id,
          field.key,
          this.serializeValue(field.defaultValue),
          {
            is_sensitive: field.sensitive ? 1 : 0,
            description: field.description ?? field.label,
            data_type: field.dataType,
          },
        );
      }
    }
  }

  // ─── Query ────────────────────────────────────────────────────

  getAllServices(): ServiceDefinition[] {
    const rows = this.configDb.getAllServices();
    return rows.map((row) => this.toServiceDefinition(row.id));
  }

  getService(id: string): ServiceDefinition {
    const def = this.definitionsMap.get(id);
    if (!def) {
      throw new Error(`Service "${id}" not found in registry`);
    }
    return this.toServiceDefinition(id);
  }

  getServicesByCategory(category: ServiceCategory): ServiceDefinition[] {
    return this.getAllServices().filter((s) => s.category === category);
  }

  getCategories(): {
    category: ServiceCategory;
    label: string;
    count: number;
  }[] {
    const services = this.getAllServices();
    const categoryMap = new Map<ServiceCategory, number>();

    for (const svc of services) {
      categoryMap.set(svc.category, (categoryMap.get(svc.category) ?? 0) + 1);
    }

    return Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      label: CATEGORY_LABELS[category],
      count,
    }));
  }

  // ─── Dependencies ─────────────────────────────────────────────

  getDependencies(serviceId: string): string[] {
    const def = this.definitionsMap.get(serviceId);
    if (!def) return [];
    return [...def.dependsOn];
  }

  getDependents(serviceId: string): string[] {
    const dependents: string[] = [];
    for (const def of SERVICE_DEFINITIONS) {
      if (def.dependsOn.includes(serviceId)) {
        dependents.push(def.id);
      }
    }
    return dependents;
  }

  canDisable(serviceId: string): { allowed: boolean; blockedBy: string[] } {
    const dependents = this.getDependents(serviceId);
    const enabledDependents = dependents.filter((id) => {
      const row = this.configDb.getService(id);
      return row && row.enabled === 1;
    });

    return {
      allowed: enabledDependents.length === 0,
      blockedBy: enabledDependents,
    };
  }

  // ─── Config Schema ────────────────────────────────────────────

  getConfigSchema(serviceId: string): ConfigField[] {
    const def = this.definitionsMap.get(serviceId);
    if (!def) return [];
    return [...def.configSchema];
  }

  getDefaultConfig(serviceId: string): Record<string, unknown> {
    const def = this.definitionsMap.get(serviceId);
    if (!def) return {};

    const defaults: Record<string, unknown> = {};
    for (const field of def.configSchema) {
      if (field.defaultValue !== undefined) {
        defaults[field.key] = field.defaultValue;
      }
    }
    return defaults;
  }

  validateConfig(
    serviceId: string,
    config: Record<string, unknown>,
  ): ValidationResult {
    const schema = this.getConfigSchema(serviceId);
    const errors: { field: string; message: string }[] = [];

    for (const field of schema) {
      const value = config[field.key];

      // Required check
      if (
        field.required &&
        (value === undefined || value === null || value === '')
      ) {
        errors.push({
          field: field.key,
          message: `${field.label} is required`,
        });
        continue;
      }

      if (value === undefined || value === null) continue;

      // Type checks
      if (field.dataType === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push({
            field: field.key,
            message: `${field.label} must be a number`,
          });
          continue;
        }
        if (field.validation?.min !== undefined && num < field.validation.min) {
          errors.push({
            field: field.key,
            message: `${field.label} must be at least ${field.validation.min}`,
          });
        }
        if (field.validation?.max !== undefined && num > field.validation.max) {
          errors.push({
            field: field.key,
            message: `${field.label} must be at most ${field.validation.max}`,
          });
        }
      }

      // Pattern check
      if (field.validation?.pattern && typeof value === 'string') {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          errors.push({
            field: field.key,
            message: `${field.label} does not match required format`,
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ─── Internal ─────────────────────────────────────────────────

  private serializeValue(value: unknown): string {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private toServiceDefinition(id: string): ServiceDefinition {
    const def = this.definitionsMap.get(id);
    const row = this.configDb.getService(id);

    if (!def || !row) {
      throw new Error(`Service "${id}" not found`);
    }

    return {
      id: row.id,
      name: row.name,
      category: row.category,
      dockerProfile: row.docker_profile,
      dockerService: row.docker_service,
      defaultPort: row.default_port,
      externalUrl: row.external_url,
      enabled: row.enabled === 1,
      autoStart: (row.auto_start ?? 0) === 1,
      healthStatus: row.health_status as ServiceDefinition['healthStatus'],
      lastHealthCheck: row.last_health_check,
      dependsOn: def.dependsOn,
      configSchema: def.configSchema,
    };
  }
}
