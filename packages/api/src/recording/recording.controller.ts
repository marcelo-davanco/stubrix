import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RecordingService } from './recording.service';
import { StartRecordingDto } from './dto/start-recording.dto';

@Controller('projects/:projectId/recording')
export class RecordingController {
  constructor(private readonly recordingService: RecordingService) {}

  @Get('status')
  getStatus(@Param('projectId') projectId: string) {
    return this.recordingService.getStatus(projectId);
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  start(@Param('projectId') projectId: string, @Body() dto: StartRecordingDto) {
    return this.recordingService.start(projectId, dto);
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  stop(@Param('projectId') projectId: string) {
    return this.recordingService.stop(projectId);
  }

  @Post('snapshot')
  @HttpCode(HttpStatus.OK)
  snapshot(@Param('projectId') projectId: string) {
    return this.recordingService.snapshot(projectId);
  }
}
