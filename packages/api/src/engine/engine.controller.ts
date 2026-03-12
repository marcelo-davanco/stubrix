import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EngineService } from './engine.service';

@ApiTags('engine')
@Controller('engine')
export class EngineController {
  constructor(private readonly engineService: EngineService) {}

  @Get()
  @ApiOperation({ summary: 'Get mock engine status', description: 'Retrieve current mock engine information and status' })
  @ApiResponse({ status: 200, description: 'Engine status retrieved successfully' })
  getEngine() {
    return this.engineService.getEngine();
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset mock mappings', description: 'Reset all mock mappings in the engine' })
  @ApiResponse({ status: 200, description: 'Mock mappings reset successfully' })
  resetMappings() {
    return this.engineService.resetMappings();
  }
}
