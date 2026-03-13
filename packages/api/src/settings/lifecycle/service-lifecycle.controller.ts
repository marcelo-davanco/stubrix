import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServiceLifecycleService } from './service-lifecycle.service';
import { HealthCheckService } from './health-check.service';
import { DockerComposeService } from './docker-compose.service';
import { EnableServiceDto, DisableServiceDto } from '../dto/enable-service.dto';

@ApiTags('settings')
@Controller('settings/services')
export class ServiceLifecycleController {
  constructor(
    private readonly lifecycle: ServiceLifecycleService,
    private readonly health: HealthCheckService,
    private readonly docker: DockerComposeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all services with status' })
  getAllServices() {
    return this.lifecycle.getAllStatuses();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service details and status' })
  getService(@Param('id') id: string) {
    return this.lifecycle.getServiceStatus(id);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: 'Enable and start a service' })
  enableService(@Param('id') id: string, @Body() dto: EnableServiceDto) {
    return this.lifecycle.enableService(id, dto);
  }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Disable and stop a service' })
  disableService(@Param('id') id: string, @Body() dto: DisableServiceDto) {
    return this.lifecycle.disableService(id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update service settings (autoStart)' })
  updateService(@Param('id') id: string, @Body() dto: { autoStart?: boolean }) {
    return this.lifecycle.updateServiceSettings(id, dto);
  }

  @Post(':id/restart')
  @ApiOperation({ summary: 'Restart a service container' })
  restartService(@Param('id') id: string) {
    return this.lifecycle.restartService(id);
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Check service health' })
  checkHealth(@Param('id') id: string) {
    return this.health.checkHealth(id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get recent container logs' })
  async getLogs(@Param('id') id: string, @Query('tail') tail?: string) {
    const tailNum = tail ? parseInt(tail, 10) : 100;
    const logs = await this.docker.getContainerLogs(id, tailNum);
    return { logs };
  }
}
