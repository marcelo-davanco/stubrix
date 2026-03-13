import { Module } from '@nestjs/common';
import { ChaosController } from './chaos.controller';
import { ChaosService } from './chaos.service';

@Module({
  controllers: [ChaosController],
  providers: [ChaosService],
  exports: [ChaosService],
})
export class ChaosModule {}
