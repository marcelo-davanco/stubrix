import { Controller, Get, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { LogsService } from './logs.service';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  getLogs(@Query('limit') limit?: string) {
    return this.logsService.getLogs(limit ? parseInt(limit, 10) : 50);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  clearLogs() {
    return this.logsService.clearLogs();
  }
}
