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
import { IsString, IsOptional } from 'class-validator';
import { ChaosNetworkService } from './chaos-network.service';
import type { ToxiProxy, Toxic } from './chaos-network.service';

export class CreateProxyDto {
  @IsString()
  name: string;

  @IsString()
  listen: string;

  @IsString()
  upstream: string;
}

export class AddToxicDto {
  @IsString()
  type: string;

  @IsString()
  stream: 'upstream' | 'downstream';

  @IsOptional()
  @IsString()
  name?: string;

  toxicity?: number;
  attributes?: Record<string, unknown>;
}

export class ApplyPresetDto {
  @IsString()
  preset: string;
}

@ApiTags('chaos-network')
@Controller('api/chaos-network')
export class ChaosNetworkController {
  constructor(private readonly service: ChaosNetworkService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check Toxiproxy availability' })
  health() {
    return this.service.healthCheck();
  }

  @Get('proxies')
  @ApiOperation({ summary: 'List all Toxiproxy proxies' })
  list(): Promise<ToxiProxy[]> {
    return this.service.listProxies();
  }

  @Post('proxies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Toxiproxy proxy' })
  create(@Body() dto: CreateProxyDto): Promise<ToxiProxy> {
    return this.service.createProxy(dto.name, dto.listen, dto.upstream);
  }

  @Delete('proxies/:name')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a Toxiproxy proxy' })
  @ApiParam({ name: 'name', description: 'Proxy name' })
  deleteProxy(@Param('name') name: string): Promise<void> {
    return this.service.deleteProxy(name);
  }

  @Post('proxies/:name/toxics')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a toxic to a proxy' })
  @ApiParam({ name: 'name', description: 'Proxy name' })
  addToxic(@Param('name') name: string, @Body() dto: AddToxicDto): Promise<Toxic> {
    return this.service.addToxic(name, {
      type: dto.type,
      stream: dto.stream,
      name: dto.name,
      toxicity: dto.toxicity ?? 1.0,
      attributes: dto.attributes ?? {},
    });
  }

  @Delete('proxies/:name/toxics/:toxicName')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a toxic from a proxy' })
  removeToxic(
    @Param('name') name: string,
    @Param('toxicName') toxicName: string,
  ): Promise<void> {
    return this.service.removeToxic(name, toxicName);
  }

  @Get('presets')
  @ApiOperation({ summary: 'List network chaos presets' })
  presets() {
    return this.service.listPresets();
  }

  @Post('proxies/:name/presets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a network chaos preset to a proxy' })
  @ApiParam({ name: 'name', description: 'Proxy name' })
  applyPreset(@Param('name') name: string, @Body() dto: ApplyPresetDto): Promise<Toxic[]> {
    return this.service.applyPreset(name, dto.preset);
  }
}
