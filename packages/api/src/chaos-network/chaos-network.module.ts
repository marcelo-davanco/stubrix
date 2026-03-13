import { Module } from '@nestjs/common';
import { ChaosNetworkController } from './chaos-network.controller';
import { ChaosNetworkService } from './chaos-network.service';

@Module({
  controllers: [ChaosNetworkController],
  providers: [ChaosNetworkService],
  exports: [ChaosNetworkService],
})
export class ChaosNetworkModule {}
