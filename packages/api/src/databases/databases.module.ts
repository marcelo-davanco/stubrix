import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { PostgresDriver } from './drivers/postgres.driver';
import { MysqlDriver } from './drivers/mysql.driver';
import { SqliteDriver } from './drivers/sqlite.driver';
import { MongodbDriver } from './drivers/mongodb.driver';
import { DriverRegistryService } from './drivers/driver-registry.service';
import { DbEnginesService } from './db-engines.service';
import { DbSnapshotsService } from './db-snapshots.service';
import { DbEnginesController } from './db-engines.controller';
import { DbSnapshotsController } from './db-snapshots.controller';
import { ProjectDatabaseConfigController } from './project-database-config.controller';
import { ProjectDatabaseConfigService } from './project-database-config.service';
import { ProjectDatabaseContextService } from './project-database-context.service';

@Module({
  imports: [ProjectsModule],
  controllers: [
    DbEnginesController,
    DbSnapshotsController,
    ProjectDatabaseConfigController,
  ],
  providers: [
    PostgresDriver,
    MysqlDriver,
    SqliteDriver,
    MongodbDriver,
    DriverRegistryService,
    DbEnginesService,
    DbSnapshotsService,
    ProjectDatabaseConfigService,
    ProjectDatabaseContextService,
  ],
  exports: [
    DriverRegistryService,
    DbEnginesService,
    DbSnapshotsService,
    ProjectDatabaseConfigService,
  ],
})
export class DatabasesModule {}
