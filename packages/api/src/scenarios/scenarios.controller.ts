import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { ScenariosService } from './scenarios.service';
import { JobsService } from '../jobs/jobs.service';
import { QUEUE_NAMES } from '../jobs/queue.constants';
import type {
  ScenarioBundle,
  ScenarioMeta,
  ScenarioDiff,
  ScenarioConfig,
} from './scenario.types';
import type { JobAcceptedResponse } from '@stubrix/shared';

export class CaptureScenarioDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  config?: ScenarioConfig;
}

@ApiTags('scenarios')
@Controller('scenarios')
export class ScenariosController {
  constructor(
    private readonly service: ScenariosService,
    private readonly jobsService: JobsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all captured scenarios' })
  list(): ScenarioMeta[] {
    return this.service.listScenarios();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a scenario bundle by ID' })
  @ApiParam({ name: 'id', description: 'Scenario UUID' })
  get(@Param('id') id: string): ScenarioBundle {
    return this.service.getScenario(id);
  }

  @Post('capture')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Capture current environment state as a scenario' })
  capture(@Body() dto: CaptureScenarioDto): ScenarioBundle {
    return this.service.capture(
      dto.name,
      dto.description,
      dto.tags,
      dto.config,
    );
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore environment from a scenario' })
  @ApiParam({ name: 'id', description: 'Scenario UUID' })
  restore(@Param('id') id: string): { restored: number; name: string } {
    return this.service.restore(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a scenario' })
  @ApiParam({ name: 'id', description: 'Scenario UUID' })
  delete(@Param('id') id: string): void {
    this.service.deleteScenario(id);
  }

  @Get(':idA/diff/:idB')
  @ApiOperation({ summary: 'Compare two scenarios and show differences' })
  @ApiParam({ name: 'idA', description: 'First scenario UUID' })
  @ApiParam({ name: 'idB', description: 'Second scenario UUID' })
  diff(@Param('idA') idA: string, @Param('idB') idB: string): ScenarioDiff {
    return this.service.diff(idA, idB);
  }

  @Post('capture/async')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Capture scenario asynchronously via job queue' })
  @ApiResponse({ status: 202, description: 'Capture job accepted' })
  async captureAsync(
    @Body() dto: CaptureScenarioDto,
  ): Promise<JobAcceptedResponse> {
    return this.jobsService.enqueue({
      type: 'scenario:capture',
      queueName: QUEUE_NAMES.SCENARIOS,
      payload: {
        name: dto.name,
        description: dto.description,
        tags: dto.tags,
        config: dto.config,
      },
      priority: 'normal',
    });
  }

  @Post(':id/restore/async')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Restore scenario asynchronously via job queue' })
  @ApiParam({ name: 'id', description: 'Scenario UUID' })
  @ApiResponse({ status: 202, description: 'Restore job accepted' })
  async restoreAsync(@Param('id') id: string): Promise<JobAcceptedResponse> {
    return this.jobsService.enqueue({
      type: 'scenario:restore',
      queueName: QUEUE_NAMES.SCENARIOS,
      payload: { scenarioId: id },
      priority: 'high',
    });
  }
}
