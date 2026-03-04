import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { WireMockClientService } from './wiremock-client.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    HttpModule,
  ],
  providers: [WireMockClientService],
  exports: [WireMockClientService, HttpModule],
})
export class CommonModule {}
