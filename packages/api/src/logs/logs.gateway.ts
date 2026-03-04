import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LogsService } from './logs.service';

@WebSocketGateway({ namespace: '/ws/logs', cors: { origin: '*' } })
export class LogsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private interval: NodeJS.Timeout | null = null;
  private lastCount = 0;

  constructor(private readonly logsService: LogsService) {}

  handleConnection(_client: Socket) {
    if (!this.interval) {
      this.interval = setInterval(() => void this.poll(), 2000);
    }
  }

  handleDisconnect(_client: Socket) {
    if (this.server.sockets.sockets.size === 0 && this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async poll(): Promise<void> {
    try {
      const logs = await this.logsService.getLogs(100);
      if (logs.total !== this.lastCount) {
        const newEntries = logs.requests.slice(0, logs.total - this.lastCount);
        this.lastCount = logs.total;
        if (newEntries.length > 0) {
          this.server.emit('logs', newEntries);
        }
      }
    } catch {
      // ignore
    }
  }
}
