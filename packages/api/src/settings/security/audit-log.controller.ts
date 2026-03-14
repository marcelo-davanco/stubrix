import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import type { AuditLogResponse, AuditStats } from './audit-log.service';
import { IntegrityService } from './integrity.service';
import type { IntegrityReport, RepairReport } from './integrity.service';

class AuditLogQueryDto {
  limit?: number;
  offset?: number;
  serviceId?: string;
  action?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

@ApiTags('settings')
@Controller('settings')
export class AuditLogController {
  constructor(
    private readonly auditLog: AuditLogService,
    private readonly integrity: IntegrityService,
  ) {}

  @Get('audit-log')
  @ApiOperation({ summary: 'Get configuration audit log' })
  getAuditLog(@Query() options: AuditLogQueryDto): AuditLogResponse {
    return this.auditLog.getAuditLog({
      limit: options.limit ? Number(options.limit) : undefined,
      offset: options.offset ? Number(options.offset) : undefined,
      serviceId: options.serviceId,
      action: options.action,
      source: options.source,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      search: options.search,
    });
  }

  @Get('audit-log/stats')
  @ApiOperation({ summary: 'Get audit log statistics' })
  getAuditStats(): AuditStats {
    return this.auditLog.getAuditStats();
  }

  @Get('integrity-check')
  @ApiOperation({ summary: 'Run integrity verification on all configs' })
  checkIntegrity(): IntegrityReport {
    return this.integrity.verifyAll();
  }

  @Post('integrity-check/repair')
  @ApiOperation({ summary: 'Repair corrupted checksums' })
  repairIntegrity(): RepairReport {
    return this.integrity.repairChecksums();
  }
}
