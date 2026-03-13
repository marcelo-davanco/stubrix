import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Headers,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';
import { WebhooksService } from './webhooks.service';
import type { WebhookEvent, WebhookSimulation } from './webhooks.service';
import type { Request } from 'express';

export class CreateSimulationDto {
  @IsString()
  name: string;

  @IsString()
  targetUrl: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  payload?: unknown;

  @IsOptional()
  @IsNumber()
  scheduleMs?: number;
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post('receive/*endpoint')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive and store an incoming webhook event' })
  @ApiParam({ name: 'endpoint', description: 'Endpoint path (wildcarded)' })
  receive(
    @Param('endpoint') endpoint: string,
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
    @Body() body: unknown,
    @Query('secret') secret?: string,
  ): WebhookEvent {
    return this.service.receiveWebhook(
      `/${endpoint}`,
      req.method,
      headers,
      body,
      secret,
    );
  }

  @Get('events')
  @ApiOperation({ summary: 'List received webhook events' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'endpoint', required: false })
  list(
    @Query('limit') limit?: string,
    @Query('endpoint') endpoint?: string,
  ): WebhookEvent[] {
    return this.service.listEvents(limit ? parseInt(limit) : 50, endpoint);
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'Get a webhook event by ID' })
  getEvent(@Param('id') id: string) {
    return this.service.getEvent(id);
  }

  @Post('events/:id/replay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replay a webhook event to its original endpoint' })
  @ApiQuery({ name: 'targetUrl', required: false })
  replay(@Param('id') id: string, @Query('targetUrl') targetUrl?: string) {
    return this.service.replayEvent(id, targetUrl);
  }

  @Delete('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear all stored webhook events' })
  clear(): void {
    this.service.clearEvents();
  }

  @Get('simulations')
  @ApiOperation({ summary: 'List webhook simulations' })
  listSims(): WebhookSimulation[] {
    return this.service.listSimulations();
  }

  @Post('simulations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a fake webhook simulation' })
  createSim(@Body() dto: CreateSimulationDto): WebhookSimulation {
    return this.service.createSimulation(
      dto.name,
      dto.targetUrl,
      dto.method ?? 'POST',
      dto.headers ?? {},
      dto.payload ?? {},
      dto.scheduleMs,
    );
  }

  @Post('simulations/:id/fire')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fire a webhook simulation to its target URL' })
  fireSim(@Param('id') id: string) {
    return this.service.fireSimulation(id);
  }
}
