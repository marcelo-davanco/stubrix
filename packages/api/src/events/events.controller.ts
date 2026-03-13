import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';
import { EventsService } from './events.service';
import type { BrokerType } from './events.service';

export class PublishEventDto {
  @IsString()
  broker: BrokerType;

  @IsString()
  topic: string;

  payload: unknown;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  broker: BrokerType;

  @IsString()
  topic: string;

  payload: unknown;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsNumber()
  scheduleMs?: number;
}

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check Kafka and RabbitMQ availability' })
  health() {
    return this.service.healthCheck();
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish an event to Kafka or RabbitMQ' })
  publish(@Body() dto: PublishEventDto) {
    return this.service.publish(dto.broker, dto.topic, dto.payload, dto.headers);
  }

  @Get('published')
  @ApiOperation({ summary: 'List recently published events' })
  @ApiQuery({ name: 'limit', required: false })
  listPublished(@Query('limit') limit?: string) {
    return this.service.listPublished(limit ? parseInt(limit) : 50);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List event templates' })
  listTemplates() {
    return this.service.listTemplates();
  }

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an event template' })
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(
      dto.name,
      dto.broker,
      dto.topic,
      dto.payload,
      dto.headers,
      dto.scheduleMs,
    );
  }

  @Post('templates/:id/fire')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fire an event template' })
  fire(@Param('id') id: string) {
    return this.service.fireTemplate(id);
  }
}
