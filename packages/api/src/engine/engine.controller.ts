import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { EngineService } from './engine.service';

@Controller('engine')
export class EngineController {
  constructor(private readonly engineService: EngineService) {}

  @Get()
  getEngine() {
    return this.engineService.getEngine();
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  resetMappings() {
    return this.engineService.resetMappings();
  }
}
