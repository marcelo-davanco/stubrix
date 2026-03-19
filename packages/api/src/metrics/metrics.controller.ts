import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly service: MetricsService) {}

  @Get('prometheus')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({
    summary: 'Prometheus scrape endpoint — /metrics compatible format',
  })
  prometheus(): string {
    return this.service.getPrometheusText();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get metrics summary (counters, histograms)' })
  summary() {
    return this.service.getMetricsSummary();
  }

  @Get('health')
  @ApiOperation({ summary: 'Detailed health check — all services + latencies' })
  health() {
    return this.service.getHealthStatus();
  }
}
