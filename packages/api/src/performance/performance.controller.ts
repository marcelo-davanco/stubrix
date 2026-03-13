import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { PerformanceService } from './performance.service';
import type { PerformanceBaseline } from './performance.service';
import type { Response } from 'express';

export class CreateScriptDto {
  @IsString()
  name: string;

  @IsString()
  script: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  options?: { vus?: number; duration?: string; thresholds?: Record<string, string[]> };
}

export class SaveBaselineDto {
  @IsString()
  name: string;

  @IsString()
  scriptId: string;

  @IsObject()
  metrics: PerformanceBaseline['metrics'];
}

export class CompareBaselineDto {
  @IsObject()
  current: PerformanceBaseline['metrics'];
}

@ApiTags('performance')
@Controller('api/performance')
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  @Get('scripts')
  @ApiOperation({ summary: 'List k6 test scripts (built-in + custom)' })
  @ApiQuery({ name: 'builtIn', required: false })
  listScripts(@Query('builtIn') builtIn?: string) {
    return this.service.listScripts(builtIn !== 'false');
  }

  @Post('scripts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom k6 test script' })
  createScript(@Body() dto: CreateScriptDto) {
    return this.service.createScript(dto.name, dto.script, dto.options ?? {}, dto.description);
  }

  @Get('scripts/:id/export')
  @ApiOperation({ summary: 'Export a k6 script as plain JS text' })
  @ApiParam({ name: 'id' })
  exportScript(@Param('id') id: string, @Res() res: Response): void {
    const content = this.service.exportScript(id);
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Content-Disposition', `attachment; filename="${id}.js"`);
    res.send(content);
  }

  @Get('baselines')
  @ApiOperation({ summary: 'List performance baselines' })
  listBaselines() {
    return this.service.listBaselines();
  }

  @Post('baselines')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save a new performance baseline' })
  saveBaseline(@Body() dto: SaveBaselineDto) {
    return this.service.saveBaseline(dto.name, dto.scriptId, dto.metrics);
  }

  @Post('baselines/:id/compare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compare current metrics against a baseline (CI gate)' })
  @ApiParam({ name: 'id' })
  compare(@Param('id') id: string, @Body() dto: CompareBaselineDto) {
    return this.service.compareBaseline(id, dto.current);
  }
}
