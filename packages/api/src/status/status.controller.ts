import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StatusService } from './status.service';

@ApiTags('status')
@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  @ApiOperation({ summary: 'Get system status', description: 'Retrieve overall system status and health information' })
  @ApiResponse({ status: 200, description: 'System status retrieved successfully' })
  getStatus() {
    return this.statusService.getStatus();
  }
}
