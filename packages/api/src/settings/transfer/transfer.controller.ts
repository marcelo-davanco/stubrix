import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { ImportService } from './import.service';
import { ExportConfigDto } from './dto/export-config.dto';
import { ImportConfigDto } from './dto/import-config.dto';

@ApiTags('settings')
@Controller('settings')
export class TransferController {
  constructor(
    private readonly exportService: ExportService,
    private readonly importService: ImportService,
  ) {}

  @Post('export')
  @ApiOperation({ summary: 'Export service configurations' })
  @HttpCode(HttpStatus.OK)
  async exportConfigs(
    @Body() dto: ExportConfigDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.exportService.exportConfigs(dto);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader('Content-Type', result.contentType);
    res.send(result.content);
  }

  @Post('import/preview')
  @ApiOperation({ summary: 'Preview import changes before applying' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        conflictStrategy: {
          type: 'string',
          enum: ['skip', 'overwrite', 'merge'],
        },
        masterPassword: { type: 'string' },
        serviceIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async previewImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportConfigDto,
  ) {
    const content = file.buffer.toString('utf-8');
    const parsed = await this.importService.parseImportFile(
      content,
      dto.masterPassword,
    );
    return this.importService.previewImport(parsed, dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Apply imported configuration' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        conflictStrategy: {
          type: 'string',
          enum: ['skip', 'overwrite', 'merge'],
        },
        masterPassword: { type: 'string' },
        serviceIds: { type: 'array', items: { type: 'string' } },
        createAutoBackup: { type: 'boolean' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async applyImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportConfigDto,
  ) {
    const content = file.buffer.toString('utf-8');
    const parsed = await this.importService.parseImportFile(
      content,
      dto.masterPassword,
    );
    return this.importService.applyImport(parsed, dto);
  }
}
