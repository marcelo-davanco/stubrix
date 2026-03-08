import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { DbEnginesService } from './db-engines.service';

@Controller('db')
export class DbEnginesController {
  constructor(private readonly enginesService: DbEnginesService) {}

  @Get('engines')
  async listEngines() {
    return this.enginesService.listEngines();
  }

  @Get('databases')
  async listDatabases(
    @Query('projectId') projectId?: string,
    @Query('connectionId') connectionId?: string,
  ) {
    return this.enginesService.listDatabases(
      undefined,
      projectId,
      connectionId,
    );
  }

  @Get('engines/:engine/databases')
  async listDatabasesByEngine(
    @Param('engine') engine: string,
    @Query('projectId') projectId?: string,
    @Query('connectionId') connectionId?: string,
  ) {
    return this.enginesService.listDatabases(engine, projectId, connectionId);
  }

  @Get('databases/:name/info')
  async getDatabaseInfo(
    @Param('name') name: string,
    @Query('projectId') projectId?: string,
    @Query('connectionId') connectionId?: string,
  ) {
    const result = await this.enginesService.getDatabaseInfo(
      name,
      undefined,
      projectId,
      connectionId,
    );
    if (!result) throw new NotFoundException('No active database engine found');
    return result;
  }

  @Get('engines/:engine/databases/:name/info')
  async getDatabaseInfoByEngine(
    @Param('engine') engine: string,
    @Param('name') name: string,
    @Query('projectId') projectId?: string,
    @Query('connectionId') connectionId?: string,
  ) {
    const result = await this.enginesService.getDatabaseInfo(
      name,
      engine,
      projectId,
      connectionId,
    );
    if (!result) throw new NotFoundException('No active database engine found');
    return result;
  }
}
