import { Global, Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { SnapshotProcessor } from './processors/snapshot.processor';
import { ImportProcessor } from './processors/import.processor';
import { ScenarioProcessor } from './processors/scenario.processor';
import { QUEUE_NAMES } from './queue.constants';
import { DatabasesModule } from '../databases/databases.module';
import { ImportModule } from '../import/import.module';
import { ScenariosModule } from '../scenarios/scenarios.module';

@Global()
@Module({
  imports: [
    DatabasesModule,
    ImportModule,
    ScenariosModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: parseInt(config.get<string>('REDIS_PORT') ?? '6379', 10),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          db: parseInt(config.get<string>('REDIS_DB') ?? '0', 10),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.SNAPSHOTS },
      { name: QUEUE_NAMES.IMPORTS },
      { name: QUEUE_NAMES.SCENARIOS },
      { name: QUEUE_NAMES.RECORDING },
      { name: QUEUE_NAMES.PERFORMANCE },
      { name: QUEUE_NAMES.INTELLIGENCE },
      { name: QUEUE_NAMES.CHAOS },
      { name: QUEUE_NAMES.BACKUPS },
    ),
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    SnapshotProcessor,
    ImportProcessor,
    ScenarioProcessor,
  ],
  exports: [JobsService, BullModule],
})
export class JobsModule implements OnModuleInit {
  constructor(
    private readonly jobsService: JobsService,
    @InjectQueue(QUEUE_NAMES.SNAPSHOTS)
    private readonly snapshotsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.IMPORTS)
    private readonly importsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SCENARIOS)
    private readonly scenariosQueue: Queue,
    @InjectQueue(QUEUE_NAMES.RECORDING)
    private readonly recordingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PERFORMANCE)
    private readonly performanceQueue: Queue,
    @InjectQueue(QUEUE_NAMES.INTELLIGENCE)
    private readonly intelligenceQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CHAOS)
    private readonly chaosQueue: Queue,
    @InjectQueue(QUEUE_NAMES.BACKUPS)
    private readonly backupsQueue: Queue,
  ) {}

  onModuleInit(): void {
    this.jobsService.registerQueue(QUEUE_NAMES.SNAPSHOTS, this.snapshotsQueue);
    this.jobsService.registerQueue(QUEUE_NAMES.IMPORTS, this.importsQueue);
    this.jobsService.registerQueue(QUEUE_NAMES.SCENARIOS, this.scenariosQueue);
    this.jobsService.registerQueue(QUEUE_NAMES.RECORDING, this.recordingQueue);
    this.jobsService.registerQueue(
      QUEUE_NAMES.PERFORMANCE,
      this.performanceQueue,
    );
    this.jobsService.registerQueue(
      QUEUE_NAMES.INTELLIGENCE,
      this.intelligenceQueue,
    );
    this.jobsService.registerQueue(QUEUE_NAMES.CHAOS, this.chaosQueue);
    this.jobsService.registerQueue(QUEUE_NAMES.BACKUPS, this.backupsQueue);
  }
}
