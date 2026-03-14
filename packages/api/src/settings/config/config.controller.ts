import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SettingsConfigService } from './config.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { ResetConfigDto } from './dto/reset-config.dto';

@ApiTags('settings')
@Controller('settings/services')
export class SettingsConfigController {
  constructor(private readonly configService: SettingsConfigService) {}

  @Get(':id/config')
  @ApiOperation({ summary: 'Get service configuration' })
  @ApiQuery({ name: 'effective', type: Boolean, required: false })
  getConfig(@Param('id') id: string, @Query('effective') effective?: string) {
    if (effective === 'true' || effective === '1') {
      return this.configService.getEffectiveConfig(id);
    }
    return this.configService.getServiceConfig(id);
  }

  @Put(':id/config')
  @ApiOperation({ summary: 'Update service configuration' })
  updateConfig(@Param('id') id: string, @Body() dto: UpdateConfigDto) {
    return this.configService.updateConfig(id, dto.configs);
  }

  @Post(':id/config/reset')
  @ApiOperation({ summary: 'Reset configuration to defaults' })
  resetConfig(@Param('id') id: string, @Body() dto: ResetConfigDto) {
    return this.configService.resetConfig(id, dto.keys);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get config change history' })
  getHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.configService.getConfigHistory(id, limitNum, offsetNum);
  }

  @Post(':id/history/:historyId/rollback')
  @ApiOperation({ summary: 'Rollback to a previous config state' })
  rollbackConfig(
    @Param('id') id: string,
    @Param('historyId', ParseIntPipe) historyId: number,
  ) {
    return this.configService.rollbackConfig(id, historyId);
  }
}
