import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { UniversalImportService } from './universal-import.service';
import type { ImportPreview, ImportResult } from '@stubrix/shared';

export class ImportFromUrlDto {
  @IsString()
  url: string;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsBoolean()
  deduplicate?: boolean;

  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filterMethods?: string[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  filterStatusCodes?: number[];
}

export class ImportFromContentDto {
  @IsString()
  content: string;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsBoolean()
  deduplicate?: boolean;

  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filterMethods?: string[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  filterStatusCodes?: number[];
}

export class PreviewFromContentDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;
}

@ApiTags('import')
@Controller('import')
export class UniversalImportController {
  constructor(private readonly service: UniversalImportService) {}

  @Post('file')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import mocks from uploaded file (HAR/Postman/OpenAPI)' })
  @ApiResponse({ status: 200, description: 'Imported successfully' })
  async importFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId') projectId: string,
    @Body('deduplicate') deduplicate?: string,
    @Body('overwrite') overwrite?: string,
    @Body('baseUrl') baseUrl?: string,
  ): Promise<ImportResult> {
    if (!file?.buffer) {
      throw new BadRequestException('No file provided');
    }
    if (!projectId) {
      throw new BadRequestException('projectId is required');
    }

    const content = file.buffer.toString('utf-8');
    return this.service.importContent(content, {
      projectId,
      deduplicate: deduplicate !== 'false',
      overwrite: overwrite === 'true',
    }, file.originalname);
  }

  @Post('url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import mocks from URL (e.g., OpenAPI spec URL)' })
  @ApiResponse({ status: 200, description: 'Imported successfully' })
  async importUrl(@Body() dto: ImportFromUrlDto): Promise<ImportResult> {
    return this.service.importFromUrl(dto.url, {
      projectId: dto.projectId,
      deduplicate: dto.deduplicate ?? true,
      overwrite: dto.overwrite ?? false,
      filterMethods: dto.filterMethods,
      filterStatusCodes: dto.filterStatusCodes,
    });
  }

  @Post('content')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import mocks from raw content (HAR/Postman/OpenAPI JSON/YAML)' })
  @ApiResponse({ status: 200, description: 'Imported successfully' })
  async importContent(@Body() dto: ImportFromContentDto): Promise<ImportResult> {
    return this.service.importContent(dto.content, {
      projectId: dto.projectId,
      deduplicate: dto.deduplicate ?? true,
      overwrite: dto.overwrite ?? false,
      filterMethods: dto.filterMethods,
      filterStatusCodes: dto.filterStatusCodes,
    }, dto.filename);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview what would be imported without creating any mocks' })
  @ApiResponse({ status: 200, description: 'Preview generated' })
  preview(@Body() dto: PreviewFromContentDto): ImportPreview {
    return this.service.preview(dto.content, dto.filename, dto.baseUrl);
  }

  @Post('preview/file')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Preview import from uploaded file' })
  previewFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('baseUrl') baseUrl?: string,
  ): ImportPreview {
    if (!file?.buffer) {
      throw new BadRequestException('No file provided');
    }
    const content = file.buffer.toString('utf-8');
    return this.service.preview(content, file.originalname, baseUrl);
  }

  @Post('formats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List supported import formats' })
  formats() {
    return {
      formats: [
        { id: 'har', name: 'HAR (HTTP Archive)', extensions: ['.har', '.json'], versions: ['1.2'] },
        { id: 'postman', name: 'Postman Collection', extensions: ['.json'], versions: ['2.1'] },
        { id: 'openapi', name: 'OpenAPI', extensions: ['.json', '.yaml', '.yml'], versions: ['3.0', '3.1'] },
        { id: 'swagger', name: 'Swagger', extensions: ['.json', '.yaml', '.yml'], versions: ['2.0'] },
      ],
    };
  }
}
