import {
  Controller,
  Post,
  Get,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { LintService } from './lint.service';
import type { LintResult } from './lint.service';

export class LintSpecDto {
  @IsString()
  content: string;
}

export class LintSpecUrlDto {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

@ApiTags('governance')
@Controller('governance')
export class LintController {
  constructor(private readonly lintService: LintService) {}

  @Post('lint')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lint an OpenAPI spec against Spectral OAS rules' })
  async lintSpec(@Body() dto: LintSpecDto): Promise<LintResult> {
    if (!dto.content) {
      throw new BadRequestException('content is required');
    }
    return this.lintService.lintSpec(dto.content);
  }

  @Post('lint/file')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Lint an OpenAPI spec file upload' })
  async lintFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<LintResult> {
    if (!file?.buffer) {
      throw new BadRequestException('No file provided');
    }
    return this.lintService.lintSpec(file.buffer.toString('utf-8'));
  }

  @Get('lint/rules')
  @ApiOperation({ summary: 'List active Spectral lint rules' })
  listRules() {
    return { rules: this.lintService.listRules() };
  }
}
