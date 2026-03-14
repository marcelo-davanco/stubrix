import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { UniversalImportController } from './universal-import.controller';
import { UniversalImportService } from './universal-import.service';
import { WireMockClientService } from '../common/wiremock-client.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    ProjectsModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [ImportController, UniversalImportController],
  providers: [ImportService, UniversalImportService, WireMockClientService],
  exports: [ImportService, UniversalImportService],
})
export class ImportModule {}
