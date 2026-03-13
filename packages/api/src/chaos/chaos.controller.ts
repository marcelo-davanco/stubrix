import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { ChaosService } from './chaos.service';
import type { FaultProfile, FaultRule, ChaosPreset } from './chaos.types';

export class FaultRuleDto {
  @IsString()
  type: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  probability: number;

  @IsOptional()
  @IsNumber()
  delayMs?: number;

  @IsOptional()
  @IsNumber()
  errorStatus?: number;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class CreateProfileDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  urlPattern?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  methods?: string[];

  @IsArray()
  faults: FaultRuleDto[];
}

export class ApplyPresetDto {
  @IsString()
  preset: string;

  @IsOptional()
  @IsString()
  urlPattern?: string;
}

export class ToggleDto {
  @IsBoolean()
  enabled: boolean;
}

@ApiTags('chaos')
@Controller('chaos')
export class ChaosController {
  constructor(private readonly service: ChaosService) {}

  @Get('profiles')
  @ApiOperation({ summary: 'List all chaos fault profiles' })
  list(): FaultProfile[] {
    return this.service.listProfiles();
  }

  @Post('profiles')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a chaos fault profile' })
  create(@Body() dto: CreateProfileDto): FaultProfile {
    return this.service.createProfile(
      dto.name,
      dto.faults as FaultRule[],
      dto.description,
      dto.urlPattern,
      dto.methods,
    );
  }

  @Patch('profiles/:id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable or disable a chaos profile' })
  @ApiParam({ name: 'id', description: 'Profile UUID' })
  toggle(@Param('id') id: string, @Body() dto: ToggleDto): FaultProfile {
    return this.service.toggleProfile(id, dto.enabled);
  }

  @Delete('profiles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a chaos fault profile' })
  @ApiParam({ name: 'id', description: 'Profile UUID' })
  delete(@Param('id') id: string): void {
    this.service.deleteProfile(id);
  }

  @Get('presets')
  @ApiOperation({ summary: 'List built-in chaos presets' })
  presets(): ChaosPreset[] {
    return this.service.listPresets();
  }

  @Post('presets/apply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply a built-in chaos preset as a new profile' })
  applyPreset(@Body() dto: ApplyPresetDto): FaultProfile {
    return this.service.applyPreset(dto.preset, dto.urlPattern);
  }

  @Get('evaluate')
  @ApiOperation({ summary: 'Evaluate active chaos profiles for a given URL + method' })
  evaluate(
    @Body('urlPath') urlPath: string,
    @Body('method') method: string,
  ) {
    return this.service.evaluate(urlPath ?? '/', method ?? 'GET');
  }
}
