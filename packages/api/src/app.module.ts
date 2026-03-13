import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CommonModule } from './common/common.module';
import { ProjectsModule } from './projects/projects.module';
import { StatusModule } from './status/status.module';
import { MocksModule } from './mocks/mocks.module';
import { RecordingModule } from './recording/recording.module';
import { LogsModule } from './logs/logs.module';
import { EngineModule } from './engine/engine.module';
import { DatabasesModule } from './databases/databases.module';
import { ImportModule } from './import/import.module';
import { StatefulMocksModule } from './stateful-mocks/stateful-mocks.module';

export function setupSwagger(app: any) {
  const config = new DocumentBuilder()
    .setTitle('Stubrix API')
    .setDescription('Professional mock server platform control plane')
    .setVersion('1.0.0')
    .addTag('projects', 'Project management')
    .addTag('mocks', 'Mock server management')
    .addTag('recording', 'Traffic recording')
    .addTag('import', 'Import HAR/Postman collections')
    .addTag('databases', 'Database snapshots')
    .addTag('engine', 'Mock engine control')
    .addTag('logs', 'Real-time logs')
    .addTag('stateful-mocks', 'Stateful mocking with DB sync')
    .addTag('status', 'System status')
    .addServer('http://localhost:9090', 'Development server')
    .addServer('https://api.stubrix.com', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'none',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
    customSiteTitle: 'Stubrix API Documentation',
    customCss: `
      .topbar-wrapper img { content: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzM2NkZGNiIvPgo8cGF0aCBkPSJNMTAgMjBMMjAgMTBMMzAgMjBMMjAgMzBMMTAgMjBaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'); }
      .swagger-ui .topbar { background-color: #366FF6; }
      .swagger-ui .topbar-wrapper .link { color: white; }
    `,
    customfavIcon: '/favicon.ico',
  });
}

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/{*any}'],
    }),
    CommonModule,
    ProjectsModule,
    StatusModule,
    MocksModule,
    RecordingModule,
    ImportModule,
    LogsModule,
    EngineModule,
    DatabasesModule,
    StatefulMocksModule,
  ],
})
export class AppModule {}
