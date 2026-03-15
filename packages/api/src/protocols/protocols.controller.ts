import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
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

export class SaveProtoFileDto {
  @IsString()
  name: string;

  @IsString()
  content: string;
}

export class AddGrpcStubDto {
  @IsObject()
  stub: Record<string, unknown>;
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

  // ─── Proto file management ────────────────────────────────────

  @Get('grpc/protos')
  @ApiOperation({ summary: 'List proto files in mocks/proto/' })
  listProtos() {
    return this.service.listProtoFiles();
  }

  @Get('grpc/protos/:name')
  @ApiOperation({ summary: 'Get proto file content' })
  @ApiParam({
    name: 'name',
    description: 'Proto file name (e.g. service.proto)',
  })
  getProto(@Param('name') name: string) {
    return { name, content: this.service.getProtoFile(name) };
  }

  @Put('grpc/protos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update a proto file' })
  saveProto(@Body() dto: SaveProtoFileDto) {
    return this.service.saveProtoFile(dto.name, dto.content);
  }

  @Delete('grpc/protos/:name')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a proto file' })
  @ApiParam({ name: 'name', description: 'Proto file name' })
  deleteProto(@Param('name') name: string): void {
    this.service.deleteProtoFile(name);
  }

  // ─── GripMock stub proxy ──────────────────────────────────────

  @Get('grpc/stubs')
  @ApiOperation({ summary: 'List live gRPC stubs from GripMock' })
  listStubs() {
    return this.service.listGrpcStubs();
  }

  @Post('grpc/stubs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a gRPC stub to GripMock' })
  addStub(@Body() dto: AddGrpcStubDto) {
    return this.service.addGrpcStub(dto.stub);
  }

  @Delete('grpc/stubs')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear all gRPC stubs from GripMock' })
  clearStubs() {
    return this.service.clearGrpcStubs();
  }
}
