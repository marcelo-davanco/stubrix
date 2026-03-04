import { Injectable } from '@nestjs/common';
import { WireMockClientService } from '../common/wiremock-client.service';
import { LogEntry, LogsResponse } from '@stubrix/shared';

interface WireMockRequest {
  loggedDate?: string;
  request?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: string;
  };
  response?: {
    status?: number;
    body?: string;
  };
  responseTime?: number;
  wasMatched?: boolean;
}

@Injectable()
export class LogsService {
  constructor(private readonly wireMock: WireMockClientService) {}

  async getLogs(limit = 50): Promise<LogsResponse> {
    try {
      const result = await this.wireMock.get<{ requests: WireMockRequest[] }>(
        `/requests?limit=${limit}`,
      );

      const requests: LogEntry[] = (result.requests ?? []).map((r) => ({
        timestamp: r.loggedDate ?? new Date().toISOString(),
        method: r.request?.method ?? 'UNKNOWN',
        url: r.request?.url ?? '/',
        status: r.response?.status ?? 0,
        responseTime: r.responseTime ?? 0,
        matched: r.wasMatched ?? false,
        requestHeaders: r.request?.headers,
        requestBody: r.request?.body,
        responseBody: r.response?.body,
      }));

      return { total: requests.length, returned: requests.length, requests };
    } catch {
      return { total: 0, returned: 0, requests: [] };
    }
  }

  async clearLogs(): Promise<void> {
    await this.wireMock.delete('/requests');
  }
}
