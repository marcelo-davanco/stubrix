import { Injectable } from '@nestjs/common';
import { ConfigDatabaseService } from '../database/config-database.service';
import type { HistoryEntry } from '@stubrix/shared';

export interface ConfigVersion {
  timestamp: string;
  changeCount: number;
  source: string;
  summary: string;
}

export interface RollbackResult {
  serviceId: string;
  timestamp: string;
  keysRestored: number;
  keys: string[];
}

@Injectable()
export class ConfigVersioningService {
  constructor(private readonly configDb: ConfigDatabaseService) {}

  getVersions(serviceId: string): ConfigVersion[] {
    const history = this.configDb.getHistory(serviceId, 500);

    const byTimestamp = new Map<string, HistoryEntry[]>();
    for (const entry of history) {
      const ts = (entry.created_at as string).substring(0, 16);
      if (!byTimestamp.has(ts)) byTimestamp.set(ts, []);
      byTimestamp.get(ts)!.push(entry);
    }

    return Array.from(byTimestamp.entries()).map(([, entries]) => {
      const keys = [...new Set(entries.map((e) => e.key))];
      const summaryKeys = keys.slice(0, 3).join(', ');
      const summary =
        keys.length > 3
          ? `Updated ${summaryKeys} (+${keys.length - 3} more)`
          : `Updated ${summaryKeys}`;

      return {
        timestamp: entries[0].created_at as string,
        changeCount: entries.length,
        source: entries[0].source ?? 'manual',
        summary,
      };
    });
  }

  getConfigAtTimestamp(
    serviceId: string,
    timestamp: string,
  ): Record<string, string> {
    const history = this.configDb.getHistory(serviceId, 10_000);
    const targetMs = new Date(timestamp).getTime();

    const keyToValue = new Map<string, string>();

    const older = history
      .filter((e) => new Date(e.created_at as string).getTime() <= targetMs)
      .sort(
        (a, b) =>
          new Date(a.created_at as string).getTime() -
          new Date(b.created_at as string).getTime(),
      );

    for (const entry of older) {
      if (entry.action === 'DELETE') {
        keyToValue.delete(entry.key);
      } else if (entry.new_value != null) {
        keyToValue.set(entry.key, entry.new_value);
      }
    }

    return Object.fromEntries(keyToValue);
  }

  rollbackToVersion(serviceId: string, timestamp: string): RollbackResult {
    const snapshot = this.getConfigAtTimestamp(serviceId, timestamp);
    const keys = Object.keys(snapshot);
    const currentConfigs = this.configDb.getServiceConfigs(serviceId);

    for (const cfg of currentConfigs) {
      const snapshotValue = snapshot[cfg.key];
      if (snapshotValue !== undefined && snapshotValue !== cfg.value) {
        this.configDb.setConfig(serviceId, cfg.key, snapshotValue, {
          is_sensitive: cfg.is_sensitive,
          description: cfg.description ?? undefined,
          data_type: cfg.data_type ?? undefined,
        });
        this.configDb.addHistory({
          service_id: serviceId,
          key: cfg.key,
          old_value: cfg.value,
          new_value: snapshotValue,
          action: 'ROLLBACK',
          source: 'versioning',
        });
      }
    }

    return {
      serviceId,
      timestamp,
      keysRestored: keys.length,
      keys,
    };
  }
}
