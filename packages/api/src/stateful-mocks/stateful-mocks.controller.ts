import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StatefulMocksService } from './stateful-mocks.service';
import { CreateStatefulMockDto } from './dto/create-stateful-mock.dto';
import { UpdateStatefulMockDto } from './dto/update-stateful-mock.dto';
import type { ProxyRequest } from './wiremock-transformer-proxy.service';

@ApiTags('stateful-mocks')
@Controller('stateful/mocks')
export class StatefulMocksController {
  constructor(private readonly service: StatefulMocksService) {}

  @Get()
  @ApiOperation({ summary: 'List all stateful mocks' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stateful mock by ID' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a stateful mock' })
  @ApiResponse({ status: 201, description: 'Created' })
  create(@Body() dto: CreateStatefulMockDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a stateful mock' })
  update(@Param('id') id: string, @Body() dto: UpdateStatefulMockDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a stateful mock' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test mock against current DB state' })
  test(@Param('id') id: string, @Body() request?: ProxyRequest) {
    return this.service.test(id, request);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Preview rendered response with sample context' })
  preview(@Param('id') id: string) {
    return this.service.preview(id);
  }
}
