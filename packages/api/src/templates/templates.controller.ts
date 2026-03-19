import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';
import { TemplatesService } from './templates.service';
import type { TemplateVariable } from './templates.service';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsArray()
  variables: TemplateVariable[];

  @IsArray()
  mocks: Array<{ filename: string; content: string }>;
}

export class ApplyTemplateDto {
  @IsObject()
  variables: Record<string, string>;

  @IsOptional()
  @IsString()
  outputDir?: string;
}

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(
    private readonly service: TemplatesService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all environment templates (built-in + custom)',
  })
  @ApiQuery({
    name: 'builtIn',
    required: false,
    description: 'Include built-in templates (default true)',
  })
  list(@Query('builtIn') builtIn?: string) {
    const include = builtIn !== 'false';
    return this.service.listTemplates(include);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  get(@Param('id') id: string) {
    return this.service.getTemplate(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom environment template' })
  create(@Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(
      dto.name,
      dto.mocks,
      dto.variables,
      dto.description,
      dto.tags,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom template' })
  delete(@Param('id') id: string): void {
    this.service.deleteTemplate(id);
  }

  @Post(':id/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a template to generate mock files' })
  apply(@Param('id') id: string, @Body() dto: ApplyTemplateDto) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ??
      path.join(process.cwd(), '../../mocks');
    const outputDir = dto.outputDir ?? path.join(mocksDir, 'mappings');
    return this.service.applyTemplate(id, dto.variables, outputDir);
  }
}
