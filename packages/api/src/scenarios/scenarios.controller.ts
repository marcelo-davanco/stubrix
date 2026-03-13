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
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { ScenariosService } from './scenarios.service';
import type { ScenarioBundle, ScenarioMeta, ScenarioDiff, ScenarioConfig } from './scenario.types';

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
  constructor(private readonly service: ScenariosService) {}

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
    return this.service.capture(dto.name, dto.description, dto.tags, dto.config);
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
}
