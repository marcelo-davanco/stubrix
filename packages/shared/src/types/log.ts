export interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  status: number;
  responseTime: number;
  matched: boolean;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
}

export interface LogsResponse {
  total: number;
  returned: number;
  requests: LogEntry[];
}
