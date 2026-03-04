import { io, Socket } from 'socket.io-client';
import type { LogEntry } from '@stubrix/shared';

let socket: Socket | null = null;

export function connectLogs(onLog: (entries: LogEntry[]) => void): () => void {
  socket = io('/ws/logs', { path: '/socket.io', transports: ['websocket'] });

  socket.on('logs', (entries: LogEntry[]) => {
    onLog(entries);
  });

  return () => {
    socket?.disconnect();
    socket = null;
  };
}
