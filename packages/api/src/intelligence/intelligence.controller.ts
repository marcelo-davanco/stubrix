import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { IntelligenceService } from './intelligence.service';
import type {
  RagQueryResult,
  MockSuggestion,
  DataSuggestion,
} from './intelligence.service';

export class RagQueryDto {
  @IsString()
  question: string;
}

export class SuggestMockDto {
  @IsString()
  description: string;
}

export class SuggestDataDto {
  @IsString()
  description: string;
}

@ApiTags('intelligence')
@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly service: IntelligenceService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check OpenRAG availability' })
  health() {
    return this.service.healthCheck();
  }

  @Post('query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ask a natural language question about mocks, docs or schemas',
  })
  async query(@Body() dto: RagQueryDto): Promise<RagQueryResult> {
    return this.service.query(dto.question);
  }

  @Post('suggest/mock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a WireMock mapping from natural language description',
  })
  async suggestMock(@Body() dto: SuggestMockDto): Promise<MockSuggestion> {
    return this.service.suggestMock(dto.description);
  }

  @Post('suggest/data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate SQL seed data from natural language description',
  })
  async suggestData(@Body() dto: SuggestDataDto): Promise<DataSuggestion> {
    return this.service.suggestData(dto.description);
  }

  @Post('index')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Index all current mocks into the RAG vector store',
  })
  async index() {
    return this.service.indexMocks();
  }
}
