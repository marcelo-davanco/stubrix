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
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { CoverageService } from './coverage.service';
import type { CoverageReport } from './coverage.service';

export class AnalyzeCoverageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  specFile?: string;
}

@ApiTags('coverage')
@Controller('coverage')
export class CoverageController {
  constructor(private readonly coverageService: CoverageService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run mock coverage analysis against an OpenAPI spec',
  })
  async analyze(@Body() dto: AnalyzeCoverageDto): Promise<CoverageReport> {
    if (!dto.content) {
      throw new BadRequestException('content is required');
    }
    return this.coverageService.analyze(dto.content, dto.specFile);
  }

  @Post('analyze/file')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Run coverage analysis from uploaded OpenAPI spec file',
  })
  async analyzeFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<CoverageReport> {
    if (!file?.buffer) {
      throw new BadRequestException('No file provided');
    }
    return this.coverageService.analyze(
      file.buffer.toString('utf-8'),
      file.originalname,
    );
  }

  @Post('analyze/postman')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Run mock coverage analysis against a Postman collection',
  })
  async analyzePostman(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<CoverageReport> {
    if (!file?.buffer) {
      throw new BadRequestException('No file provided');
    }
    return this.coverageService.analyzeFromPostman(
      file.buffer.toString('utf-8'),
      file.originalname,
    );
  }

  @Post('analyze/postman-raw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run mock coverage analysis from Postman collection content',
  })
  async analyzePostmanRaw(
    @Body() dto: AnalyzeCoverageDto,
  ): Promise<CoverageReport> {
    if (!dto.content) {
      throw new BadRequestException('content is required');
    }
    return this.coverageService.analyzeFromPostman(dto.content, dto.specFile);
  }

  @Get('score')
  @ApiOperation({ summary: 'Get current mock coverage percentage' })
  @ApiQuery({
    name: 'specUrl',
    required: false,
    description: 'URL to fetch OpenAPI spec from',
  })
  async score(
    @Query('specUrl') specUrl?: string,
  ): Promise<{ coverage: number; summary: string }> {
    if (!specUrl) {
      return { coverage: 0, summary: 'No spec provided — pass ?specUrl=<url>' };
    }

    try {
      const parsedUrl = new URL(specUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new BadRequestException(
          `URL scheme not allowed: ${parsedUrl.protocol}`,
        );
      }
      const hostname = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, '');
      if (
        hostname === 'localhost' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        /^127\./.test(hostname) ||
        /^10\./.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
        /^192\.168\./.test(hostname) ||
        /^169\.254\./.test(hostname) ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.local')
      ) {
        throw new BadRequestException(`URL hostname not allowed: ${hostname}`);
      }
      // codeql[js/request-forgery] - hostname validated against private/loopback ranges above
      const res = await fetch(parsedUrl.href);
      const content = await res.text();
      const report = await this.coverageService.analyze(content);
      return {
        coverage: report.coveragePercent,
        summary: `${report.coveredEndpoints}/${report.totalEndpoints} endpoints covered`,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        `Failed to fetch spec: ${(err as Error).message}`,
      );
    }
  }

  @Get('missing')
  @ApiOperation({ summary: 'List uncovered spec endpoints' })
  @ApiQuery({ name: 'specContent', required: false })
  async missing(
    @Query('specContent') specContent?: string,
  ): Promise<{ missing: CoverageReport['entries'] }> {
    if (!specContent) {
      return { missing: [] };
    }
    const report = await this.coverageService.analyze(specContent);
    return { missing: report.entries.filter((e) => e.status !== 'covered') };
  }

  @Post('report/text')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a text coverage report' })
  async textReport(
    @Body() dto: AnalyzeCoverageDto,
  ): Promise<{ report: string }> {
    const coverage = await this.coverageService.analyze(
      dto.content,
      dto.specFile,
    );
    return { report: this.coverageService.generateTextReport(coverage) };
  }
}
