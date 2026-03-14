import { Module } from '@nestjs/common';
import { StatefulMocksController } from './stateful-mocks.controller';
import { StatefulMocksService } from './stateful-mocks.service';
import { StateResolverService } from './state-resolver.service';
import { TemplateEngineService } from './template-engine.service';
import { WireMockTransformerProxyService } from './wiremock-transformer-proxy.service';
import { DatabasesModule } from '../databases/databases.module';

@Module({
  imports: [DatabasesModule],
  controllers: [StatefulMocksController],
  providers: [
    StatefulMocksService,
    StateResolverService,
    TemplateEngineService,
    WireMockTransformerProxyService,
  ],
  exports: [StatefulMocksService, WireMockTransformerProxyService],
})
export class StatefulMocksModule {}
