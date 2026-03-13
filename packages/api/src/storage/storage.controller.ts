import { Controller, Get, Post, Body, HttpCode, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { StorageService } from './storage.service';

export class UploadMockBodyDto {
  @IsString()
  filename: string;

  @IsString()
  content: string;
}

export class ArchiveSnapshotDto {
  @IsString()
  snapshotPath: string;

  @IsString()
  projectId: string;
}

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly service: StorageService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check MinIO availability' })
  health() {
    return this.service.health();
  }

  @Get('config')
  @ApiOperation({ summary: 'Get MinIO storage configuration' })
  config() {
    return this.service.getConfig();
  }

  @Post('mock-bodies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a large mock response body to MinIO' })
  uploadBody(@Body() dto: UploadMockBodyDto) {
    return this.service.uploadMockBody(dto.filename, dto.content);
  }

  @Post('snapshots/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a database snapshot to MinIO' })
  archive(@Body() dto: ArchiveSnapshotDto) {
    return this.service.archiveSnapshot(dto.snapshotPath, dto.projectId);
  }

  @Get('url/:bucket/*key')
  @ApiOperation({ summary: 'Get public URL for a stored object' })
  @ApiParam({ name: 'bucket' })
  @ApiParam({ name: 'key' })
  getUrl(@Param('bucket') bucket: string, @Param('key') key: string) {
    return { url: this.service.getPublicUrl(bucket, key) };
  }
}
