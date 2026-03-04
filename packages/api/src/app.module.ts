import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CommonModule } from './common/common.module';
import { ProjectsModule } from './projects/projects.module';
import { StatusModule } from './status/status.module';
import { MocksModule } from './mocks/mocks.module';
import { RecordingModule } from './recording/recording.module';
import { LogsModule } from './logs/logs.module';
import { EngineModule } from './engine/engine.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/(.*)'],
    }),
    CommonModule,
    ProjectsModule,
    StatusModule,
    MocksModule,
    RecordingModule,
    LogsModule,
    EngineModule,
  ],
})
export class AppModule {}
