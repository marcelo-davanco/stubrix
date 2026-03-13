import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IntegrityService } from './integrity.service';
import { ConfigDatabaseService } from '../database/config-database.service';
import { ServiceRegistryService } from '../registry/service-registry.service';

@Injectable()
export class StartupValidatorService implements OnModuleInit {
  private readonly logger = new Logger(StartupValidatorService.name);

  constructor(
    private readonly integrity: IntegrityService,
    private readonly configDb: ConfigDatabaseService,
    private readonly registry: ServiceRegistryService,
  ) {}

  onModuleInit(): void {
    this.logger.log('Running startup config validation...');

    const report = this.integrity.verifyAll();
    if (!report.healthy) {
      this.logger.warn(
        `Config integrity issues found: ${report.corrupted.length} corrupted, ${report.missing.length} missing checksums`,
      );
      const repair = this.integrity.repairChecksums();
      this.logger.log(`Auto-repaired ${repair.repaired} checksums`);
    } else {
      this.logger.log(
        `Integrity check passed: ${report.verified} entries verified`,
      );
    }

    this.cleanupOrphanedConfigs();

    const stats = this.configDb.getDbStats();
    this.logger.log(
      `Config DB ready: ${stats.totalRows} entries, ${stats.size} bytes`,
    );
  }

  private cleanupOrphanedConfigs(): void {
    const registeredIds = new Set(
      this.registry.getAllServices().map((s) => s.id),
    );
    const storedServices = this.configDb.getAllServices();

    for (const svc of storedServices) {
      if (!registeredIds.has(svc.id)) {
        const configs = this.configDb.getServiceConfigs(svc.id);
        if (configs.length > 0) {
          this.logger.warn(
            `Orphaned config entries for removed service "${svc.id}" (${configs.length} keys) — skipping auto-delete`,
          );
        }
      }
    }
  }
}
