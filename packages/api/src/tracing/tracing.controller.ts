import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TracingService } from './tracing.service';

@ApiTags('tracing')
@Controller('api/tracing')
export class TracingController {
  constructor(private readonly service: TracingService) {}

  @Get('traces')
  @ApiOperation({ summary: 'List recent distributed traces' })
  @ApiQuery({ name: 'service', required: false })
  @ApiQuery({ name: 'limit', required: false })
  list(@Query('service') service?: string, @Query('limit') limit?: string) {
    return this.service.listTraces(service, limit ? parseInt(limit) : 20);
  }

  @Get('traces/:traceId')
  @ApiOperation({ summary: 'Get a trace by ID' })
  @ApiParam({ name: 'traceId' })
  get(@Param('traceId') traceId: string) {
    return this.service.getTrace(traceId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check Jaeger availability' })
  health() {
    return this.service.jaegerHealth();
  }

  @Get('config')
  @ApiOperation({ summary: 'Get OpenTelemetry configuration' })
  config() {
    return this.service.getOtelConfig();
  }
}
