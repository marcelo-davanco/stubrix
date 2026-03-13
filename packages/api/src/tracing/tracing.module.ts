import { Module } from '@nestjs/common';
import { TracingController } from './tracing.controller';
import { TracingService } from './tracing.service';

@Module({
  controllers: [TracingController],
  providers: [TracingService],
  exports: [TracingService],
})
export class TracingModule {}
