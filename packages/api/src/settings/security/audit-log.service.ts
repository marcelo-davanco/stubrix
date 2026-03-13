import { Injectable } from '@nestjs/common';
import { ConfigDatabaseService } from '../database/config-database.service';
import type { HistoryEntry, ServiceRow } from '@stubrix/shared';

export interface AuditLogOptions {
  limit?: number;
  offset?: number;
  serviceId?: string;
  action?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface AuditLogEntry {
  id: number;
  serviceId: string;
  serviceName: string;
  key: string;
  oldValue?: string;
  newValue?: string;
  action: string;
  source: string;
  createdAt: string;
  relativeTime: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
  filters: AuditLogOptions;
}

export interface AuditStats {
  totalEntries: number;
  entriesLast24h: number;
  entriesLast7d: number;
  mostActiveService: { serviceId: string; count: number };
  actionBreakdown: Record<string, number>;
  sourceBreakdown: Record<string, number>;
}

const SENSITIVE_KEYWORDS = [
  'password',
  'secret',
  'token',
  'key',
  'credential',
  'auth',
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYWORDS.some((kw) => lower.includes(kw));
}

function maskValue(key: string, value: string | undefined): string | undefined {
  if (!value) return value;
  return isSensitiveKey(key) ? '•••' : value;
}

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly configDb: ConfigDatabaseService) {}

  private getAllHistory(): HistoryEntry[] {
    return this.configDb.getFullHistory(10_000, 0);
  }

  getAuditLog(options: AuditLogOptions = {}): AuditLogResponse {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    let filtered = this.getAllHistory();

    if (options.serviceId) {
      filtered = filtered.filter((e) => e.service_id === options.serviceId);
    }
    if (options.action) {
      filtered = filtered.filter((e) => e.action === options.action);
    }
    if (options.source) {
      filtered = filtered.filter((e) => e.source === options.source);
    }
    if (options.dateFrom) {
      const from = new Date(options.dateFrom).getTime();
      filtered = filtered.filter(
        (e) => new Date(e.created_at as string).getTime() >= from,
      );
    }
    if (options.dateTo) {
      const to = new Date(options.dateTo).getTime();
      filtered = filtered.filter(
        (e) => new Date(e.created_at as string).getTime() <= to,
      );
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter((e) => e.key.toLowerCase().includes(q));
    }

    const total = filtered.length;
    const page = filtered.slice(offset, offset + limit);

    const services = this.configDb.getAllServices();
    const serviceNameMap = new Map<string, string>(
      services.map((s: ServiceRow) => [s.id, s.name]),
    );

    const entries: AuditLogEntry[] = page.map((e) => ({
      id: e.id as number,
      serviceId: e.service_id,
      serviceName: serviceNameMap.get(e.service_id) ?? e.service_id,
      key: e.key,
      oldValue: maskValue(e.key, e.old_value ?? undefined),
      newValue: maskValue(e.key, e.new_value ?? undefined),
      action: e.action,
      source: e.source ?? 'manual',
      createdAt: e.created_at as string,
      relativeTime: relativeTime(e.created_at as string),
    }));

    return { entries, total, limit, offset, filters: options };
  }

  getServiceAuditLog(
    serviceId: string,
    options: AuditLogOptions = {},
  ): AuditLogResponse {
    return this.getAuditLog({ ...options, serviceId });
  }

  getAuditStats(): AuditStats {
    const all = this.getAllHistory();

    const now = Date.now();
    const ms24h = 24 * 60 * 60 * 1000;
    const ms7d = 7 * ms24h;

    const entriesLast24h = all.filter(
      (e) => now - new Date(e.created_at as string).getTime() < ms24h,
    ).length;

    const entriesLast7d = all.filter(
      (e) => now - new Date(e.created_at as string).getTime() < ms7d,
    ).length;

    const serviceCount = new Map<string, number>();
    const actionBreakdown: Record<string, number> = {};
    const sourceBreakdown: Record<string, number> = {};

    for (const e of all) {
      serviceCount.set(e.service_id, (serviceCount.get(e.service_id) ?? 0) + 1);
      actionBreakdown[e.action] = (actionBreakdown[e.action] ?? 0) + 1;
      const src = e.source ?? 'manual';
      sourceBreakdown[src] = (sourceBreakdown[src] ?? 0) + 1;
    }

    let mostActiveService = { serviceId: '', count: 0 };
    for (const [serviceId, count] of serviceCount) {
      if (count > mostActiveService.count) {
        mostActiveService = { serviceId, count };
      }
    }

    return {
      totalEntries: all.length,
      entriesLast24h,
      entriesLast7d,
      mostActiveService,
      actionBreakdown,
      sourceBreakdown,
    };
  }
}
