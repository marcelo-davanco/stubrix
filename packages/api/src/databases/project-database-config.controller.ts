import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ProjectDatabaseConfigService } from './project-database-config.service';
import { UpsertProjectDatabaseDto } from './dto/upsert-project-database.dto';
import { DriverRegistryService } from './drivers/driver-registry.service';

@Controller('projects/:projectId/databases/configs')
export class ProjectDatabaseConfigController {
  constructor(private readonly configs: ProjectDatabaseConfigService, private readonly driverRegistry: DriverRegistryService) {}

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.configs.list(projectId);
  }

  @Get(':id')
  get(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.configs.get(projectId, id);
  }

  @Post()
  upsert(
    @Param('projectId') projectId: string,
    @Body() dto: UpsertProjectDatabaseDto,
  ) {
    return this.configs.upsert(projectId, dto);
  }

  @Delete(':id')
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    this.configs.remove(projectId, id);
    return { message: 'Database config removed' };
  }

  @Get(':id/test')
  async testConnection(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    const config = this.configs.get(projectId, id);
    const driver = this.driverRegistry.get(config.engine);
    if (!driver) {
      return { ok: false, message: `No driver found for engine '${config.engine}'` };
    }
    try {
      const healthy = await driver.healthCheck();
      return { ok: healthy, message: healthy ? 'Connection successful' : 'Connection failed' };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}
