import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { existsSync, createReadStream } from 'fs';
import { BackupService } from './backup.service';
import { CreateBackupDto } from './dto/create-backup.dto';
import { RestoreBackupDto } from './dto/restore-backup.dto';

@ApiTags('settings')
@Controller('settings/backups')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post()
  @ApiOperation({ summary: 'Create a configuration backup' })
  @HttpCode(HttpStatus.CREATED)
  createBackup(@Body() dto: CreateBackupDto) {
    return this.backupService.createBackup(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all backups' })
  listBackups() {
    return this.backupService.getBackups();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get backup details' })
  getBackup(@Param('id') id: string) {
    return this.backupService.getBackup(id);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Preview restore changes' })
  @ApiQuery({ name: 'masterPassword', required: false, type: String })
  previewRestore(
    @Param('id') id: string,
    @Query('masterPassword') masterPassword?: string,
  ) {
    return this.backupService.previewRestore(id, masterPassword);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore from backup' })
  @HttpCode(HttpStatus.OK)
  restoreBackup(@Param('id') id: string, @Body() dto: RestoreBackupDto) {
    return this.backupService.restoreBackup(id, dto);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download backup file' })
  downloadBackup(@Param('id') id: string, @Res() res: Response): void {
    const filePath = this.backupService.getBackupFilePath(id);
    if (!existsSync(filePath)) {
      throw new NotFoundException(`Backup file not found.`);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="backup-${id}.json"`,
    );
    createReadStream(filePath).pipe(res);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a backup' })
  @HttpCode(HttpStatus.OK)
  deleteBackup(@Param('id') id: string): { message: string } {
    this.backupService.deleteBackup(id);
    return { message: `Backup "${id}" deleted.` };
  }
}
