import { Injectable } from '@nestjs/common';
import { PostgresDriver } from './postgres.driver';
import { MysqlDriver } from './mysql.driver';
import { SqliteDriver } from './sqlite.driver';
import type { DatabaseDriverInterface } from './database-driver.interface';

@Injectable()
export class DriverRegistryService {
  private readonly drivers: DatabaseDriverInterface[];

  constructor(
    private readonly postgres: PostgresDriver,
    private readonly mysql: MysqlDriver,
    private readonly sqlite: SqliteDriver,
  ) {
    this.drivers = [this.postgres, this.mysql, this.sqlite];
  }

  getAll(): DatabaseDriverInterface[] {
    return this.drivers;
  }

  get(engine: string): DatabaseDriverInterface | undefined {
    return this.drivers.find((d) => d.engine === engine);
  }

  async getActive(): Promise<DatabaseDriverInterface[]> {
    const active: DatabaseDriverInterface[] = [];
    for (const driver of this.drivers) {
      if (!driver.isConfigured()) continue;
      try {
        const healthy = await driver.healthCheck();
        if (healthy) active.push(driver);
      } catch {
        // skip unhealthy
      }
    }
    return active;
  }

  async getPrimary(): Promise<DatabaseDriverInterface | null> {
    const active = await this.getActive();
    return active[0] ?? null;
  }
}
