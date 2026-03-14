import { Controller, Get, Post, Delete, Param, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { ProtocolsService } from './protocols.service';
import type { ProtocolType } from './protocols.service';

export class CreateProtocolMockDto {
  @IsString()
  protocol: ProtocolType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  schema?: string;

  @IsOptional()
  @IsObject()
  resolvers?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  protoFile?: string;

  @IsOptional()
  @IsString()
  grpcService?: string;

  @IsOptional()
  @IsString()
  endpoint?: string;
}

export class ParseSchemaDto {
  @IsString()
  schema: string;
}

@ApiTags('protocols')
@Controller('protocols')
export class ProtocolsController {
  constructor(private readonly service: ProtocolsService) {}

  @Get('mocks')
  @ApiOperation({ summary: 'List protocol mocks (GraphQL, gRPC, REST)' })
  @ApiQuery({ name: 'protocol', required: false })
  list(@Query('protocol') protocol?: string) {
    return this.service.listMocks(protocol as ProtocolType | undefined);
  }

  @Post('mocks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a protocol mock' })
  create(@Body() dto: CreateProtocolMockDto) {
    return this.service.createMock(dto.protocol, dto.name, {
      schema: dto.schema,
      resolvers: dto.resolvers,
      protoFile: dto.protoFile,
      grpcService: dto.grpcService,
      endpoint: dto.endpoint,
    });
  }

  @Delete('mocks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a protocol mock' })
  @ApiParam({ name: 'id', description: 'Mock UUID' })
  delete(@Param('id') id: string): void {
    this.service.deleteMock(id);
  }

  @Post('graphql/parse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parse a GraphQL schema and return summary' })
  parseSchema(@Body() dto: ParseSchemaDto) {
    return this.service.parseGraphQLSchema(dto.schema);
  }

  @Get('grpc/health')
  @ApiOperation({ summary: 'Check GripMock (gRPC mock engine) availability' })
  grpcHealth() {
    return this.service.gripMockHealth();
  }
}
