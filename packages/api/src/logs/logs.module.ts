import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { LogsGateway } from './logs.gateway';

@Module({
  controllers: [LogsController],
  providers: [LogsService, LogsGateway],
})
export class LogsModule {}
