import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { LogsService } from './logs.service';

@WebSocketGateway({ namespace: '/ws/logs', cors: { origin: '*' } })
export class LogsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private interval: NodeJS.Timeout | null = null;
  private lastTimestamp: string | null = null;

  constructor(private readonly logsService: LogsService) {}

  handleConnection() {
    if (!this.interval) {
      this.interval = setInterval(() => void this.poll(), 2000);
    }
  }

  handleDisconnect() {
    if (this.server?.sockets?.sockets?.size === 0 && this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.lastTimestamp = null;
    }
  }

  private async poll(): Promise<void> {
    try {
      const logs = await this.logsService.getLogs(100);
      if (logs.requests.length === 0) {
        this.lastTimestamp = null;
        return;
      }

      const latestTimestamp = logs.requests[0]?.timestamp ?? null;
      if (latestTimestamp === this.lastTimestamp) return;

      const newEntries = this.lastTimestamp
        ? logs.requests.filter((r) => r.timestamp > this.lastTimestamp!)
        : logs.requests;

      this.lastTimestamp = latestTimestamp;

      if (newEntries.length > 0) {
        this.server.emit('logs', newEntries);
      }
    } catch {
      // ignore
    }
  }
}
