import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { basename, join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { ConfigDatabaseService } from '../database/config-database.service';
import { CryptoService } from '../crypto/crypto.service';
import { ServiceRegistryService } from '../registry/service-registry.service';
import type { CreateBackupDto } from './dto/create-backup.dto';
import type { RestoreBackupDto } from './dto/restore-backup.dto';

// ─── Interfaces ───────────────────────────────────────────────

export interface BackupResult {
  id: string;
  name: string;
  filePath: string;
  fileSize: number;
  checksum: string;
  servicesIncluded: string[];
  encrypted: boolean;
  createdAt: string;
}

export interface BackupListItem {
  id: string;
  name: string;
  description?: string;
  scope: string;
  servicesIncluded: string[];
  fileSize: number;
  checksum: string;
  encrypted: boolean;
  createdAt: string;
}

export interface BackupDetail extends BackupListItem {
  filePath: string;
  version: string;
  format: string;
}

interface BackupServiceEntry {
  name: string;
  category: string;
  enabled: boolean;
  configs: Record<
    string,
    { value: string; sensitive: boolean; dataType: string }
  >;
}

export interface BackupFileContents {
  meta: {
    version: string;
    format: string;
    createdAt: string;
    scope: string;
    servicesIncluded: string[];
    encrypted: boolean;
    checksum: string;
    totalEntries: number;
  };
  services?: Record<string, BackupServiceEntry>;
  payload?: string;
}

export interface RestorePreview {
  backupId: string;
  services: {
    serviceId: string;
    serviceName: string;
    status: 'new' | 'modified' | 'unchanged';
    changes: {
      key: string;
      action: 'create' | 'update';
      oldValue?: string;
      newValue: string;
    }[];
  }[];
  totalChanges: number;
  warnings: string[];
}

export interface RestoreResult {
  backupId: string;
  autoBackupId?: string;
  servicesRestored: number;
  configsRestored: number;
  skipped: number;
  errors: string[];
}

// ─── Helpers ─────────────────────────────────────────────────

function computeBackupChecksum(content: string): string {
  return 'sha256:' + createHash('sha256').update(content).digest('hex');
}

function getBackupDir(): string {
  return resolve(process.env.BACKUP_DIR ?? 'data/backups');
}

// ─── Service ─────────────────────────────────────────────────

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly configDb: ConfigDatabaseService,
    private readonly crypto: CryptoService,
    private readonly registry: ServiceRegistryService,
  ) {}

  // ─── Create ────────────────────────────────────────────────

  async createBackup(options: CreateBackupDto): Promise<BackupResult> {
    const dir = getBackupDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const services = this.configDb.getAllServices();
    const targetServices =
      options.serviceIds && options.serviceIds.length > 0
        ? services.filter((s) => options.serviceIds!.includes(s.id))
        : services;

    const servicesMap: Record<string, BackupServiceEntry> = {};
    for (const svc of targetServices) {
      const svcDef = this.registry.getService(svc.id);
      const configs = this.configDb.getServiceConfigs(svc.id);
      const configsMap: BackupServiceEntry['configs'] = {};
      for (const cfg of configs) {
        configsMap[cfg.key] = {
          value: cfg.value,
          sensitive: cfg.is_sensitive === 1,
          dataType: cfg.data_type ?? 'string',
        };
      }
      servicesMap[svc.id] = {
        name: svcDef.name,
        category: svcDef.category,
        enabled: svc.enabled === 1,
        configs: configsMap,
      };
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const servicesIncluded = targetServices.map((s) => s.id);
    const scope =
      options.serviceIds && options.serviceIds.length > 0 ? 'partial' : 'full';
    const totalEntries = Object.values(servicesMap).reduce(
      (acc, s) => acc + Object.keys(s.configs).length,
      0,
    );

    let fileContents: BackupFileContents;

    if (options.encrypted) {
      if (!options.masterPassword) {
        throw new BadRequestException(
          'masterPassword is required for encrypted backups.',
        );
      }
      const verified = await this.crypto.verifyMasterPassword(
        options.masterPassword,
      );
      if (!verified) {
        throw new BadRequestException('Invalid master password.');
      }
      const payload = this.crypto.encrypt(JSON.stringify(servicesMap));
      const placeholder: BackupFileContents = {
        meta: {
          version: '1.0.0',
          format: 'stubrix-config-backup',
          createdAt,
          scope,
          servicesIncluded,
          encrypted: true,
          checksum: '',
          totalEntries,
        },
        payload,
      };
      const checksum = computeBackupChecksum(JSON.stringify(placeholder));
      placeholder.meta.checksum = checksum;
      fileContents = placeholder;
    } else {
      const placeholder: BackupFileContents = {
        meta: {
          version: '1.0.0',
          format: 'stubrix-config-backup',
          createdAt,
          scope,
          servicesIncluded,
          encrypted: false,
          checksum: '',
          totalEntries,
        },
        services: servicesMap,
      };
      const checksum = computeBackupChecksum(JSON.stringify(placeholder));
      placeholder.meta.checksum = checksum;
      fileContents = placeholder;
    }

    const name =
      options.name ??
      `backup-${new Date().toISOString().slice(0, 10)}-${scope}`;
    const filename = basename(`${name}-${id.slice(0, 8)}.json`);
    const filePath = join(dir, filename);

    const content = JSON.stringify(fileContents, null, 2);
    writeFileSync(filePath, content, 'utf-8');
    const fileSize = statSync(filePath).size;
    const checksum = fileContents.meta.checksum;

    this.configDb.addBackup({
      id,
      name,
      description: options.description,
      scope,
      services_included: JSON.stringify(servicesIncluded),
      file_path: filePath,
      file_size: fileSize,
      checksum,
      encrypted: options.encrypted ? 1 : 0,
      format: 'stubrix-config-backup',
      version: '1.0.0',
    });

    this.logger.log(
      `Backup created: ${name} (${servicesIncluded.length} services, ${totalEntries} configs)`,
    );

    return {
      id,
      name,
      filePath,
      fileSize,
      checksum,
      servicesIncluded,
      encrypted: options.encrypted ?? false,
      createdAt,
    };
  }

  async createAutoBackup(reason: string): Promise<BackupResult> {
    const name = `auto-${reason}-${Date.now()}`;
    return this.createBackup({ name, description: `Auto-backup: ${reason}` });
  }

  // ─── List & Get ────────────────────────────────────────────

  getBackups(): BackupListItem[] {
    return this.configDb.getAllBackups().map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description ?? undefined,
      scope: b.scope,
      servicesIncluded: this.parseServices(b.services_included),
      fileSize: b.file_size ?? 0,
      checksum: b.checksum,
      encrypted: b.encrypted === 1,
      createdAt: b.created_at ?? new Date().toISOString(),
    }));
  }

  getBackup(id: string): BackupDetail {
    const row = this.configDb.getBackup(id);
    if (!row) throw new NotFoundException(`Backup "${id}" not found.`);
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      scope: row.scope,
      servicesIncluded: this.parseServices(row.services_included),
      fileSize: row.file_size ?? 0,
      checksum: row.checksum,
      encrypted: row.encrypted === 1,
      createdAt: row.created_at ?? new Date().toISOString(),
      filePath: row.file_path,
      version: row.version,
      format: row.format,
    };
  }

  getBackupContents(id: string): BackupFileContents {
    const detail = this.getBackup(id);
    if (!existsSync(detail.filePath)) {
      throw new NotFoundException(`Backup file not found: ${detail.filePath}`);
    }
    return JSON.parse(
      readFileSync(detail.filePath, 'utf-8'),
    ) as BackupFileContents;
  }

  getBackupFilePath(id: string): string {
    return this.getBackup(id).filePath;
  }

  // ─── Preview & Restore ─────────────────────────────────────

  async previewRestore(
    id: string,
    masterPassword?: string,
  ): Promise<RestorePreview> {
    const contents = this.getBackupContents(id);
    const services = await this.resolveServices(contents, masterPassword);
    const warnings: string[] = [];
    const result: RestorePreview['services'] = [];
    let totalChanges = 0;

    for (const [serviceId, backupSvc] of Object.entries(services)) {
      const currentConfigs = this.configDb.getServiceConfigs(serviceId);
      const currentMap = new Map(currentConfigs.map((c) => [c.key, c.value]));
      const changes: RestorePreview['services'][number]['changes'] = [];

      for (const [key, entry] of Object.entries(backupSvc.configs)) {
        const currentValue = currentMap.get(key);
        if (currentValue === undefined) {
          changes.push({ key, action: 'create', newValue: entry.value });
        } else if (currentValue !== entry.value) {
          changes.push({
            key,
            action: 'update',
            oldValue: currentValue,
            newValue: entry.value,
          });
        }
      }

      const status =
        changes.length === 0
          ? 'unchanged'
          : currentConfigs.length === 0
            ? 'new'
            : 'modified';

      result.push({
        serviceId,
        serviceName: backupSvc.name,
        status,
        changes,
      });
      totalChanges += changes.length;

      if (!this.configDb.getService(serviceId)) {
        warnings.push(
          `Service "${serviceId}" from backup is not registered in this instance.`,
        );
      }
    }

    return { backupId: id, services: result, totalChanges, warnings };
  }

  async restoreBackup(
    id: string,
    options: RestoreBackupDto,
  ): Promise<RestoreResult> {
    const contents = this.getBackupContents(id);
    const services = await this.resolveServices(
      contents,
      options.masterPassword,
    );

    let autoBackupId: string | undefined;
    if (options.createAutoBackup !== false) {
      const ab = await this.createAutoBackup('pre-restore');
      autoBackupId = ab.id;
    }

    const targetServiceIds = options.serviceIds ?? Object.keys(services);
    const errors: string[] = [];
    let servicesRestored = 0;
    let configsRestored = 0;
    let skipped = 0;

    for (const serviceId of targetServiceIds) {
      const backupSvc = services[serviceId];
      if (!backupSvc) continue;

      if (!this.configDb.getService(serviceId)) {
        errors.push(`Service "${serviceId}" not found in registry — skipped.`);
        continue;
      }

      for (const [key, entry] of Object.entries(backupSvc.configs)) {
        const existing = this.configDb.getConfig(serviceId, key);

        if (options.conflictStrategy === 'skip' && existing) {
          skipped++;
          continue;
        }

        if (
          options.conflictStrategy === 'merge' &&
          existing &&
          existing.value === entry.value
        ) {
          skipped++;
          continue;
        }

        const oldValue = existing?.value;
        const checksum = this.crypto.computeChecksum(entry.value);

        this.configDb.setConfig(serviceId, key, entry.value, {
          is_sensitive: entry.sensitive ? 1 : 0,
          data_type: entry.dataType,
          checksum,
        });

        this.configDb.addHistory({
          service_id: serviceId,
          key,
          old_value: oldValue,
          new_value: entry.value,
          action: 'restore',
          source: 'restore',
        });

        configsRestored++;
      }
      servicesRestored++;
    }

    this.logger.log(
      `Restore complete: ${servicesRestored} services, ${configsRestored} configs restored, ${skipped} skipped.`,
    );

    return {
      backupId: id,
      autoBackupId,
      servicesRestored,
      configsRestored,
      skipped,
      errors,
    };
  }

  // ─── Delete & Cleanup ──────────────────────────────────────

  deleteBackup(id: string): void {
    const detail = this.getBackup(id);
    if (existsSync(detail.filePath)) {
      unlinkSync(detail.filePath);
    }
    this.configDb.deleteBackup(id);
    this.logger.log(`Backup deleted: ${id}`);
  }

  deleteOldBackups(olderThanDays: number): number {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const all = this.configDb.getAllBackups();
    let deleted = 0;

    for (const b of all) {
      if (!b.scope.startsWith('auto') && b.scope !== 'full') continue;
      const created = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (created < cutoff) {
        try {
          if (existsSync(b.file_path)) unlinkSync(b.file_path);
          this.configDb.deleteBackup(b.id);
          deleted++;
        } catch {
          this.logger.warn(`Failed to delete backup file: ${b.file_path}`);
        }
      }
    }

    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} old backup(s).`);
    }
    return deleted;
  }

  // ─── Private helpers ───────────────────────────────────────

  private parseServices(raw: string | undefined): string[] {
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  private async resolveServices(
    contents: BackupFileContents,
    masterPassword?: string,
  ): Promise<Record<string, BackupServiceEntry>> {
    const isEncrypted =
      typeof contents.payload === 'string' && contents.payload.length > 0;
    if (!isEncrypted) {
      return contents.services ?? {};
    }

    if (!masterPassword) {
      throw new BadRequestException(
        'masterPassword is required to decrypt this backup.',
      );
    }

    const verified = await this.crypto.verifyMasterPassword(masterPassword);
    if (!verified) {
      throw new BadRequestException(
        'Invalid master password for encrypted backup.',
      );
    }

    // payload is guaranteed non-empty string by the isEncrypted guard above
    const decrypted = this.crypto.decrypt(contents.payload!);
    return JSON.parse(decrypted) as Record<string, BackupServiceEntry>;
  }
}
