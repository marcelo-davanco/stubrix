import { Module } from '@nestjs/common';
import { ConfigDatabaseService } from './database/config-database.service';
import { ServiceRegistryService } from './registry/service-registry.service';
import { DockerComposeService } from './lifecycle/docker-compose.service';
import { HealthCheckService } from './lifecycle/health-check.service';
import { ServiceLifecycleService } from './lifecycle/service-lifecycle.service';
import { ServiceLifecycleController } from './lifecycle/service-lifecycle.controller';
import { SettingsConfigService } from './config/config.service';
import { SettingsConfigController } from './config/config.controller';
import { CryptoService } from './crypto/crypto.service';
import { CryptoController } from './crypto/crypto.controller';
import {
  CryptoSessionGuard,
  PasswordRateLimitGuard,
} from './crypto/crypto.guard';
import { BackupService } from './backup/backup.service';
import { BackupController } from './backup/backup.controller';
import { ExportService } from './transfer/export.service';
import { ImportService } from './transfer/import.service';
import { TransferController } from './transfer/transfer.controller';
import { IntegrityService } from './security/integrity.service';
import { AuditLogService } from './security/audit-log.service';
import { AuditLogController } from './security/audit-log.controller';
import { StartupValidatorService } from './security/startup-validator.service';
import { AutoBackupInterceptor } from './security/auto-backup.interceptor';
import { ConfigVersioningService } from './security/config-versioning.service';

@Module({
  controllers: [
    ServiceLifecycleController,
    SettingsConfigController,
    CryptoController,
    BackupController,
    TransferController,
    AuditLogController,
  ],
  providers: [
    ConfigDatabaseService,
    ServiceRegistryService,
    DockerComposeService,
    HealthCheckService,
    ServiceLifecycleService,
    SettingsConfigService,
    CryptoService,
    CryptoSessionGuard,
    PasswordRateLimitGuard,
    BackupService,
    ExportService,
    ImportService,
    IntegrityService,
    AuditLogService,
    StartupValidatorService,
    AutoBackupInterceptor,
    ConfigVersioningService,
  ],
  exports: [
    ConfigDatabaseService,
    ServiceRegistryService,
    DockerComposeService,
    HealthCheckService,
    ServiceLifecycleService,
    SettingsConfigService,
    CryptoService,
    CryptoSessionGuard,
    PasswordRateLimitGuard,
    BackupService,
    ExportService,
    ImportService,
    IntegrityService,
    AuditLogService,
    ConfigVersioningService,
  ],
})
export class SettingsModule {}
